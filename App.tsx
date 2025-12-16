
import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, X, Image as ImageIcon, Wand2, Edit, PlaySquare, 
  Download, Save, Maximize2, XCircle, ChevronDown, Plus, 
  Trash2, Loader2, Sparkles, Layers, Video, Film,
  Crop, Sliders, Check, RotateCcw, Moon, Sun, AlertCircle,
  ChevronsUp, FileText, Copy, Music, File as FileIcon, FileType,
  Cloud, CloudLightning, LogOut, Calendar, Smartphone, Monitor
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
  
  // Updated variants for better Dark Mode support
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <button onClick={onClose} className="absolute top-6 right-6 text-white hover:text-gold-400 transition-colors z-50">
        <XCircle size={40} />
      </button>
      <div className="max-w-7xl w-full max-h-[90vh] overflow-auto relative flex items-center justify-center">
        {children}
      </div>
    </div>
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
  return (
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
    </div>
  );
};

// --- Image Editor Modal ---

const ImageEditorModal = ({ image, isOpen, onClose, onSave }: { image: GeneratedImage | null, isOpen: boolean, onClose: () => void, onSave: (newImg: GeneratedImage) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  
  // Edit States
  const [filter, setFilter] = useState('none');
  const [crop, setCrop] = useState('original'); // original, square, landscape, portrait, 3:2, 2:3
  const [scale, setScale] = useState(100); // percentage

  useEffect(() => {
    if (isOpen && image) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = image.url;
      img.onload = () => {
        setOriginalImage(img);
        // Reset states
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

    // 1. Determine Source Crop
    let sx = 0, sy = 0, sw = originalImage.naturalWidth, sh = originalImage.naturalHeight;

    if (crop === 'square') {
      const minDim = Math.min(sw, sh);
      sx = (sw - minDim) / 2;
      sy = (sh - minDim) / 2;
      sw = minDim;
      sh = minDim;
    } else if (crop === 'landscape') { // 16:9
      const targetRatio = 16 / 9;
      const currentRatio = sw / sh;
      if (currentRatio > targetRatio) { // Image is wider than target
        const newWidth = sh * targetRatio;
        sx = (sw - newWidth) / 2;
        sw = newWidth;
      } else { // Image is taller
        const newHeight = sw / targetRatio;
        sy = (sh - newHeight) / 2;
        sh = newHeight;
      }
    } else if (crop === 'portrait') { // 9:16
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
    } else if (crop === '3:2') {
      const targetRatio = 3 / 2;
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
    } else if (crop === '2:3') {
      const targetRatio = 2 / 3;
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

    // 2. Set Canvas Size (Output)
    const scaleFactor = scale / 100;
    canvasRef.current.width = sw * scaleFactor;
    canvasRef.current.height = sh * scaleFactor;

    // 3. Apply Filters & Draw
    let filterString = 'none';
    switch (filter) {
      case 'grayscale': filterString = 'grayscale(100%)'; break;
      case 'sepia': filterString = 'sepia(100%)'; break;
      case 'warm': filterString = 'sepia(40%) saturate(150%)'; break;
      case 'cool': filterString = 'hue-rotate(180deg) saturate(80%)'; break;
      case 'vintage': filterString = 'sepia(40%) contrast(120%) brightness(90%)'; break;
      case 'invert': filterString = 'invert(100%)'; break;
    }
    
    ctx.filter = filterString;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(originalImage, sx, sy, sw, sh, 0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleSave = () => {
    if (canvasRef.current && image) {
      const newUrl = canvasRef.current.toDataURL(image.url.startsWith('data:image/png') ? 'image/png' : 'image/jpeg');
      const newImage: GeneratedImage = {
        ...image,
        id: Date.now().toString() + Math.random(),
        url: newUrl,
        date: Date.now(),
        prompt: image.prompt + ' (Edited)'
      };
      onSave(newImage);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Tooltip descriptions
  const cropDescriptions: Record<string, string> = {
    original: "Keep original dimensions",
    square: "1:1 - Good for social media avatars",
    landscape: "16:9 - Cinematic widescreen",
    portrait: "9:16 - Mobile stories format",
    '3:2': "Classic photography landscape",
    '2:3': "Classic photography portrait"
  };

  const filterDescriptions: Record<string, string> = {
    none: "No filter",
    grayscale: "Black and white",
    sepia: "Antique brown tone",
    warm: "Sunny, golden tones",
    cool: "Calm, blueish tones",
    vintage: "Retro faded look"
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh]">
        {/* Canvas Area */}
        <div className="flex-1 bg-silver-100 dark:bg-zinc-950 p-8 flex items-center justify-center overflow-auto min-h-[400px]">
           <canvas ref={canvasRef} className="max-w-full max-h-full shadow-lg border border-silver-300 dark:border-zinc-800 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]" />
        </div>

        {/* Controls Sidebar */}
        <div className="w-full md:w-80 bg-white dark:bg-zinc-900 p-6 border-l border-silver-200 dark:border-zinc-800 overflow-y-auto space-y-8">
           <div>
             <h3 className="text-lg font-bold text-black dark:text-white mb-4 flex items-center gap-2">
               <Sliders size={20} className="text-gold-500" /> Adjustments
             </h3>
             
             {/* Crop */}
             <div className="mb-6">
               <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block" title="Choose an aspect ratio to crop your image">Crop</label>
               <div className="grid grid-cols-2 gap-2">
                  {['original', 'square', 'landscape', 'portrait', '3:2', '2:3'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCrop(c)}
                      title={cropDescriptions[c] || c}
                      className={`px-3 py-2 text-xs font-semibold rounded border ${
                        crop === c 
                        ? 'bg-black text-white border-black dark:bg-gold-500 dark:text-black dark:border-gold-500' 
                        : 'bg-white text-gray-600 border-silver-200 hover:border-gold-400 dark:bg-zinc-800 dark:text-gray-300 dark:border-zinc-700 dark:hover:border-gold-500'
                      } transition-colors capitalize`}
                    >
                      {c === 'landscape' ? '16:9' : c === 'portrait' ? '9:16' : c}
                    </button>
                  ))}
               </div>
             </div>

             {/* Resize */}
             <div className="mb-6">
               <div className="flex justify-between items-center mb-2">
                 <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide" title="Adjust the resolution of the output image">Resize / Scale</label>
                 <span className="text-xs font-mono text-gold-600 dark:text-gold-400">{scale}%</span>
               </div>
               <input 
                 type="range" 
                 min="10" 
                 max="100" 
                 value={scale} 
                 onChange={(e) => setScale(Number(e.target.value))}
                 title={`Resize image to ${scale}% of original size`}
                 className="w-full h-2 bg-silver-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-gold-500"
               />
             </div>
           </div>

           <div>
             <h3 className="text-lg font-bold text-black dark:text-white mb-4 flex items-center gap-2">
               <Sparkles size={20} className="text-gold-500" /> Filters
             </h3>
             <div className="grid grid-cols-2 gap-2">
               {['none', 'grayscale', 'sepia', 'warm', 'cool', 'vintage'].map((f) => (
                 <button
                   key={f}
                   onClick={() => setFilter(f)}
                   title={filterDescriptions[f] || `Apply ${f} filter`}
                   className={`px-3 py-2 text-xs font-semibold rounded border ${
                     filter === f 
                     ? 'bg-black text-white border-black dark:bg-gold-500 dark:text-black dark:border-gold-500' 
                     : 'bg-white text-gray-600 border-silver-200 hover:border-gold-400 dark:bg-zinc-800 dark:text-gray-300 dark:border-zinc-700 dark:hover:border-gold-500'
                   } transition-colors capitalize`}
                 >
                   {f}
                 </button>
               ))}
             </div>
           </div>

           <div className="pt-6 border-t border-silver-200 dark:border-zinc-800 flex flex-col gap-3">
             <Button 
                onClick={handleSave} 
                variant="gold" 
                className="w-full" 
                icon={Check}
                title="Save changes and add to collection"
             >
               Save Changes
             </Button>
             <Button 
                onClick={() => { 
                    setFilter('none'); setCrop('original'); setScale(100); 
                }} 
                variant="ghost" 
                className="w-full" 
                icon={RotateCcw}
                title="Revert all cropping, resizing, and filters"
             >
               Reset Edits
             </Button>
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

  // --- PERSISTENT STATE ---
  // Imaginable
  const [imaginableState, setImaginableState] = useState<ImaginableState>({
    prompt: '',
    model: ImageModel.GEMINI_FLASH_IMAGE,
    aspectRatio: AspectRatio.SQUARE,
    count: 1,
    refImages: [],
    generatedResults: []
  });

  // Editable
  const [editableState, setEditableState] = useState<EditableState>({
    baseImage: null,
    instruction: '',
    resultImage: null
  });

  // Promptable
  const [promptableState, setPromptableState] = useState<PromptableState>({
    image: null,
    generatedPrompt: ''
  });

  // Any2Text
  const [any2TextState, setAny2TextState] = useState<Any2TextState>({
    results: []
  });

  // Initialize theme from storage to avoid flicker and race conditions
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kimicode_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  // Apply Theme Effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('kimicode_theme', theme);
  }, [theme]);

  // Load collection
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

  // Save collection handler with Cloud Storage
  const addToCollection = async (img: GeneratedImage) => {
    showNotification("Saving to Cloud...");
    
    try {
      // 1. Upload to Cloud
      const syncedImage = await CloudStorageService.uploadImageToCloud(img);
      
      // 2. Update Collection (Handle Duplicates & Storage Limits)
      setCollection(prev => {
        const index = prev.findIndex(item => item.id === img.id);
        let updated;
        if (index >= 0) {
            updated = [...prev];
            updated[index] = syncedImage; 
        } else {
            updated = [syncedImage, ...prev];
        }
        
        try {
            localStorage.setItem('kimicode_collection', JSON.stringify(updated));
        } catch (e) {
            console.error("Storage limit reached", e);
            // Even if local storage fails, we still show success as it's in the session state
            showNotification("Storage full! Saved to cloud only (session).");
        }
        return updated;
      });
      
      showNotification("Saved to Collection & Cloud");
    } catch (e) {
      console.error("Save failed:", e);
      showNotification("Cloud upload failed. Saved locally.");
      
      // Fallback: Save locally
      setCollection(prev => {
         // Check duplicate to avoid adding failed upload multiple times if user retries
         const index = prev.findIndex(item => item.id === img.id);
         if (index >= 0) return prev;

         const updated = [img, ...prev];
         try {
            localStorage.setItem('kimicode_collection', JSON.stringify(updated));
         } catch (storageError) {
             showNotification("Storage full! Cannot save locally.");
         }
         return updated;
      });
    }
  };

  const removeFromCollection = (id: string) => {
    const updated = collection.filter(img => img.id !== id);
    setCollection(updated);
    localStorage.setItem('kimicode_collection', JSON.stringify(updated));
    showNotification("Image permanently deleted.");
  };

  const showNotification = (msg: string) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification(msg);
    // In browser, setTimeout returns a number
    notificationTimeoutRef.current = window.setTimeout(() => {
      setNotification(null);
      notificationTimeoutRef.current = null;
    }, 3000);
  };

  const handleMobileNavClick = (route: AppRoute) => {
    setActiveRoute(route);
    setIsMobileMenuOpen(false);
  };

  // Render Page Switcher
  const renderContent = () => {
    switch (activeRoute) {
      case AppRoute.IMAGINABLE:
        return (
          <ImaginablePage 
            state={imaginableState}
            setState={setImaginableState}
            onSave={addToCollection} 
            onError={showNotification} 
          />
        );
      case AppRoute.EDITABLE:
        return (
          <EditablePage 
            state={editableState}
            setState={setEditableState}
            onSave={addToCollection} 
            onError={showNotification} 
          />
        );
      case AppRoute.PROMPTABLE:
        return (
          <PromptablePage 
            state={promptableState}
            setState={setPromptableState}
            onError={showNotification} 
          />
        );
      case AppRoute.ANY2TEXT:
        return (
          <Any2TextPage 
            state={any2TextState}
            setState={setAny2TextState}
            onError={showNotification} 
          />
        );
      case AppRoute.COLLECTION:
        return (
          <CollectionPage 
            collection={collection} 
            onDelete={removeFromCollection}
            onError={showNotification}
          />
        );
      default:
        return (
          <ImaginablePage 
            state={imaginableState}
            setState={setImaginableState}
            onSave={addToCollection} 
            onError={showNotification} 
          />
        );
    }
  };

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-700">
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
                  ? 'bg-black text-white shadow-lg shadow-black/20 dark:bg-gold-500 dark:text-black dark:shadow-gold-500/20'
                  : 'text-gray-500 hover:bg-silver-100 hover:text-black dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-silver-100 dark:border-zinc-800 space-y-3 bg-white dark:bg-zinc-900">
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-silver-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-silver-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <span className="flex items-center gap-2 font-medium text-sm">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        <div className="bg-gradient-to-br from-silver-100 to-white dark:from-zinc-800 dark:to-zinc-900 p-3 rounded-xl border border-silver-200 dark:border-zinc-700">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-bold text-black dark:text-white">Systems Operational</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-silver-100 dark:bg-zinc-950 flex flex-col md:flex-row font-sans text-gray-800 dark:text-gray-200 transition-colors duration-300">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-zinc-900 p-4 flex justify-between items-center shadow-md z-20 sticky top-0 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-black dark:text-white hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
          >
            <Menu size={28} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black dark:bg-gold-500 rounded-lg flex items-center justify-center text-white dark:text-black font-bold">K</div>
            <div className="text-xl font-black tracking-tight text-black dark:text-white">
              KIMI<span className="text-gold-500 dark:text-gold-400">CODE</span>
            </div>
          </div>
        </div>
        <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gold-500 dark:hover:text-gold-400 transition-colors">
          {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-zinc-900 border-r border-silver-200 dark:border-zinc-800 h-screen sticky top-0 z-30 transition-colors duration-300">
        <NavContent />
      </aside>

      {/* Mobile Sidebar / Drawer */}
      <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
        {/* Drawer Panel */}
        <div className={`absolute top-0 left-0 h-full w-80 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <NavContent mobile={true} />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen scroll-smooth">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 bg-zinc-900/95 dark:bg-white/95 backdrop-blur text-white dark:text-zinc-900 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 border border-white/10 dark:border-black/5 transform transition-all duration-300 animate-in slide-in-from-bottom-5">
          <Sparkles size={16} className="text-gold-500" />
          <span className="font-medium text-sm">{notification}</span>
        </div>
      )}
    </div>
  );
}

// --- Sub-Pages ---

// 1. IMAGINABLE PAGE
const ImaginablePage = ({ 
  state, setState, onSave, onError 
}: { 
  state: ImaginableState, 
  setState: React.Dispatch<React.SetStateAction<ImaginableState>>, 
  onSave: (img: GeneratedImage) => Promise<void>, 
  onError: (msg: string) => void 
}) => {
  const { prompt, model, aspectRatio, count, refImages, generatedResults } = state;

  // Local UI State (Does not persist across tabs, but data inputs do)
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [upscalingId, setUpscalingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'save' | 'delete';
    image: GeneratedImage | null;
  }>({ isOpen: false, type: 'save', image: null });

  // Friendly names for Aspect Ratios
  const aspectRatioLabels: Record<string, string> = {
    [AspectRatio.SQUARE]: 'Square (1:1)',
    [AspectRatio.LANDSCAPE]: 'Landscape (16:9)',
    [AspectRatio.PORTRAIT]: 'Portrait (9:16)',
    [AspectRatio.STANDARD]: 'Standard (4:3)',
    [AspectRatio.TALL]: 'Standard Portrait (3:4)',
    [AspectRatio.LANDSCAPE_3_2]: 'Classic (3:2)',
    [AspectRatio.PORTRAIT_2_3]: 'Classic Portrait (2:3)'
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setState(prev => ({
        ...prev,
        refImages: [...prev.refImages, ...Array.from(e.target.files || [])]
      }));
    }
  };

  const removeRefImage = (index: number) => {
    setState(prev => ({
      ...prev,
      refImages: prev.refImages.filter((_, i) => i !== index)
    }));
  };

  const updateState = (updates: Partial<ImaginableState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleEnhancePrompt = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const newPrompt = await GeminiService.enhancePrompt(prompt);
      updateState({ prompt: newPrompt });
    } catch (error) {
      onError("Failed to enhance prompt. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    // Don't clear previous results - prepend new ones
    
    try {
      const batchPromises = [];
      for (let i = 0; i < count; i++) {
        batchPromises.push(GeminiService.generateImage(model, prompt, aspectRatio, refImages));
      }

      const resultsNested = await Promise.all(batchPromises);
      const allImages = resultsNested.flat();

      if (allImages.length === 0) {
        throw new Error("No images generated.");
      }

      const newImages: GeneratedImage[] = allImages.map(url => ({
        id: Date.now().toString() + Math.random().toString(),
        url,
        prompt,
        model,
        date: Date.now(),
        aspectRatio
      }));

      // Prepend new images to existing list to preserve session history
      updateState({ generatedResults: [...newImages, ...generatedResults] });
    } catch (error: any) {
      console.error("Generation error:", error);
      if (error.message?.includes('400') || error.message?.includes('500') || error.message?.includes('xhr')) {
        onError("Service momentarily unavailable or request blocked. Please retry.");
      } else {
        onError("Generation failed. Please try again or check your prompt.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEdited = (newImg: GeneratedImage) => {
    // Add edited image to the top of the list
    updateState({ generatedResults: [newImg, ...generatedResults] });
    onError("Edits applied successfully");
  };

  const handleUpscale = async (img: GeneratedImage) => {
    setUpscalingId(img.id);
    try {
      const upscaledUrl = await GeminiService.upscaleImage(img.url, img.aspectRatio);
      const upscaledImage: GeneratedImage = {
        ...img,
        id: Date.now().toString() + Math.random(),
        url: upscaledUrl,
        date: Date.now(),
        prompt: img.prompt + ' (Upscaled)'
      };
      updateState({ generatedResults: [upscaledImage, ...generatedResults] });
      onError("Image upscaled to 2K successfully!");
    } catch (e) {
      console.error("Upscale error:", e);
      onError("Failed to upscale image. Please try again.");
    } finally {
      setUpscalingId(null);
    }
  };

  // Trigger Confirmation for Save
  const handleSaveClick = (img: GeneratedImage) => {
    setConfirmModal({ isOpen: true, type: 'save', image: img });
  };

  // Trigger Confirmation for Delete
  const handleDeleteClick = (img: GeneratedImage) => {
    setConfirmModal({ isOpen: true, type: 'delete', image: img });
  };

  // Execute Action after Confirmation
  const executeConfirmAction = async () => {
    const { type, image } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false }); // Close modal first

    if (!image) return;

    if (type === 'save') {
      setSavingId(image.id);
      await onSave(image);
      setSavingId(null);
    } else if (type === 'delete') {
      // Remove from list
      updateState({ 
        generatedResults: generatedResults.filter(r => r.id !== image.id) 
      });
      onError("Image deleted.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-black dark:text-white mb-2">Imaginable</h1>
        <p className="text-gray-500 dark:text-gray-400">Transform your ideas into visual reality using state-of-the-art AI.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => updateState({ prompt: e.target.value })}
                className="w-full p-4 bg-silver-100 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-gold-400 min-h-[120px] resize-none text-sm dark:text-white dark:placeholder-gray-500 transition-colors"
                placeholder="A futuristic city with silver towers and golden bridges..."
              />
              <div className="mt-2 flex justify-end">
                <button 
                  onClick={handleEnhancePrompt}
                  disabled={isGenerating || !prompt}
                  className="text-xs font-semibold text-gold-600 hover:text-gold-500 dark:text-gold-500 dark:hover:text-gold-400 flex items-center gap-1"
                >
                  <Wand2 size={12} /> Enhance Prompt
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Reference Images</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {refImages.map((file, idx) => (
                    <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-silver-200 dark:border-zinc-700">
                      <img src={URL.createObjectURL(file)} alt="ref" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeRefImage(idx)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-silver-300 dark:border-zinc-700 flex items-center justify-center cursor-pointer hover:border-gold-400 dark:hover:border-gold-500 hover:bg-gold-50 dark:hover:bg-zinc-800 transition-colors">
                    <Plus size={20} className="text-gray-400 dark:text-gray-500" />
                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Model</label>
                   <div className="relative">
                     <select 
                       value={model}
                       onChange={(e) => updateState({ model: e.target.value })}
                       className="w-full p-3 bg-silver-100 dark:bg-zinc-800 rounded-lg appearance-none text-sm font-medium focus:ring-2 focus:ring-gold-400 outline-none dark:text-white transition-colors"
                     >
                       <option value={ImageModel.GEMINI_FLASH_IMAGE}>Gemini Flash (Fast)</option>
                       <option value={ImageModel.GEMINI_PRO_IMAGE}>Gemini Pro (Quality)</option>
                       <option value={ImageModel.IMAGEN_4}>Imagen 4 (Creative)</option>
                     </select>
                     <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Ratio</label>
                   <div className="relative">
                     <select 
                       value={aspectRatio}
                       onChange={(e) => updateState({ aspectRatio: e.target.value })}
                       className="w-full p-3 bg-silver-100 dark:bg-zinc-800 rounded-lg appearance-none text-sm font-medium focus:ring-2 focus:ring-gold-400 outline-none dark:text-white transition-colors"
                     >
                       {Object.values(AspectRatio).map(r => (
                         <option key={r} value={r}>{aspectRatioLabels[r] || r}</option>
                       ))}
                     </select>
                     <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                   </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Count</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <button 
                      key={n}
                      onClick={() => updateState({ count: n })}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                        count === n 
                        ? 'bg-black text-white dark:bg-gold-500 dark:text-black' 
                        : 'bg-silver-100 text-gray-500 hover:bg-silver-200 dark:bg-zinc-800 dark:text-gray-400 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !prompt}
              variant="gold" 
              className="w-full mt-4"
              icon={isGenerating ? Loader2 : Sparkles}
            >
              {isGenerating ? 'Generating...' : 'Generate Images'}
            </Button>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
           {generatedResults.length === 0 && !isGenerating && (
             <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 border-2 border-dashed border-silver-200 dark:border-zinc-800 rounded-2xl transition-colors">
               <ImageIcon size={64} className="mb-4 text-silver-300 dark:text-zinc-700" />
               <p className="text-lg font-medium">Ready to create masterpieces</p>
             </div>
           )}

           {isGenerating && (
             <div className="mb-6 flex flex-col items-center justify-center p-8 bg-silver-50 dark:bg-zinc-900/50 rounded-xl border border-silver-200 dark:border-zinc-800">
               <Loader2 size={32} className="animate-spin text-gold-500 mb-2" />
               <p className="text-gray-400 dark:text-gray-500 animate-pulse text-sm">Consulting the AI muses...</p>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {generatedResults.map((img) => (
               <div key={img.id} className="group relative bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
                 <img src={img.url} alt="Generated" className="w-full h-auto object-cover" />
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <div className="flex gap-2 justify-end">
                       <button 
                         onClick={() => handleDeleteClick(img)} 
                         className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-all"
                         title="Delete Image"
                       >
                         <Trash2 size={20} />
                       </button>
                       <button 
                         onClick={() => handleUpscale(img)}
                         disabled={upscalingId === img.id}
                         className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-all"
                         title="Upscale to 2K Resolution"
                       >
                         {upscalingId === img.id ? <Loader2 size={20} className="animate-spin" /> : <ChevronsUp size={20} />}
                       </button>
                       <button 
                         onClick={() => setEditingImage(img)} 
                         className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-all"
                         title="Edit Image"
                       >
                         <Sliders size={20} />
                       </button>
                       <button onClick={() => setPreviewImage(img)} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-all">
                         <Maximize2 size={20} />
                       </button>
                       <a href={img.url} download={`kimicode-${img.id}.png`} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-all">
                         <Download size={20} />
                       </a>
                       <button 
                        onClick={() => handleSaveClick(img)} 
                        disabled={savingId === img.id}
                        className="p-2 bg-gold-500 rounded-full text-white hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/50"
                        title="Save to Collection & Cloud"
                       >
                         {savingId === img.id ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                       </button>
                    </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
      
      {/* Full Screen Modal */}
      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)}>
        {previewImage && (
           <img src={previewImage.url} alt="Full view" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl mx-auto block" />
        )}
      </Modal>

      {/* Image Editor Modal */}
      <ImageEditorModal 
        image={editingImage} 
        isOpen={!!editingImage} 
        onClose={() => setEditingImage(null)} 
        onSave={handleSaveEdited}
      />

      {/* Confirmation Modal */}
      <ConfirmDialog 
        isOpen={confirmModal.isOpen}
        title={confirmModal.type === 'save' ? "Save to Cloud?" : "Delete Image?"}
        message={
          confirmModal.type === 'save' 
          ? "This will sync the image to your cloud storage and collection. Continue?" 
          : "Are you sure you want to delete this image? This action cannot be undone."
        }
        confirmText={confirmModal.type === 'save' ? "Save" : "Delete"}
        isDestructive={confirmModal.type === 'delete'}
        onConfirm={executeConfirmAction}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};

// 2. EDITABLE PAGE
const EditablePage = ({ 
  state, setState, onSave, onError 
}: { 
  state: EditableState, 
  setState: React.Dispatch<React.SetStateAction<EditableState>>, 
  onSave: (img: GeneratedImage) => Promise<void>, 
  onError: (msg: string) => void 
}) => {
  const { baseImage, instruction, resultImage } = state;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  
  // Confirmation State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'save' | 'delete';
  }>({ isOpen: false, type: 'save' });

  const updateState = (updates: Partial<EditableState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleEdit = async () => {
    if (!baseImage || !instruction) return;
    setIsProcessing(true);
    try {
      const url = await GeminiService.editImage(baseImage, instruction);
      updateState({
        resultImage: {
          id: Date.now().toString(),
          url,
          prompt: instruction,
          model: ImageModel.GEMINI_FLASH_IMAGE,
          date: Date.now()
        }
      });
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('xhr')) {
        onError("Network error during editing. Please try a smaller image.");
      } else {
        onError("Editing failed. Try a clearer image or instruction.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const executeConfirmAction = async () => {
    setConfirmModal({ ...confirmModal, isOpen: false });
    
    if (confirmModal.type === 'save') {
      if (!resultImage) return;
      setIsSaving(true);
      await onSave(resultImage);
      setIsSaving(false);
    } else if (confirmModal.type === 'delete') {
      updateState({ baseImage: null });
      onError("Image removed from workspace.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-black dark:text-white mb-2">Editable</h1>
        <p className="text-gray-500 dark:text-gray-400">Modify existing images with natural language instructions.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: Input & Reference */}
        <Card className="p-6 flex flex-col gap-6">
          <div className="w-full h-[400px] border-2 border-dashed border-silver-300 dark:border-zinc-700 rounded-xl bg-silver-100 dark:bg-zinc-800 flex items-center justify-center relative overflow-hidden group transition-colors">
            {baseImage ? (
              <>
                 <img src={URL.createObjectURL(baseImage)} alt="Original" className="w-full h-full object-contain" />
                 <button 
                    onClick={() => setConfirmModal({ isOpen: true, type: 'delete' })}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   <Trash2 size={16} />
                 </button>
              </>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gold-500 dark:hover:text-gold-400 transition-colors">
                <Plus size={40} />
                <span className="font-semibold">Upload Image to Edit</span>
                <input type="file" accept="image/*" onChange={(e) => e.target.files && updateState({ baseImage: e.target.files[0] })} className="hidden" />
              </label>
            )}
          </div>
          
          <div className="space-y-4">
             <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Instruction</label>
             <input 
               type="text" 
               value={instruction}
               onChange={(e) => updateState({ instruction: e.target.value })}
               placeholder="e.g. 'Add a red hat to the person' or 'Make it snowy'"
               className="w-full p-4 bg-silver-100 dark:bg-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-gold-400 dark:text-white dark:placeholder-gray-500 transition-colors"
             />
             <Button 
               onClick={handleEdit} 
               disabled={!baseImage || !instruction || isProcessing}
               variant="primary" 
               className="w-full"
               icon={isProcessing ? Loader2 : Edit}
             >
               {isProcessing ? 'Processing...' : 'Edit Image'}
             </Button>
          </div>
        </Card>

        {/* Right Side: Result */}
        <Card className="p-6 flex flex-col gap-6">
           <div className="w-full h-[400px] bg-silver-50 dark:bg-zinc-800 border border-silver-200 dark:border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden transition-colors relative">
             {resultImage ? (
               <div className="relative group w-full h-full flex flex-col items-center justify-center">
                  <img src={resultImage.url} alt="Edited" className="w-full h-full object-contain" />
                  <div className="absolute bottom-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={() => setPreviewImage(resultImage)} className="p-3 bg-black text-white rounded-full shadow-xl hover:scale-110 transition-transform"><Maximize2 size={20} /></button>
                      <a href={resultImage.url} download="kimicode-edit.png" className="p-3 bg-black text-white rounded-full shadow-xl hover:scale-110 transition-transform"><Download size={20} /></a>
                      <button 
                        onClick={() => setConfirmModal({ isOpen: true, type: 'save' })}
                        disabled={isSaving}
                        className="p-3 bg-gold-500 text-white rounded-full shadow-xl hover:scale-110 transition-transform disabled:opacity-70"
                      >
                         {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                      </button>
                  </div>
               </div>
             ) : (
               <div className="text-gray-300 dark:text-gray-600 flex flex-col items-center">
                 <Wand2 size={48} className="mb-2" />
                 <p>Result will appear here</p>
               </div>
             )}
           </div>
        </Card>
      </div>

      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)}>
        {previewImage && <img src={previewImage.url} alt="Full" className="max-w-full max-h-[85vh] rounded-lg mx-auto block" />}
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={confirmModal.isOpen}
        title={confirmModal.type === 'save' ? "Save to Cloud?" : "Remove Image?"}
        message={
          confirmModal.type === 'save' 
          ? "This will save the edited image to your cloud collection. Proceed?" 
          : "This will remove the current image from the workspace."
        }
        confirmText={confirmModal.type === 'save' ? "Save" : "Remove"}
        isDestructive={confirmModal.type === 'delete'}
        onConfirm={executeConfirmAction}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};

// 3. PROMPTABLE PAGE
const PromptablePage = ({ 
  state, setState, onError 
}: { 
  state: PromptableState, 
  setState: React.Dispatch<React.SetStateAction<PromptableState>>, 
  onError: (msg: string) => void 
}) => {
  const { image, generatedPrompt } = state;
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const updateState = (updates: Partial<PromptableState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleAnalyze = async (type: 'image' | 'video') => {
    if (!image) return;
    setIsAnalyzing(true);
    updateState({ generatedPrompt: '' });
    try {
      const text = await GeminiService.analyzeImageForPrompt(image, type);
      updateState({ generatedPrompt: text });
    } catch (e: any) {
      if (e.message?.includes('xhr')) {
        onError("Analysis interrupted. Network unstable.");
      } else {
        onError("Analysis failed. Please try again.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    onError("Copied to clipboard!");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-black dark:text-white mb-2">Promptable</h1>
        <p className="text-gray-500 dark:text-gray-400">Reverse engineer images into detailed prompts for reproduction or video creation.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="p-6 flex flex-col gap-6">
           <div className="flex-1 min-h-[300px] border-2 border-dashed border-silver-300 dark:border-zinc-700 rounded-xl bg-silver-100 dark:bg-zinc-800 flex items-center justify-center relative group transition-colors">
            {image ? (
               <div className="relative w-full h-full">
                  <img src={URL.createObjectURL(image)} alt="Analysis Source" className="w-full h-full object-contain rounded-lg" />
                  <button onClick={() => updateState({ image: null })} className="absolute top-2 right-2 p-2 bg-black/50 text-white hover:bg-red-500 rounded-full transition-colors">
                    <X size={20} />
                  </button>
               </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gold-500 dark:hover:text-gold-400 transition-colors">
                <ImageIcon size={48} />
                <span className="font-semibold">Drop Image for Analysis</span>
                <input type="file" accept="image/*" onChange={(e) => e.target.files && updateState({ image: e.target.files[0] })} className="hidden" />
              </label>
            )}
           </div>

           <div className="flex gap-4">
             <Button 
                onClick={() => handleAnalyze('image')} 
                disabled={!image || isAnalyzing}
                className="flex-1"
                icon={ImageIcon}
             >
               Image Prompt
             </Button>
             <Button 
                onClick={() => handleAnalyze('video')} 
                disabled={!image || isAnalyzing}
                variant="secondary"
                className="flex-1"
                icon={Video}
             >
               Video Prompt
             </Button>
           </div>
        </Card>

        <Card className="p-8 bg-black dark:bg-zinc-900 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-32 bg-gold-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
           <h3 className="text-gold-500 font-bold mb-4 flex items-center gap-2">
             <Sparkles size={18} /> Generated Prompt
           </h3>
           
           <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
             {isAnalyzing ? (
               <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                 <Loader2 size={32} className="animate-spin text-gold-500" />
                 <p className="animate-pulse">Analyzing pixels...</p>
               </div>
             ) : generatedPrompt ? (
               <p className="text-gray-300 leading-relaxed whitespace-pre-wrap font-light text-lg">
                 {generatedPrompt}
               </p>
             ) : (
               <p className="text-gray-600 italic">Upload an image and select a mode to generate a professional prompt.</p>
             )}
           </div>

           {generatedPrompt && (
             <div className="mt-6 flex justify-end">
               <button onClick={copyToClipboard} className="text-sm font-bold text-gold-400 hover:text-white transition-colors">
                 COPY TEXT
               </button>
             </div>
           )}
        </Card>
      </div>
    </div>
  );
};

// 4. ANY 2 TEXT PAGE
const Any2TextPage = ({ 
  state, setState, onError 
}: { 
  state: Any2TextState, 
  setState: React.Dispatch<React.SetStateAction<Any2TextState>>, 
  onError: (msg: string) => void 
}) => {
  const { results } = state;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: File[] = Array.from(e.target.files);
      const newEntries: TextExtractionResult[] = newFiles.map(file => ({
        id: Date.now() + Math.random().toString(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        extractedText: '',
        isLoading: false
      }));
      setState(prev => ({ results: [...newEntries, ...prev.results] }));
    }
  };

  const handleExtract = async (id: string) => {
    const target = results.find(r => r.id === id);
    if (!target) return;

    // Set loading
    setState(prev => ({
      results: prev.results.map(r => r.id === id ? { ...r, isLoading: true } : r)
    }));

    try {
      const text = await GeminiService.extractTextFromFile(target.file);
      setState(prev => ({
        results: prev.results.map(r => r.id === id ? { ...r, extractedText: text, isLoading: false } : r)
      }));
      onError("Content processed successfully!");
    } catch (e) {
      console.error(e);
      setState(prev => ({
        results: prev.results.map(r => r.id === id ? { ...r, isLoading: false } : r)
      }));
      onError("Failed to process file.");
    }
  };

  const handleRemove = (id: string) => {
    setState(prev => ({ results: prev.results.filter(r => r.id !== id) }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    onError("Copied to clipboard!");
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.split('.')[0]}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onError("File downloaded!");
  };

  const renderPreview = (item: TextExtractionResult) => {
    const type = item.file.type;
    if (type.startsWith('image/')) {
      return <img src={item.previewUrl} alt="source" className="w-full h-full object-contain" />;
    }
    if (type.startsWith('video/')) {
      return <video src={item.previewUrl} controls className="w-full h-full object-contain" />;
    }
    if (type.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-gold-500">
          <Music size={64} className="animate-pulse" />
          <audio src={item.previewUrl} controls className="w-64" />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-gray-500">
         <FileIcon size={64} />
         <span className="font-semibold text-sm">{item.file.name}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-black dark:text-white mb-2">Any2Text</h1>
        <p className="text-gray-500 dark:text-gray-400">Extract text and transcribe audio/video using advanced multimodal AI.</p>
      </header>

      {/* Upload Area */}
      <Card className="p-8 border-2 border-dashed border-silver-300 dark:border-zinc-700 bg-silver-50 dark:bg-zinc-800/50 flex flex-col items-center justify-center text-center hover:bg-silver-100 dark:hover:bg-zinc-800 transition-colors">
        <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
           <FileType size={48} className="text-gray-400 dark:text-gray-500 mb-4" />
           <span className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">Click to Upload</span>
           <span className="text-sm text-gray-500">Images, Videos, Audio, PDF (Multiple files allowed)</span>
           <input 
              type="file" 
              multiple 
              accept="image/*,video/*,audio/*,application/pdf,text/plain" 
              onChange={handleFileChange} 
              className="hidden" 
           />
        </label>
      </Card>

      {/* Results List */}
      <div className="space-y-6">
         {results.map((item) => (
           <Card key={item.id} className="p-6 overflow-hidden">
             <div className="grid lg:grid-cols-2 gap-8 items-start">
               {/* Left: Media Viewer & Action */}
               <div className="flex flex-col gap-6">
                 <div className="relative rounded-xl overflow-hidden border border-silver-200 dark:border-zinc-700 bg-silver-100 dark:bg-zinc-800 h-[400px] flex items-center justify-center group">
                    {renderPreview(item)}
                    <button 
                      onClick={() => handleRemove(item.id)}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <Trash2 size={16} />
                    </button>
                 </div>
                 <Button 
                   onClick={() => handleExtract(item.id)}
                   disabled={item.isLoading}
                   variant="gold"
                   className="w-full"
                   icon={item.isLoading ? Loader2 : Sparkles}
                 >
                   {item.isLoading ? 'Processing...' : item.extractedText ? 'Re-Process' : 'Extract / Transcribe'}
                 </Button>
               </div>

               {/* Right: Text Viewer & Actions */}
               <div className="flex flex-col gap-6">
                 <div className="h-[400px] bg-silver-50 dark:bg-zinc-950 rounded-xl border border-silver-200 dark:border-zinc-800 p-4 relative flex flex-col">
                    {item.extractedText ? (
                      <textarea 
                        readOnly
                        value={item.extractedText}
                        className="w-full h-full bg-transparent border-none outline-none resize-none font-mono text-sm text-gray-800 dark:text-gray-300 custom-scrollbar"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                        {item.isLoading ? (
                           <Loader2 size={32} className="animate-spin text-gold-500 mb-2" />
                        ) : (
                           <FileText size={48} className="mb-2 opacity-50" />
                        )}
                        <p>{item.isLoading ? 'Analyzing content...' : 'Extracted text / transcript will appear here'}</p>
                      </div>
                    )}
                 </div>

                 {/* Actions */}
                 <div className="flex justify-end gap-3">
                    <Button 
                      onClick={() => handleCopy(item.extractedText)}
                      disabled={!item.extractedText}
                      variant="secondary"
                      className="flex-1"
                      icon={Copy}
                    >
                      Copy
                    </Button>
                    <Button 
                      onClick={() => handleDownload(item.extractedText, item.file.name)}
                      disabled={!item.extractedText}
                      variant="primary"
                      className="flex-1"
                      icon={Download}
                    >
                      Download .txt
                    </Button>
                 </div>
               </div>
             </div>
           </Card>
         ))}
      </div>
    </div>
  );
};

// 5. COLLECTION PAGE
const CollectionPage = ({ 
  collection, 
  onDelete,
  onError 
}: { 
  collection: GeneratedImage[], 
  onDelete: (id: string) => void,
  onError: (msg: string) => void
}) => {
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    onError("Prompt copied to clipboard");
  };

  const handleDelete = () => {
    if (previewImage) {
      onDelete(previewImage.id);
      setPreviewImage(null);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">Collection</h1>
          <p className="text-gray-500 dark:text-gray-400">Your personal gallery of AI-generated masterpieces.</p>
        </div>
        <div className="text-sm font-bold text-gold-600 dark:text-gold-500">
          {collection.length} ITEMS
        </div>
      </header>

      {collection.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-silver-200 dark:border-zinc-800 transition-colors">
          <Layers size={64} className="text-silver-300 dark:text-zinc-700 mb-6" />
          <h3 className="text-xl font-bold text-gray-400 dark:text-gray-500">Gallery is Empty</h3>
          <p className="text-gray-400 dark:text-gray-600 mt-2">Generate some images to save them here.</p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {collection.map((img) => (
            <div key={img.id} className="break-inside-avoid bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-lg border border-silver-100 dark:border-zinc-800 group relative transition-colors">
              <img src={img.url} alt="Saved" className="w-full h-auto" />
              <div className="absolute top-3 right-3 flex gap-1">
                 {img.isSynced ? (
                   <div className="bg-black/50 backdrop-blur text-white p-1.5 rounded-full" title="Synced to Cloud">
                      <Cloud size={14} />
                   </div>
                 ) : (
                   <div className="bg-gold-500/50 backdrop-blur text-white p-1.5 rounded-full" title="Local Only">
                      <CloudLightning size={14} />
                   </div>
                 )}
              </div>
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-between">
                 <p className="text-white text-xs line-clamp-3 opacity-80">{img.prompt}</p>
                 <div className="flex items-center gap-3 mt-4">
                    <button onClick={() => setPreviewImage(img)} className="flex-1 py-2 bg-white text-black text-xs font-bold rounded hover:bg-gold-400 hover:text-white transition-colors">VIEW</button>
                    <a href={img.url} download={`kimicode-saved-${img.id}.png`} className="p-2 bg-white/20 text-white rounded hover:bg-white hover:text-black transition-colors">
                      <Download size={16} />
                    </a>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Modal View */}
      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)}>
        {previewImage && (
           <div className="bg-white dark:bg-zinc-900 w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col lg:flex-row h-[85vh] lg:h-[700px]">
             
             {/* Left: Image Viewer */}
             <div className="flex-1 bg-black/5 dark:bg-black/40 flex items-center justify-center p-8 lg:border-r border-silver-200 dark:border-zinc-800 relative group">
                <img 
                  src={previewImage.url} 
                  alt="Detail View" 
                  className="max-w-full max-h-full object-contain shadow-xl rounded-lg" 
                />
             </div>

             {/* Right: Details & Actions */}
             <div className="w-full lg:w-[400px] flex flex-col bg-white dark:bg-zinc-900 p-8 border-l border-silver-100 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 flex items-center justify-center">
                     <Sparkles size={20} />
                   </div>
                   <div>
                     <h3 className="text-lg font-bold text-black dark:text-white leading-tight">Prompt Details</h3>
                     <span className="text-xs text-gray-400">Created {new Date(previewImage.date).toLocaleDateString()}</span>
                   </div>
                </div>

                {/* Prompt Text Area */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-silver-50 dark:bg-zinc-950 rounded-xl p-4 border border-silver-100 dark:border-zinc-800 mb-6 shadow-inner">
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {previewImage.prompt}
                  </p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="p-3 bg-silver-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-xs text-gray-400 block mb-1 uppercase tracking-wider">Model</span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate block" title={previewImage.model}>
                        {previewImage.model.split('-')[0]}...
                      </span>
                   </div>
                   <div className="p-3 bg-silver-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-xs text-gray-400 block mb-1 uppercase tracking-wider">Ratio</span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {previewImage.aspectRatio || '1:1'}
                      </span>
                   </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-auto">
                   <Button 
                     onClick={() => handleCopyPrompt(previewImage.prompt)} 
                     variant="secondary" 
                     className="flex-1"
                     icon={Copy}
                   >
                     Copy Prompt
                   </Button>
                   <Button 
                      onClick={() => setShowDeleteConfirm(true)} 
                      variant="danger" 
                      className="px-4"
                      icon={Trash2}
                      title="Delete from Collection"
                   >
                   </Button>
                </div>
             </div>
           </div>
        )}
      </Modal>

      {/* Delete Confirmation inside Collection */}
      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        title="Delete Image?"
        message="Are you sure you want to delete this image from your collection? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
