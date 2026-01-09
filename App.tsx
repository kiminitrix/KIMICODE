
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Menu, X, Image as ImageIcon, Wand2, Edit, PlaySquare, 
  Download, Save, Maximize2, XCircle, ChevronDown, Plus, 
  Trash2, Loader2, Sparkles, Layers, Video, Film,
  Crop, Sliders, Check, RotateCcw, Moon, Sun, AlertCircle,
  ChevronsUp, FileText, Copy, Music, File as FileIcon, FileType,
  Cloud, CloudLightning, LogOut, Calendar, Smartphone, Monitor,
  Type
} from 'lucide-react';
import { 
  GeneratedImage, AppRoute, ImageModel, AspectRatio,
  ImaginableState, EditableState, PromptableState,
  Any2TextState, TextExtractionResult
} from './types';
import * as GeminiService from './services/geminiService';
import * as CloudStorageService from './services/cloudStorageService';

// --- UI Components ---

const Button = ({ 
  onClick, children, variant = 'primary', className = '', disabled = false, icon: Icon, title 
}: any) => {
  const baseStyle = "flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-black text-white hover:bg-zinc-800 shadow-lg hover:shadow-xl dark:bg-gold-500 dark:text-black dark:hover:bg-gold-400",
    secondary: "bg-white text-black border-2 border-gray-100 hover:border-gold-400 hover:text-gold-600 shadow-sm dark:bg-transparent dark:text-silver-200 dark:border-zinc-700 dark:hover:border-gold-500 dark:hover:text-gold-400",
    gold: "bg-gold-500 text-white hover:bg-gold-600 shadow-lg hover:shadow-gold-400/50 dark:bg-gold-600 dark:hover:bg-gold-500",
    ghost: "text-gray-500 hover:text-black hover:bg-silver-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-zinc-800",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
      title={title}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-silver-200 dark:border-zinc-800 shadow-xl shadow-silver-200/50 dark:shadow-black/50 overflow-hidden transition-colors duration-300 ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, children }: any) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <button onClick={onClose} className="absolute top-6 right-6 text-white hover:text-gold-400 transition-colors z-50">
        <XCircle size={40} />
      </button>
      <div className="max-w-7xl w-full max-h-[90vh] overflow-auto relative flex items-center justify-center">
        {children}
      </div>
    </div>,
    document.body
  );
};

const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  isDestructive = false 
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-silver-200 dark:border-zinc-800 transform scale-100 transition-all">
        <h3 className="text-xl font-bold text-black dark:text-white mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button 
            onClick={onCancel}
            className="px-4 py-2 rounded-lg font-medium text-sm text-gray-600 dark:text-gray-300 hover:bg-silver-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-medium text-sm text-white shadow-lg transition-colors ${
              isDestructive 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' 
                : 'bg-gold-500 hover:bg-gold-600 shadow-gold-500/30'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- Main App Component ---

