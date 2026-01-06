
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

// --- Image Editor Modal ---

const ImageEditorModal = ({ image, isOpen, onClose, onSave }: { image: GeneratedImage | null, isOpen: boolean, onClose: () => void, onSave: (newImg: GeneratedImage) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  
  const [filter, setFilter] = useState('none');
  const [crop, setCrop] = useState('original');
  const [scale, setScale] = useState(100);

  useEffect(() => {
    if (isOpen && image) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = image.url;
      img.onload = () => {
        setOriginalImage(img);
        setFilter('none');
        setCrop('original');
        setScale(100);
      };
    }
  }, [isOpen, image]);

  useEffect(() => {
    if (originalImage && canvasRef.current) {
      drawCanvas();
    }
  }, [originalImage, filter, crop, scale]);

  const drawCanvas = () => {
    if (!originalImage || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    let sx = 0, sy = 0, sw = originalImage.naturalWidth, sh = originalImage.naturalHeight;

    if (crop === 'square') {
      const minDim = Math.min(sw, sh);
      sx = (sw - minDim) / 2;
      sy = (sh - minDim) / 2;
      sw = minDim;
      sh = minDim;
    } else if (crop === 'landscape') {
      const targetRatio = 16 / 9;
      const currentRatio = sw / sh;
      if (currentRatio > targetRatio) {
        const newWidth = sh * targetRatio;
        sx = (sw - newWidth) / 2;
        sw = newWidth;
      } else {
        const newHeight = sw / targetRatio;
        sy = (sh - newHeight) / 2;
        sh = newHeight;
      }
    } else if (crop === 'portrait') {
      const targetRatio = 9 / 16;
      const currentRatio = sw / sh;
      if (currentRatio > targetRatio) {
        const newWidth = sh * targetRatio;
        sx = (sw - newWidth) / 2;
        sw = newWidth;
      } else {
        const newHeight = sw / targetRatio;
        sy = (sh - newHeight) / 2;
        sh = newHeight;
      }
    }

    const scaleFactor = scale / 100;
    canvasRef.current.width = sw * scaleFactor;
    canvasRef.current.height = sh * scaleFactor;

    let filterString = 'none';
    switch (filter) {
      case 'grayscale': filterString = 'grayscale(100%)'; break;
      case 'sepia': filterString = 'sepia(100%)'; break;
      case 'warm': filterString = 'sepia(40%) saturate(150%)'; break;
      case 'cool': filterString = 'hue-rotate(180deg) saturate(80%)'; break;
      case 'vintage': filterString = 'sepia(40%) contrast(120%) brightness(90%)'; break;
    }
    
    ctx.filter = filterString;
    ctx.drawImage(originalImage, sx, sy, sw, sh, 0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleSave = () => {
    if (canvasRef.current && image) {
      const newUrl = canvasRef.current.toDataURL('image/png');
      onSave({
        ...image,
        id: Date.now().toString(),
        url: newUrl,
        date: Date.now(),
        prompt: image.prompt + ' (Edited)'
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh]">
        <div className="flex-1 bg-silver-100 dark:bg-zinc-950 p-8 flex items-center justify-center overflow-auto">
           <canvas ref={canvasRef} className="max-w-full max-h-full shadow-lg border border-silver-300 dark:border-zinc-800" />
        </div>

        <div className="w-full md:w-80 bg-white dark:bg-zinc-900 p-6 border-l border-silver-200 dark:border-zinc-800 overflow-y-auto space-y-8">
           <h3 className="text-lg font-bold text-black dark:text-white mb-4">Editor</h3>
           <div className="grid grid-cols-2 gap-2">
             {['none', 'grayscale', 'sepia', 'warm', 'cool', 'vintage'].map((f) => (
               <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 text-xs font-semibold rounded border ${filter === f ? 'bg-black text-white dark:bg-gold-500 dark:text-black' : 'bg-white text-gray-600 dark:bg-zinc-800 dark:text-gray-300'}`}>{f}</button>
             ))}
           </div>
           <div className="flex flex-col gap-3">
             <Button onClick={handleSave} variant="gold" className="w-full" icon={Check}>Save</Button>
             <Button onClick={onClose} variant="ghost" className="w-full">Cancel</Button>
           </div>
        </div>
      </div>
    </Modal>
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
  const { prompt, model, aspectRatio, count, generatedResults } = state;
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<any>(null);

  const updateState = (updates: any) => setState((prev: any) => ({ ...prev, ...updates }));

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const results = await GeminiService.generateImage(model, prompt, aspectRatio);
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

  return (
    <div className="space-y-8">
      <header><h1 className="text-4xl font-bold mb-2">Imaginable</h1></header>
      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="p-6 space-y-6">
          <textarea 
            value={prompt}
            onChange={(e) => updateState({ prompt: e.target.value })}
            className="w-full p-4 bg-silver-100 dark:bg-zinc-800 rounded-xl min-h-[120px] outline-none"
            placeholder="Describe your masterpiece..."
          />
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt} variant="gold" className="w-full" icon={isGenerating ? Loader2 : Sparkles}>
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </Card>
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
          {generatedResults.map((img: any) => (
            <div key={img.id} className="group relative bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-lg">
              <img src={img.url} alt="Gen" className="w-full h-auto" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                 <button onClick={() => onSave(img)} className="p-3 bg-gold-500 rounded-full text-white"><Save size={20} /></button>
                 <button onClick={() => setPreviewImage(img)} className="p-3 bg-white rounded-full text-black"><Maximize2 size={20} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)}>
        {previewImage && <img src={previewImage.url} className="max-w-full max-h-[85vh] rounded-lg" />}
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
    } catch (e) {
      onError("Edit failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <header><h1 className="text-4xl font-bold mb-2">Editable</h1></header>
      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="p-6 space-y-6">
          <div className="w-full h-[300px] border-2 border-dashed border-silver-300 rounded-xl flex items-center justify-center overflow-hidden">
            {baseImage ? (
              <img src={URL.createObjectURL(baseImage as Blob)} className="h-full object-contain" />
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-2"><Plus size={40} /><span>Upload</span><input type="file" accept="image/*" onChange={(e) => e.target.files && updateState({ baseImage: e.target.files[0] })} className="hidden" /></label>
            )}
          </div>
          <input type="text" value={instruction} onChange={(e) => updateState({ instruction: e.target.value })} placeholder="Instruction..." className="w-full p-4 bg-silver-100 dark:bg-zinc-800 rounded-xl outline-none" />
          <Button onClick={handleEdit} disabled={!baseImage || !instruction || isProcessing} variant="primary" className="w-full" icon={isProcessing ? Loader2 : Edit}>{isProcessing ? 'Processing...' : 'Edit'}</Button>
        </Card>
        <Card className="p-6 h-[500px] flex items-center justify-center">
             {resultImage ? <img src={resultImage.url} className="max-h-full" /> : <p className="text-gray-400">Result will appear here</p>}
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
    <div className="space-y-8">
      <header><h1 className="text-4xl font-bold mb-2">Promptable</h1></header>
      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="p-6 space-y-6">
          <div className="h-[300px] border-2 border-dashed border-silver-300 rounded-xl flex items-center justify-center">
            {image ? <img src={URL.createObjectURL(image as Blob)} className="h-full object-contain" /> : <label className="cursor-pointer"><input type="file" accept="image/*" onChange={(e) => e.target.files && updateState({ image: e.target.files[0] })} className="hidden" /><ImageIcon size={48} className="text-gray-400" /></label>}
          </div>
          <div className="flex gap-4">
            <Button onClick={() => handleAnalyze('image')} disabled={!image || isAnalyzing} className="flex-1" icon={ImageIcon}>Image</Button>
            <Button onClick={() => handleAnalyze('video')} disabled={!image || isAnalyzing} variant="secondary" className="flex-1" icon={Video}>Video</Button>
          </div>
        </Card>
        <Card className="p-8 bg-black dark:bg-zinc-900 text-white min-h-[400px]">
           <h3 className="text-gold-500 font-bold mb-4">Prompt</h3>
           {isAnalyzing ? <div className="flex justify-center mt-20"><Loader2 className="animate-spin" /></div> : <p className="text-gray-300">{generatedPrompt || 'Upload and analyze...'}</p>}
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

  const renderFilePreview = (item: any) => {
    const { type } = item.file;
    if (type.startsWith('image/')) return <img src={item.previewUrl} className="max-h-full object-contain" />;
    if (type.startsWith('video/')) return <video src={item.previewUrl} className="max-h-full" controls />;
    if (type.startsWith('audio/')) return <div className="flex flex-col items-center gap-4"><Music size={48} className="text-gold-500" /><audio src={item.previewUrl} controls className="w-64" /></div>;
    if (type === 'application/pdf' || item.file.name.endsWith('.pdf')) return <div className="flex flex-col items-center gap-4 text-red-500"><FileText size={64} /><span>PDF Document</span></div>;
    return <div className="flex flex-col items-center gap-4"><FileIcon size={64} /><span>{item.file.name}</span></div>;
  };

  return (
    <div className="space-y-8">
      <header><h1 className="text-4xl font-bold mb-2">Any2Text</h1></header>
      <Card className="p-8 border-2 border-dashed border-silver-300 dark:border-zinc-700 bg-silver-50 dark:bg-zinc-800/50 flex flex-col items-center justify-center cursor-pointer">
        <label className="w-full text-center cursor-pointer"><FileType size={48} className="text-gray-400 mx-auto mb-4" /><span>Drop files here or click to upload</span><input type="file" multiple accept="image/*,video/*,audio/*,application/pdf" onChange={handleFileChange} className="hidden" /></label>
      </Card>
      <div className="space-y-6">
         {results.map((item: any) => (
           <Card key={item.id} className="p-6 grid lg:grid-cols-2 gap-8">
             <div className="h-[400px] bg-silver-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden">
               {renderFilePreview(item)}
             </div>
             <div className="flex flex-col gap-4">
                <div className="flex-1 bg-silver-50 dark:bg-zinc-950 p-4 rounded-xl font-mono text-sm overflow-auto custom-scrollbar">
                  {item.isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50"><Loader2 className="animate-spin" /><span>Consulting Gemini for extraction...</span></div>
                  ) : item.extractedText || 'Ready for extraction...'}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleExtract(item.id)} disabled={item.isLoading} variant="gold" className="flex-1" icon={item.isLoading ? Loader2 : Sparkles}>Extract</Button>
                  {item.extractedText && (
                    <button onClick={() => { navigator.clipboard.writeText(item.extractedText); onError("Copied!"); }} className="p-3 border border-silver-200 dark:border-zinc-700 rounded-xl hover:bg-silver-100 dark:hover:bg-zinc-800 transition-colors"><Copy size={20} /></button>
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
const CollectionPage = ({ collection, onDelete }: any) => {
  const [previewImage, setPreviewImage] = useState<any>(null);
  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end"><h1 className="text-4xl font-bold">Collection</h1><div className="text-sm font-bold text-gold-600">{collection.length} ITEMS</div></header>
      {collection.length === 0 ? <div className="py-20 flex flex-col items-center text-gray-400"><Layers size={64} className="mb-6 opacity-20" /><p>Gallery is Empty</p></div> : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {collection.map((img: any) => (
            <div key={img.id} className="break-inside-avoid bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-lg group relative border border-silver-100 dark:border-zinc-800">
              <img src={img.url} className="w-full" />
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-between">
                 <p className="text-white text-xs line-clamp-3">{img.prompt}</p>
                 <div className="flex gap-2">
                    <button onClick={() => setPreviewImage(img)} className="flex-1 py-2 bg-white text-black font-bold rounded">VIEW</button>
                    <button onClick={() => onDelete(img.id)} className="p-2 bg-red-500 text-white rounded"><Trash2 size={16} /></button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)}>
        {previewImage && <img src={previewImage.url} className="max-w-full max-h-[85vh] rounded-lg" />}
      </Modal>
    </div>
  );
};
