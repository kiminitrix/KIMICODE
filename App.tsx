import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, X, Image as ImageIcon, Wand2, Edit, PlaySquare, 
  Download, Save, Maximize2, XCircle, ChevronDown, Plus, 
  Trash2, Loader2, Sparkles, Layers, Video, Film
} from 'lucide-react';
import { 
  GeneratedImage, AppRoute, ImageModel, AspectRatio 
} from './types';
import * as GeminiService from './services/geminiService';

// --- UI Components ---

const Button = ({ 
  onClick, children, variant = 'primary', className = '', disabled = false, icon: Icon 
}: any) => {
  const baseStyle = "flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-black text-white hover:bg-zinc-800 shadow-lg hover:shadow-xl",
    secondary: "bg-white text-black border-2 border-gray-100 hover:border-gold-400 hover:text-gold-600 shadow-sm",
    gold: "bg-gold-500 text-white hover:bg-gold-600 shadow-lg hover:shadow-gold-400/50",
    ghost: "text-gray-500 hover:text-black hover:bg-silver-100"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-2xl border border-silver-200 shadow-xl shadow-silver-200/50 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <button onClick={onClose} className="absolute top-6 right-6 text-white hover:text-gold-400 transition-colors">
        <XCircle size={40} />
      </button>
      <div className="max-w-7xl max-h-[90vh] overflow-auto">
        {children}
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(AppRoute.IMAGINABLE);
  const [collection, setCollection] = useState<GeneratedImage[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Load collection from local storage on mount
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

  // Save collection handler
  const addToCollection = (img: GeneratedImage) => {
    const updated = [img, ...collection];
    setCollection(updated);
    localStorage.setItem('kimicode_collection', JSON.stringify(updated));
    showNotification("Saved to Collection");
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Render Page Switcher
  const renderContent = () => {
    switch (activeRoute) {
      case AppRoute.IMAGINABLE:
        return <ImaginablePage onSave={addToCollection} />;
      case AppRoute.EDITABLE:
        return <EditablePage onSave={addToCollection} />;
      case AppRoute.PROMPTABLE:
        return <PromptablePage />;
      case AppRoute.COLLECTION:
        return <CollectionPage collection={collection} />;
      default:
        return <ImaginablePage onSave={addToCollection} />;
    }
  };

  return (
    <div className="min-h-screen bg-silver-100 flex flex-col md:flex-row font-sans text-gray-800">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white p-4 flex justify-between items-center shadow-md z-20 sticky top-0">
        <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
          <span className="bg-gradient-to-br from-gold-400 to-gold-600 text-transparent bg-clip-text">KIMI</span>
          <span className="text-black">CODE</span>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-silver-200 h-screen sticky top-0 z-30">
        <div className="p-8">
          <div className="text-3xl font-black tracking-tighter flex items-center gap-2 mb-10">
             <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white">K</div>
             <div className="flex flex-col leading-none">
               <span className="text-black text-lg">KIMI</span>
               <span className="text-gold-500 text-sm">CODE</span>
             </div>
          </div>
          
          <nav className="space-y-2">
            {[
              { id: AppRoute.IMAGINABLE, icon: Sparkles, label: 'Imaginable' },
              { id: AppRoute.EDITABLE, icon: Edit, label: 'Editable' },
              { id: AppRoute.PROMPTABLE, icon: Wand2, label: 'Promptable' },
              { id: AppRoute.COLLECTION, icon: Layers, label: 'Collection' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveRoute(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  activeRoute === item.id
                    ? 'bg-black text-white shadow-lg shadow-black/20'
                    : 'text-gray-500 hover:bg-silver-100 hover:text-black'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-silver-100">
          <div className="bg-gradient-to-br from-silver-100 to-white p-4 rounded-xl border border-silver-200">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-medium text-black">Systems Operational</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen scroll-smooth">
         {/* Mobile Nav Tabs */}
         <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2 scrollbar-hide">
            {[
              { id: AppRoute.IMAGINABLE, label: 'Imagine' },
              { id: AppRoute.EDITABLE, label: 'Edit' },
              { id: AppRoute.PROMPTABLE, label: 'Prompt' },
              { id: AppRoute.COLLECTION, label: 'Gallery' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveRoute(item.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold ${
                  activeRoute === item.id
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-500 border border-silver-200'
                }`}
              >
                {item.label}
              </button>
            ))}
         </div>

        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-6 py-3 rounded-lg shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <Sparkles size={16} className="text-gold-400" />
          {notification}
        </div>
      )}
    </div>
  );
}

// --- Sub-Pages ---

// 1. IMAGINABLE PAGE
const ImaginablePage = ({ onSave }: { onSave: (img: GeneratedImage) => void }) => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<string>(ImageModel.GEMINI_FLASH_IMAGE);
  const [aspectRatio, setAspectRatio] = useState<string>(AspectRatio.SQUARE);
  const [count, setCount] = useState<number>(1);
  const [refImages, setRefImages] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<GeneratedImage[]>([]);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setRefImages([...refImages, ...Array.from(e.target.files)]);
    }
  };

  const removeRefImage = (index: number) => {
    setRefImages(refImages.filter((_, i) => i !== index));
  };

  const handleEnhancePrompt = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    const newPrompt = await GeminiService.enhancePrompt(prompt);
    setPrompt(newPrompt);
    setIsGenerating(false);
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGeneratedResults([]);

    try {
      // Loop for multiple images if count > 1 (simulated batching for APIs that don't support batch)
      const batchPromises = [];
      for (let i = 0; i < count; i++) {
        batchPromises.push(GeminiService.generateImage(model, prompt, aspectRatio, refImages));
      }

      const resultsNested = await Promise.all(batchPromises);
      const allImages = resultsNested.flat();

      const newImages: GeneratedImage[] = allImages.map(url => ({
        id: Date.now().toString() + Math.random().toString(),
        url,
        prompt,
        model,
        date: Date.now(),
        aspectRatio
      }));

      setGeneratedResults(newImages);
    } catch (error) {
      alert("Generation failed. Please try again or check your API limit.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-black mb-2">Imaginable</h1>
        <p className="text-gray-500">Transform your ideas into visual reality using state-of-the-art AI.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-4 bg-silver-100 rounded-xl border-none focus:ring-2 focus:ring-gold-400 min-h-[120px] resize-none text-sm"
                placeholder="A futuristic city with silver towers and golden bridges..."
              />
              <div className="mt-2 flex justify-end">
                <button 
                  onClick={handleEnhancePrompt}
                  disabled={isGenerating || !prompt}
                  className="text-xs font-semibold text-gold-600 hover:text-gold-500 flex items-center gap-1"
                >
                  <Wand2 size={12} /> Enhance Prompt
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Reference Images</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {refImages.map((file, idx) => (
                    <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-silver-200">
                      <img src={URL.createObjectURL(file)} alt="ref" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeRefImage(idx)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-silver-300 flex items-center justify-center cursor-pointer hover:border-gold-400 hover:bg-gold-50 transition-colors">
                    <Plus size={20} className="text-gray-400" />
                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Model</label>
                   <div className="relative">
                     <select 
                       value={model}
                       onChange={(e) => setModel(e.target.value)}
                       className="w-full p-3 bg-silver-100 rounded-lg appearance-none text-sm font-medium focus:ring-2 focus:ring-gold-400 outline-none"
                     >
                       <option value={ImageModel.GEMINI_FLASH_IMAGE}>Gemini Flash (Fast)</option>
                       <option value={ImageModel.GEMINI_PRO_IMAGE}>Gemini Pro (Quality)</option>
                       <option value={ImageModel.IMAGEN_4}>Imagen 4 (Creative)</option>
                     </select>
                     <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Ratio</label>
                   <div className="relative">
                     <select 
                       value={aspectRatio}
                       onChange={(e) => setAspectRatio(e.target.value)}
                       className="w-full p-3 bg-silver-100 rounded-lg appearance-none text-sm font-medium focus:ring-2 focus:ring-gold-400 outline-none"
                     >
                       {Object.values(AspectRatio).map(r => (
                         <option key={r} value={r}>{r}</option>
                       ))}
                     </select>
                     <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                   </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Count</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <button 
                      key={n}
                      onClick={() => setCount(n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                        count === n ? 'bg-black text-white' : 'bg-silver-100 text-gray-500 hover:bg-silver-200'
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
             <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-silver-200 rounded-2xl">
               <ImageIcon size={64} className="mb-4 text-silver-300" />
               <p className="text-lg font-medium">Ready to create masterpieces</p>
             </div>
           )}

           {isGenerating && generatedResults.length === 0 && (
             <div className="h-full min-h-[400px] flex flex-col items-center justify-center">
               <Loader2 size={48} className="animate-spin text-gold-500 mb-4" />
               <p className="text-gray-400 animate-pulse">Consulting the AI muses...</p>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {generatedResults.map((img) => (
               <div key={img.id} className="group relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
                 <img src={img.url} alt="Generated" className="w-full h-auto object-cover" />
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <div className="flex gap-2 justify-end">
                       <button onClick={() => setPreviewImage(img)} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-all">
                         <Maximize2 size={20} />
                       </button>
                       <a href={img.url} download={`kimicode-${img.id}.png`} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-all">
                         <Download size={20} />
                       </a>
                       <button onClick={() => onSave(img)} className="p-2 bg-gold-500 rounded-full text-white hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/50">
                         <Save size={20} />
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
           <img src={previewImage.url} alt="Full view" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
        )}
      </Modal>
    </div>
  );
};

// 2. EDITABLE PAGE
const EditablePage = ({ onSave }: { onSave: (img: GeneratedImage) => void }) => {
  const [baseImage, setBaseImage] = useState<File | null>(null);
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<GeneratedImage | null>(null);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);

  const handleEdit = async () => {
    if (!baseImage || !instruction) return;
    setIsProcessing(true);
    try {
      const url = await GeminiService.editImage(baseImage, instruction);
      setResultImage({
        id: Date.now().toString(),
        url,
        prompt: instruction,
        model: ImageModel.GEMINI_FLASH_IMAGE,
        date: Date.now()
      });
    } catch (e) {
      alert("Editing failed. Try a clearer image or instruction.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-black mb-2">Editable</h1>
        <p className="text-gray-500">Modify existing images with natural language instructions.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="p-6 flex flex-col gap-6">
          <div className="flex-1 min-h-[300px] border-2 border-dashed border-silver-300 rounded-xl bg-silver-100 flex items-center justify-center relative overflow-hidden group">
            {baseImage ? (
              <>
                 <img src={URL.createObjectURL(baseImage)} alt="Original" className="w-full h-full object-contain" />
                 <button onClick={() => setBaseImage(null)} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                   <Trash2 size={16} />
                 </button>
              </>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-2 text-gray-400 hover:text-gold-500 transition-colors">
                <Plus size={40} />
                <span className="font-semibold">Upload Image to Edit</span>
                <input type="file" accept="image/*" onChange={(e) => e.target.files && setBaseImage(e.target.files[0])} className="hidden" />
              </label>
            )}
          </div>
          
          <div className="space-y-4">
             <label className="block text-sm font-bold text-gray-700">Instruction</label>
             <input 
               type="text" 
               value={instruction}
               onChange={(e) => setInstruction(e.target.value)}
               placeholder="e.g. 'Add a red hat to the person' or 'Make it snowy'"
               className="w-full p-4 bg-silver-100 rounded-xl outline-none focus:ring-2 focus:ring-gold-400"
             />
             <Button 
               onClick={handleEdit} 
               disabled={!baseImage || !instruction || isProcessing}
               variant="primary" 
               className="w-full"
               icon={isProcessing ? Loader2 : Edit}
             >
               {isProcessing ? 'Processing...' : 'Apply Edits'}
             </Button>
          </div>
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center min-h-[500px] bg-silver-50">
           {resultImage ? (
             <div className="relative group w-full h-full flex flex-col items-center justify-center">
                <img src={resultImage.url} alt="Edited" className="max-h-[500px] object-contain rounded-lg shadow-lg" />
                <div className="absolute bottom-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setPreviewImage(resultImage)} className="p-3 bg-black text-white rounded-full shadow-xl hover:scale-110 transition-transform"><Maximize2 size={20} /></button>
                    <a href={resultImage.url} download="kimicode-edit.png" className="p-3 bg-black text-white rounded-full shadow-xl hover:scale-110 transition-transform"><Download size={20} /></a>
                    <button onClick={() => onSave(resultImage)} className="p-3 bg-gold-500 text-white rounded-full shadow-xl hover:scale-110 transition-transform"><Save size={20} /></button>
                </div>
             </div>
           ) : (
             <div className="text-gray-300 flex flex-col items-center">
               <Wand2 size={48} className="mb-2" />
               <p>Result will appear here</p>
             </div>
           )}
        </Card>
      </div>

      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)}>
        {previewImage && <img src={previewImage.url} alt="Full" className="max-w-full max-h-[85vh] rounded-lg" />}
      </Modal>
    </div>
  );
};

// 3. PROMPTABLE PAGE
const PromptablePage = () => {
  const [image, setImage] = useState<File | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async (type: 'image' | 'video') => {
    if (!image) return;
    setIsAnalyzing(true);
    setGeneratedPrompt('');
    try {
      const text = await GeminiService.analyzeImageForPrompt(image, type);
      setGeneratedPrompt(text);
    } catch (e) {
      alert("Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    alert("Copied to clipboard!");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-black mb-2">Promptable</h1>
        <p className="text-gray-500">Reverse engineer images into detailed prompts for reproduction or video creation.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="p-6 flex flex-col gap-6">
           <div className="flex-1 min-h-[300px] border-2 border-dashed border-silver-300 rounded-xl bg-silver-100 flex items-center justify-center relative group">
            {image ? (
               <div className="relative w-full h-full">
                  <img src={URL.createObjectURL(image)} alt="Analysis Source" className="w-full h-full object-contain rounded-lg" />
                  <button onClick={() => setImage(null)} className="absolute top-2 right-2 p-2 bg-black/50 text-white hover:bg-red-500 rounded-full transition-colors">
                    <X size={20} />
                  </button>
               </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-2 text-gray-400 hover:text-gold-500 transition-colors">
                <ImageIcon size={48} />
                <span className="font-semibold">Drop Image for Analysis</span>
                <input type="file" accept="image/*" onChange={(e) => e.target.files && setImage(e.target.files[0])} className="hidden" />
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

        <Card className="p-8 bg-black text-white relative overflow-hidden">
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

// 4. COLLECTION PAGE
const CollectionPage = ({ collection }: { collection: GeneratedImage[] }) => {
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-black mb-2">Collection</h1>
          <p className="text-gray-500">Your personal gallery of AI-generated masterpieces.</p>
        </div>
        <div className="text-sm font-bold text-gold-600">
          {collection.length} ITEMS
        </div>
      </header>

      {collection.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-silver-200">
          <Layers size={64} className="text-silver-300 mb-6" />
          <h3 className="text-xl font-bold text-gray-400">Gallery is Empty</h3>
          <p className="text-gray-400 mt-2">Generate some images to save them here.</p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {collection.map((img) => (
            <div key={img.id} className="break-inside-avoid bg-white rounded-xl overflow-hidden shadow-lg border border-silver-100 group relative">
              <img src={img.url} alt="Saved" className="w-full h-auto" />
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

      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)}>
        {previewImage && <img src={previewImage.url} alt="Full" className="max-w-full max-h-[85vh] rounded-lg" />}
      </Modal>
    </div>
  );
};