export default function App() {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(AppRoute.IMAGINABLE);
  const [collection, setCollection] = useState<GeneratedImage[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notificationTimeoutRef = useRef<number | null>(null);

  const [imaginableState, setImaginableState] = useState<ImaginableState>({
    prompt: '',
    model: ImageModel.GEMINI_FLASH_IMAGE,
    aspectRatio: AspectRatio.SQUARE,
    count: 1,
    refImages: [],
    generatedResults: []
  });

  const [editableState, setEditableState] = useState<EditableState>({
    baseImage: null,
    instruction: '',
    resultImage: null
  });

  const [promptableState, setPromptableState] = useState<PromptableState>({
    image: null,
    generatedPrompt: ''
  });

  const [any2TextState, setAny2TextState] = useState<Any2TextState>({
    results: []
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kimicode_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('kimicode_theme', theme);
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem('kimicode_collection');
    if (saved) {
      try {
        setCollection(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load collection", e);
      }
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const addToCollection = async (img: GeneratedImage) => {
    showNotification("Saving...");
    try {
      const syncedImage = await CloudStorageService.uploadImageToCloud(img);
      setCollection(prev => {
        const index = prev.findIndex(item => item.id === img.id);
        const updated = index >= 0 ? [...prev] : [syncedImage, ...prev];
        if (index >= 0) updated[index] = syncedImage;
        localStorage.setItem('kimicode_collection', JSON.stringify(updated));
        return updated;
      });
      showNotification("Saved to Collection");
    } catch (e) {
      showNotification("Save failed.");
    }
  };

  const removeFromCollection = (id: string) => {
    const updated = collection.filter(img => img.id !== id);
    setCollection(updated);
    localStorage.setItem('kimicode_collection', JSON.stringify(updated));
    showNotification("Deleted.");
  };

  const showNotification = (msg: string) => {
    if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    setNotification(msg);
    notificationTimeoutRef.current = window.setTimeout(() => {
      setNotification(null);
      notificationTimeoutRef.current = null;
    }, 3000);
  };

  const handleMobileNavClick = (route: AppRoute) => {
    setActiveRoute(route);
    setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeRoute) {
      case AppRoute.IMAGINABLE:
        return <ImaginablePage state={imaginableState} setState={setImaginableState} onSave={addToCollection} onError={showNotification} />;
      case AppRoute.EDITABLE:
        return <EditablePage state={editableState} setState={setEditableState} onSave={addToCollection} onError={showNotification} />;
      case AppRoute.PROMPTABLE:
        return <PromptablePage state={promptableState} setState={setPromptableState} onError={showNotification} />;
      case AppRoute.ANY2TEXT:
        return <Any2TextPage state={any2TextState} setState={setAny2TextState} onError={showNotification} />;
      case AppRoute.COLLECTION:
        return <CollectionPage collection={collection} onDelete={removeFromCollection} onError={showNotification} />;
      default:
        return null;
    }
  };

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 flex-shrink-0 bg-black dark:bg-gold-500 rounded-lg flex items-center justify-center text-white dark:text-black font-bold text-xl">K</div>
            <div className="text-2xl font-black tracking-tight text-black dark:text-white">
              KIMI<span className="text-gold-500 dark:text-gold-400">CODE</span>
            </div>
            {mobile && (
              <button onClick={() => setIsMobileMenuOpen(false)} className="ml-auto text-gray-500">
                <X size={24} />
              </button>
            )}
        </div>
        
        <nav className="space-y-1">
          {[
            { id: AppRoute.IMAGINABLE, icon: Sparkles, label: 'Imaginable' },
            { id: AppRoute.EDITABLE, icon: Edit, label: 'Editable' },
            { id: AppRoute.PROMPTABLE, icon: Wand2, label: 'Promptable' },
            { id: AppRoute.ANY2TEXT, icon: FileType, label: 'Any2Text' },
            { id: AppRoute.COLLECTION, icon: Layers, label: 'Collection' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => mobile ? handleMobileNavClick(item.id) : setActiveRoute(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                activeRoute === item.id
                  ? 'bg-black text-white dark:bg-gold-500 dark:text-black'
                  : 'text-gray-500 hover:bg-silver-100 hover:text-black dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-silver-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="bg-gradient-to-br from-silver-100 to-white dark:from-zinc-800 dark:to-zinc-900 p-4 rounded-xl border border-silver-200 dark:border-zinc-700 flex justify-between items-center transition-all">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-black dark:text-white">Connected</span>
            </div>
          </div>
          
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-white dark:bg-zinc-700 text-black dark:text-gold-500 shadow-md border border-silver-200 dark:border-zinc-600 hover:scale-110 active:scale-95 transition-all"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-silver-100 dark:bg-zinc-950 flex flex-col md:flex-row font-sans text-gray-800 dark:text-gray-200 transition-colors duration-300">
      
      <div className="md:hidden bg-white dark:bg-zinc-900 p-4 flex justify-between items-center shadow-md z-20 sticky top-0">
        <button onClick={() => setIsMobileMenuOpen(true)} className="text-black dark:text-white">
          <Menu size={28} />
        </button>
        <div className="text-xl font-black tracking-tight text-black dark:text-white">KIMICODE</div>
        <button onClick={toggleTheme} className="p-2 text-gray-500">
          {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
        </button>
      </div>

      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-zinc-900 border-r border-silver-200 dark:border-zinc-800 h-screen sticky top-0 z-30">
        <NavContent />
      </aside>

      <div className={`fixed inset-0 z-50 md:hidden transition-opacity ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
        <div className={`absolute top-0 left-0 h-full w-80 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col transform transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <NavContent mobile={true} />
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto">{renderContent()}</div>
      </main>

      {notification && (
        <div className="fixed bottom-6 right-6 bg-zinc-900/95 dark:bg-white/95 backdrop-blur text-white dark:text-zinc-900 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <Sparkles size={16} className="text-gold-500" />
          <span className="font-medium text-sm">{notification}</span>
        </div>
      )}
    </div>
  );
}

// 1. IMAGINABLE PAGE
const ImaginablePage = ({ state, setState, onSave, onError }: any) => {
  const { prompt, model, aspectRatio, count, generatedResults, refImages } = state;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [previewImage, setPreviewImage] = useState<any>(null);

  const updateState = (updates: any) => setState((prev: any) => ({ ...prev, ...updates }));

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const results = await GeminiService.generateImage(model, prompt, aspectRatio, refImages, count);
      const newImages = results.map(url => ({
        id: Date.now().toString() + Math.random().toString(),
        url, prompt, model, date: Date.now(), aspectRatio
      }));
      updateState({ generatedResults: [...newImages, ...generatedResults] });
    } catch (error: any) {
      onError("Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnhance = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    try {
      const enhanced = await GeminiService.enhancePrompt(prompt);
      updateState({ prompt: enhanced });
      onError("Prompt enhanced!");
    } catch (error) {
      onError("Enhancement failed.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleRefImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      updateState({ refImages: [...refImages, ...Array.from(e.target.files)] });
    }
  };

  const removeRefImage = (index: number) => {
    const updated = [...refImages];
    updated.splice(index, 1);
    updateState({ refImages: updated });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-4xl font-bold mb-2 text-black dark:text-white">Imaginable</h1>
        <p className="text-gray-500 dark:text-gray-400">Transform your ideas into visual reality using state-of-the-art AI.</p>
      </header>
      
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 space-y-6">
            {/* Prompt Section */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Prompt</label>
              <div className="relative">
                <textarea 
                  value={prompt}
                  onChange={(e) => updateState({ prompt: e.target.value })}
                  className="w-full p-4 bg-silver-100 dark:bg-zinc-800 rounded-xl min-h-[160px] outline-none text-sm dark:text-white dark:placeholder-gray-500 transition-colors resize-none border-2 border-transparent focus:border-gold-400"
                  placeholder="A futuristic city with silver towers and golden bridges..."
                />
                <button 
                  onClick={handleEnhance}
                  disabled={!prompt || isEnhancing}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 text-xs font-bold text-gold-600 dark:text-gold-400 hover:text-gold-700 transition-colors disabled:opacity-50"
                >
                  {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={14} />}
                  Enhance Prompt
                </button>
              </div>
            </div>

            {/* Reference Images */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Reference Images</label>
              <div className="flex flex-wrap gap-2">
                {refImages.map((file: File, idx: number) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-silver-200 dark:border-zinc-700">
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeRefImage(idx)}
                      className="absolute top-0 right-0 bg-black/50 text-white p-0.5 rounded-bl-lg hover:bg-red-500 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-silver-300 dark:border-zinc-700 flex items-center justify-center cursor-pointer hover:border-gold-400 transition-colors text-gray-400">
                  <Plus size={20} />
                  <input type="file" multiple accept="image/*" onChange={handleRefImageChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* Model & Ratio Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Model</label>
                <div className="relative">
                  <select 
                    value={model}
                    onChange={(e) => updateState({ model: e.target.value })}
                    className="w-full appearance-none bg-silver-100 dark:bg-zinc-800 p-3 rounded-lg text-xs font-bold outline-none border border-transparent focus:border-gold-400 dark:text-white"
                  >
                    <option value={ImageModel.GEMINI_FLASH_IMAGE}>Gemini Flash</option>
                    <option value={ImageModel.GEMINI_PRO_IMAGE}>Gemini Pro</option>
                    <option value={ImageModel.IMAGEN_4}>Imagen 4</option>
                    <option value={ImageModel.IMAGEN_3}>Imagen 3</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Ratio</label>
                <div className="relative">
                  <select 
                    value={aspectRatio}
                    onChange={(e) => updateState({ aspectRatio: e.target.value })}
                    className="w-full appearance-none bg-silver-100 dark:bg-zinc-800 p-3 rounded-lg text-xs font-bold outline-none border border-transparent focus:border-gold-400 dark:text-white"
                  >
                    <option value={AspectRatio.SQUARE}>Square (1:1)</option>
                    <option value={AspectRatio.LANDSCAPE}>Landscape (16:9)</option>
                    <option value={AspectRatio.PORTRAIT}>Portrait (9:16)</option>
                    <option value={AspectRatio.STANDARD}>Standard (4:3)</option>
                    <option value={AspectRatio.TALL}>Standard Portrait (3:4)</option>
                    <option value={AspectRatio.LANDSCAPE_3_2}>Classic (3:2)</option>
                    <option value={AspectRatio.PORTRAIT_2_3}>Classic Portrait (2:3)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                </div>
              </div>
            </div>

            {/* Count Section */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Count</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => updateState({ count: n })}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${
                      count === n 
                        ? 'bg-black text-white dark:bg-gold-500 dark:text-black' 
                        : 'bg-silver-100 text-gray-400 hover:bg-silver-200 dark:bg-zinc-800 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !prompt} 
              variant="gold" 
              className="w-full py-4 text-white dark:text-black"
              icon={isGenerating ? Loader2 : Sparkles}
            >
              {isGenerating ? 'Generating...' : 'Generate Images'}
            </Button>
          </Card>
        </div>

        {/* Right Column: Preview/Results */}
        <div className="lg:col-span-8">
          <div className="min-h-[600px] border-2 border-dashed border-silver-300 dark:border-zinc-800 rounded-3xl bg-white/30 dark:bg-zinc-900/10 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-gold-400/20 flex items-center justify-center">
                  <Loader2 className="animate-spin text-gold-500" size={32} />
                </div>
                <p className="text-gray-400 font-medium tracking-tight">Brewing your vision...</p>
              </div>
            ) : generatedResults.length > 0 ? (
              <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {generatedResults.map((img: any) => (
                    <div key={img.id} className="group relative bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-silver-100 dark:border-zinc-800 animate-in zoom-in duration-300 hover:shadow-gold-500/20 transition-all">
                      <img src={img.url} alt="Generated" className="w-full h-auto object-cover aspect-auto" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
                         {/* Fix: Using onSave prop instead of addToCollection */}
                         <button 
                           onClick={() => { onSave(img); }} 
                           title="Save to Collection"
                           className="p-3 bg-gold-500 rounded-full text-white shadow-lg hover:scale-110 active:scale-95 transition-all"
                         >
                           <Save size={18} />
                         </button>
                         <a 
                           href={img.url} 
                           download={`kimicode-${img.id}.png`}
                           title="Download Image"
                           className="p-3 bg-white rounded-full text-black shadow-lg hover:scale-110 active:scale-95 transition-all"
                         >
                           <Download size={18} />
                         </a>
                         <button 
                           onClick={() => setPreviewImage(img)} 
                           title="View Full Size"
                           className="p-3 bg-white rounded-full text-black shadow-lg hover:scale-110 active:scale-95 transition-all"
                         >
                           <Maximize2 size={18} />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-silver-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto text-silver-300 dark:text-zinc-700">
                  <ImageIcon size={48} />
                </div>
                <p className="text-silver-400 dark:text-zinc-600 font-semibold text-lg tracking-tight">Ready to create masterpieces</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)}>
        {previewImage && (
          <div className="bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <img src={previewImage.url} className="max-w-full max-h-[85vh] rounded-xl" />
            <div className="p-4 flex justify-between items-center">
               <p className="text-sm text-gray-500 dark:text-gray-400 italic line-clamp-1 max-w-[70%]">"{previewImage.prompt}"</p>
               <div className="flex gap-3">
                  <a href={previewImage.url} download className="text-black dark:text-white hover:text-gold-500 transition-colors"><Download size={20} /></a>
                  {/* Fix: Using onSave prop instead of addToCollection */}
                  <button onClick={() => onSave(previewImage)} className="text-black dark:text-white hover:text-gold-500 transition-colors"><Save size={20} /></button>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// 2. EDITABLE PAGE
const EditablePage = ({ state, setState, onSave, onError }: any) => {
  const { baseImage, instruction, resultImage } = state;
  const [isProcessing, setIsProcessing] = useState(false);
  const updateState = (updates: any) => setState((prev: any) => ({ ...prev, ...updates }));

  const handleEdit = async () => {
    if (!baseImage || !instruction) return;
    setIsProcessing(true);
    try {
      const url = await GeminiService.editImage(baseImage, instruction);
      updateState({ resultImage: { id: Date.now().toString(), url, prompt: instruction, model: ImageModel.GEMINI_FLASH_IMAGE, date: Date.now() } });
      onError("Edit successful!");
    } catch (e) {
      onError("Edit failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-black dark:text-white mb-2">Editable</h1>
        <p className="text-gray-500 dark:text-gray-400">Modify existing images with natural language instructions.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Input Source & Prompt Area below it */}
        <div className="space-y-8">
          <Card className="p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Source Image</h3>
            <div className="w-full h-[400px] border-2 border-dashed border-silver-300 dark:border-zinc-700 rounded-xl bg-silver-100 dark:bg-zinc-800 flex items-center justify-center relative overflow-hidden group transition-all duration-300">
              {baseImage ? (
                <>
                  <img src={URL.createObjectURL(baseImage as Blob)} alt="Original" className="w-full h-full object-contain" />
                  <button onClick={() => updateState({ baseImage: null })} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"><X size={16} /></button>
                </>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500 hover:text-gold-500 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-silver-200 dark:bg-zinc-700 flex items-center justify-center"><Plus size={32} /></div>
                  <span className="font-bold tracking-tight">Upload Image to Edit</span>
                  <input type="file" accept="image/*" onChange={(e) => e.target.files && updateState({ baseImage: e.target.files[0] })} className="hidden" />
                </label>
              )}
            </div>
          </Card>

          {/* Instruction Section - Positioned at the bottom of the column below the image */}
          <Card className="p-8 border-2 border-transparent hover:border-gold-500/20 transition-all">
             <div className="space-y-6">
               <div>
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Instruction</label>
                 <div className="flex flex-col gap-4">
                   <input 
                     type="text" 
                     value={instruction} 
                     onChange={(e) => updateState({ instruction: e.target.value })} 
                     placeholder="e.g. 'Add a red hat to the person' or 'Make it snowy'" 
                     className="w-full p-4 bg-silver-100 dark:bg-zinc-800 rounded-xl outline-none border-2 border-transparent focus:border-gold-400 dark:text-white dark:placeholder-gray-500 transition-all" 
                   />
                   <Button 
                     onClick={handleEdit} 
                     disabled={!baseImage || !instruction || isProcessing} 
                     variant="gold" 
                     className="w-full" 
                     icon={isProcessing ? Loader2 : Edit}
                   >
                     {isProcessing ? 'Processing...' : 'Edit Image'}
                   </Button>
                 </div>
                 <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">
                   Be descriptive! Tell the AI exactly what you want to change.
                 </p>
               </div>
             </div>
          </Card>
        </div>

        {/* Right Column: Result Output */}
        <Card className="p-6 h-full min-h-[550px] flex flex-col gap-4 relative">
           <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Result Image</h3>
           <div className="flex-1 flex items-center justify-center bg-silver-50 dark:bg-zinc-950 rounded-xl border border-silver-100 dark:border-zinc-800 transition-colors relative overflow-hidden">
             {resultImage ? (
               <>
                 <img src={resultImage.url} alt="Result" className="w-full h-full object-contain animate-in fade-in duration-500" />
                 <div className="absolute bottom-4 right-4 flex gap-2">
                    <button onClick={() => onSave(resultImage)} className="p-3 bg-gold-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"><Save size={20} /></button>
                    <a href={resultImage.url} download className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"><Download size={20} /></a>
                 </div>
               </>
             ) : (
               <div className="text-gray-300 dark:text-gray-700 flex flex-col items-center gap-2">
                 <div className="w-20 h-20 bg-silver-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mb-2"><Wand2 size={40} /></div>
                 <p className="font-bold tracking-tight">Result will appear here</p>
               </div>
             )}
             {isProcessing && (
               <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in">
                  <Loader2 className="animate-spin text-gold-500" size={48} />
                  <p className="text-black dark:text-white font-bold">Applying changes...</p>
               </div>
             )}
           </div>
        </Card>
      </div>
    </div>
  );
};

// 3. PROMPTABLE PAGE
const PromptablePage = ({ state, setState, onError }: any) => {
  const { image, generatedPrompt } = state;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const updateState = (updates: any) => setState((prev: any) => ({ ...prev, ...updates }));

  const handleAnalyze = async (type: 'image' | 'video') => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const text = await GeminiService.analyzeImageForPrompt(image, type);
      updateState({ generatedPrompt: text });
    } catch (e) {
      onError("Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-4xl font-bold mb-2">Promptable</h1>
        <p className="text-gray-500 dark:text-gray-400">Reverse-engineer prompts from any visual media.</p>
      </header>
      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="p-6 space-y-6">
          <div className="h-[400px] border-2 border-dashed border-silver-300 dark:border-zinc-700 rounded-xl flex items-center justify-center relative overflow-hidden bg-silver-100 dark:bg-zinc-800">
            {image ? (
               <>
                 <img src={URL.createObjectURL(image as Blob)} className="h-full object-contain" />
                 <button onClick={() => updateState({ image: null })} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"><X size={16} /></button>
               </>
            ) : (
               <label className="cursor-pointer flex flex-col items-center gap-3 text-gray-400 hover:text-gold-500 transition-colors">
                  <input type="file" accept="image/*" onChange={(e) => e.target.files && updateState({ image: e.target.files[0] })} className="hidden" />
                  <ImageIcon size={64} className="mb-2" />
                  <span className="font-bold">Upload Source Media</span>
               </label>
            )}
          </div>
          <div className="flex gap-4">
            <Button onClick={() => handleAnalyze('image')} disabled={!image || isAnalyzing} variant="gold" className="flex-1" icon={isAnalyzing ? Loader2 : ImageIcon}>Analyze Image</Button>
            <Button onClick={() => handleAnalyze('video')} disabled={!image || isAnalyzing} variant="secondary" className="flex-1" icon={isAnalyzing ? Loader2 : Video}>Analyze Video</Button>
          </div>
        </Card>
        <Card className="p-8 bg-zinc-900 text-white min-h-[400px] flex flex-col border border-zinc-800 shadow-2xl relative">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-gold-500 font-black tracking-widest uppercase text-xs">Generated Prompt</h3>
              {generatedPrompt && <button onClick={() => { navigator.clipboard.writeText(generatedPrompt); onError("Copied!"); }} className="text-gray-400 hover:text-white transition-colors"><Copy size={18} /></button>}
           </div>
           <div className="flex-1 flex flex-col justify-center">
             {isAnalyzing ? (
               <div className="flex flex-col items-center gap-4 animate-pulse">
                 <Loader2 className="animate-spin text-gold-500" size={40} />
                 <p className="text-gray-400 text-sm">Gemini is thinking...</p>
               </div>
             ) : (
               <p className="text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
                 {generatedPrompt || 'Upload an image and choose an analysis type to begin prompt extraction.'}
               </p>
             )}
           </div>
        </Card>
      </div>
    </div>
  );
};

// 4. ANY2TEXT PAGE
const Any2TextPage = ({ state, setState, onError }: any) => {
  const { results } = state;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newEntries = Array.from(e.target.files).map(file => ({
        id: Date.now() + Math.random().toString(),
        file,
        previewUrl: URL.createObjectURL(file as Blob),
        extractedText: '',
        isLoading: false
      }));
      setState((prev: any) => ({ results: [...newEntries, ...prev.results] }));
    }
  };

  const handleExtract = async (id: string) => {
    const target = results.find((r: any) => r.id === id);
    if (!target) return;
    setState((prev: any) => ({ results: prev.results.map((r: any) => r.id === id ? { ...r, isLoading: true } : r) }));
    try {
      const text = await GeminiService.extractTextFromFile(target.file);
      setState((prev: any) => ({ results: prev.results.map((r: any) => r.id === id ? { ...r, extractedText: text, isLoading: false } : r) }));
    } catch (e) {
      onError("Extraction failed.");
      setState((prev: any) => ({ results: prev.results.map((r: any) => r.id === id ? { ...r, isLoading: false } : r) }));
    }
  };

  const removeFile = (id: string) => {
    setState((prev: any) => ({ results: prev.results.filter((r: any) => r.id !== id) }));
  };

  const renderFilePreview = (item: any) => {
    const { type } = item.file;
    if (type.startsWith('image/')) return <img src={item.previewUrl} className="max-h-full object-contain" />;
    if (type.startsWith('video/')) return <video src={item.previewUrl} className="max-h-full" controls />;
    if (type.startsWith('audio/')) return <div className="flex flex-col items-center gap-4"><Music size={48} className="text-gold-500" /><audio src={item.previewUrl} controls className="w-64" /></div>;
    if (type === 'application/pdf' || item.file.name.endsWith('.pdf')) return <div className="flex flex-col items-center gap-4 text-red-500"><FileText size={64} /><span>PDF Document</span></div>;
    return <div className="flex flex-col items-center gap-4"><FileIcon size={64} /><span>{item.file.name}</span></div>;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-4xl font-bold mb-2">Any2Text</h1>
        <p className="text-gray-500 dark:text-gray-400">Extract intelligence from images, videos, audio, and documents.</p>
      </header>
      <Card className="p-12 border-2 border-dashed border-silver-300 dark:border-zinc-700 bg-silver-50 dark:bg-zinc-800/20 flex flex-col items-center justify-center cursor-pointer group hover:border-gold-500 transition-colors">
        <label className="w-full text-center cursor-pointer">
           <FileType size={64} className="text-gray-400 mx-auto mb-4 group-hover:text-gold-500 transition-colors" />
           <span className="text-lg font-bold text-gray-500 dark:text-gray-400">Drop files here or click to upload</span>
           <p className="text-sm text-gray-400 mt-2">Supports Image, Video, Audio, and PDF</p>
           <input type="file" multiple accept="image/*,video/*,audio/*,application/pdf" onChange={handleFileChange} className="hidden" />
        </label>
      </Card>
      <div className="space-y-6">
         {results.map((item: any) => (
           <Card key={item.id} className="p-6 grid lg:grid-cols-2 gap-8 relative animate-in slide-in-from-bottom-5">
             <button onClick={() => removeFile(item.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors z-10"><XCircle size={20} /></button>
             <div className="h-[400px] bg-silver-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden border border-silver-200 dark:border-zinc-700">
               {renderFilePreview(item)}
             </div>
             <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center px-1">
                   <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Extracted Content</h4>
                   <span className="text-[10px] text-gray-400">{item.file.name}</span>
                </div>
                <div className="flex-1 bg-silver-50 dark:bg-zinc-950 p-6 rounded-xl font-mono text-sm overflow-auto custom-scrollbar border border-silver-100 dark:border-zinc-800 min-h-[280px]">
                  {item.isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-70">
                       <Loader2 className="animate-spin text-gold-500" size={32} />
                       <span className="text-xs font-bold">Gemini is parsing the media...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap dark:text-gray-300">
                       {item.extractedText || <span className="text-gray-400 italic">No text extracted yet. Click the button below to process this file.</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => handleExtract(item.id)} disabled={item.isLoading} variant="gold" className="flex-1" icon={item.isLoading ? Loader2 : Sparkles}>
                     {item.isLoading ? 'Processing...' : 'Start Extraction'}
                  </Button>
                  {item.extractedText && (
                    <button 
                      onClick={() => { navigator.clipboard.writeText(item.extractedText); onError("Copied to clipboard!"); }} 
                      className="p-4 border border-silver-200 dark:border-zinc-700 rounded-xl hover:bg-silver-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
                    >
                      <Copy size={20} />
                    </button>
                  )}
                </div>
             </div>
           </Card>
         ))}
      </div>
    </div>
  );
};

// 5. COLLECTION PAGE
const CollectionPage = ({ collection, onDelete, onError }: any) => {
  const [previewImage, setPreviewImage] = useState<any>(null);
  
  const handleDownload = (img: any) => {
     const link = document.createElement('a');
     link.href = img.url;
     link.download = `kimicode-${img.id}.png`;
     link.click();
     onError("Download started.");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex justify-between items-end border-b border-silver-200 dark:border-zinc-800 pb-6">
         <div>
            <h1 className="text-4xl font-bold text-black dark:text-white">Collection</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Your vault of AI-generated artistic assets.</p>
         </div>
         <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-gold-600 dark:text-gold-500 uppercase tracking-widest">Storage Status</span>
            <div className="text-2xl font-black text-black dark:text-white">{collection.length} <span className="text-xs font-medium text-gray-400">ITEMS</span></div>
         </div>
      </header>
      
      {collection.length === 0 ? (
        <div className="py-32 flex flex-col items-center text-gray-300 dark:text-zinc-800">
           <div className="w-24 h-24 rounded-full border-4 border-current flex items-center justify-center mb-6 opacity-20">
              <Layers size={48} />
           </div>
           <p className="text-xl font-bold">Your gallery is empty</p>
           <p className="text-sm mt-2 opacity-50">Head over to Imaginable to start creating.</p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {collection.map((img: any) => (
            <div key={img.id} className="break-inside-avoid group relative bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-lg border border-silver-100 dark:border-zinc-800 animate-in fade-in duration-500 hover:shadow-2xl transition-all">
              <img src={img.url} className="w-full h-auto object-cover" />
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-300 p-6 flex flex-col justify-between backdrop-blur-[2px]">
                 <div className="space-y-2">
                    <p className="text-white text-[10px] font-black tracking-widest uppercase opacity-50">Prompt</p>
                    <p className="text-white text-xs line-clamp-4 leading-relaxed italic">"{img.prompt}"</p>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setPreviewImage(img)} className="flex-1 py-3 bg-white text-black text-xs font-black rounded-lg hover:bg-gold-500 hover:text-white transition-all active:scale-95">VIEW LARGE</button>
                    <button onClick={() => handleDownload(img)} className="p-3 bg-zinc-800 text-white rounded-lg hover:bg-gold-500 transition-all" title="Download"><Download size={18} /></button>
                    <button onClick={() => onDelete(img.id)} className="p-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all" title="Delete"><Trash2 size={18} /></button>
                 </div>
              </div>
              {img.isSynced && (
                 <div className="absolute top-2 left-2 bg-green-500 w-2 h-2 rounded-full shadow-lg" title="Synced to Cloud"></div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)}>
        {previewImage && (
          <div className="bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-2xl relative animate-in zoom-in duration-200">
            <img src={previewImage.url} className="max-w-full max-h-[85vh] rounded-xl shadow-inner" />
            <div className="p-6 space-y-4">
               <div className="flex justify-between items-start">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Creation Timestamp</p>
                     <p className="text-xs text-black dark:text-white font-medium">{new Date(previewImage.date).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-3">
                     <button onClick={() => handleDownload(previewImage)} className="flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-gold-500 dark:text-black rounded-lg text-xs font-bold hover:scale-105 transition-all"><Download size={14} /> Download</button>
                     <button onClick={() => { onDelete(previewImage.id); setPreviewImage(null); }} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:scale-105 transition-all"><Trash2 size={14} /> Delete</button>
                  </div>
               </div>
               <div className="p-4 bg-silver-50 dark:bg-zinc-950 rounded-xl border border-silver-100 dark:border-zinc-800">
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">"{previewImage.prompt}"</p>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
