
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Menu, X, Image as ImageIcon, Wand2, Edit, 
  Download, Save, Maximize2, XCircle, ChevronDown, Plus, 
  Loader2, Sparkles, Layers, Moon, Sun, LogOut,
  LogIn, UserPlus, KeyRound, Settings, User, Mail, Lock, Camera,
  Copy
} from 'lucide-react';
import { 
  GeneratedImage, AppRoute, ImageModel, AspectRatio,
  ImaginableState, EditableState, PromptableState
} from './types';
import * as GeminiService from './services/geminiService';
import * as CloudStorageService from './services/cloudStorageService';

// --- UI Components ---

const Button = ({ 
  onClick, children, variant = 'primary', className = '', disabled = false, icon: Icon, title 
}: any) => {
  const baseStyle = "flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-black text-white hover:bg-zinc-800 shadow-lg hover:shadow-xl dark:bg-blue-500 dark:text-black dark:hover:bg-blue-400",
    secondary: "bg-white text-black border-2 border-gray-100 hover:border-blue-400 hover:text-blue-600 shadow-sm dark:bg-transparent dark:text-slate-200 dark:border-zinc-700 dark:hover:border-blue-500 dark:hover:text-blue-400",
    gold: "bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-blue-400/50 dark:bg-blue-600 dark:hover:bg-blue-500",
    ghost: "text-gray-500 hover:text-black hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-zinc-800",
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
  <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden transition-colors duration-300 ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, children }: any) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <button onClick={onClose} className="absolute top-6 right-6 text-white hover:text-blue-400 transition-colors z-50">
        <XCircle size={40} />
      </button>
      <div className="max-w-7xl w-full max-h-[90vh] overflow-auto relative flex items-center justify-center">
        {children}
      </div>
    </div>,
    document.body
  );
};

const GlobalLogo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeMap = {
    sm: 'w-9 h-9 text-[9px]',
    md: 'w-12 h-12 text-[10px]',
    lg: 'w-16 h-16 text-[11px]'
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeMap[size]} rounded-full bg-blue-600 text-white flex items-center justify-center font-black tracking-[0.3em] pl-1 shadow-lg`}>
        GLOBAL
      </div>
      <div className="leading-tight">
        <p className="text-xs uppercase tracking-[0.4em] text-blue-500 font-semibold">DIGIART</p>
        <p className="text-xl font-black text-black dark:text-white">360°</p>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(AppRoute.LOGIN);
  const [collection, setCollection] = useState<GeneratedImage[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
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

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('digiart_theme');
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
    localStorage.setItem('digiart_theme', theme);
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem('digiart_collection');
    if (saved) {
      try {
        setCollection(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load collection", e);
      }
    }
  }, []);

  useEffect(() => {
    const existingUsers = localStorage.getItem('digiart_users');
    if (!existingUsers) {
      const seededUsers = [
        {
          id: 'default',
          username: 'kimivoltex',
          email: 'kimivoltex@digiart360.io',
          password: 'kimi@1234',
          avatar: ''
        }
      ];
      localStorage.setItem('digiart_users', JSON.stringify(seededUsers));
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const loadUsers = () => {
    const stored = localStorage.getItem('digiart_users');
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  };

  const saveUsers = (users: any[]) => {
    localStorage.setItem('digiart_users', JSON.stringify(users));
  };

  const addToCollection = async (img: GeneratedImage) => {
    showNotification("Saving...");
    try {
      const syncedImage = await CloudStorageService.uploadImageToCloud(img);
      setCollection(prev => {
        const index = prev.findIndex(item => item.id === img.id);
        const updated = index >= 0 ? [...prev] : [syncedImage, ...prev];
        if (index >= 0) updated[index] = syncedImage;
        localStorage.setItem('digiart_collection', JSON.stringify(updated));
        return updated;
      });
      showNotification("Saved to Collectable");
    } catch (e) {
      showNotification("Save failed.");
    }
  };


  const handleLogin = (username: string, password: string) => {
    const users = loadUsers();
    const user = users.find((entry: any) => entry.username === username && entry.password === password);
    if (!user) {
      showNotification("Invalid credentials.");
      return false;
    }
    setIsAuthenticated(true);
    setCurrentUser(user);
    setActiveRoute(AppRoute.CONTROL_PANEL);
    showNotification("Welcome back!");
    return true;
  };

  const handleRegister = (payload: { username: string; email: string; password: string }) => {
    const users = loadUsers();
    if (users.some((entry: any) => entry.username === payload.username || entry.email === payload.email)) {
      showNotification("Account already exists.");
      return false;
    }
    const newUser = { id: Date.now().toString(), avatar: '', ...payload };
    saveUsers([newUser, ...users]);
    showNotification("Registration complete.");
    setActiveRoute(AppRoute.LOGIN);
    return true;
  };

  const handleProfileUpdate = (updates: any) => {
    if (!currentUser) return;
    const users = loadUsers();
    const updatedUser = { ...currentUser, ...updates };
    const updatedUsers = users.map((entry: any) => (entry.id === currentUser.id ? updatedUser : entry));
    saveUsers(updatedUsers);
    setCurrentUser(updatedUser);
    showNotification("Profile updated.");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveRoute(AppRoute.LOGIN);
    showNotification("Logged out.");
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
    if (!isAuthenticated && ![AppRoute.LOGIN, AppRoute.REGISTER, AppRoute.FORGOT_PASSWORD].includes(activeRoute)) {
      return <LoginPage onLogin={handleLogin} onNavigate={setActiveRoute} />;
    }
    if (isAuthenticated && [AppRoute.LOGIN, AppRoute.REGISTER, AppRoute.FORGOT_PASSWORD].includes(activeRoute)) {
      return <ControlPanelPage user={currentUser} onUpdate={handleProfileUpdate} />;
    }
    switch (activeRoute) {
      case AppRoute.LOGIN:
        return <LoginPage onLogin={handleLogin} onNavigate={setActiveRoute} />;
      case AppRoute.REGISTER:
        return <RegisterPage onRegister={handleRegister} onNavigate={setActiveRoute} />;
      case AppRoute.FORGOT_PASSWORD:
        return <ForgotPasswordPage onNavigate={setActiveRoute} onNotify={showNotification} />;
      case AppRoute.CONTROL_PANEL:
        return <ControlPanelPage user={currentUser} onUpdate={handleProfileUpdate} />;
      case AppRoute.IMAGINABLE:
        return <ImaginablePage state={imaginableState} setState={setImaginableState} onSave={addToCollection} onError={showNotification} />;
      case AppRoute.EDITABLE:
        return <EditablePage state={editableState} setState={setEditableState} onSave={addToCollection} onError={showNotification} />;
      case AppRoute.PROMPTABLE:
        return <PromptablePage state={promptableState} setState={setPromptableState} onError={showNotification} />;
      case AppRoute.COLLECTABLE:
        return <CollectablePage collection={collection} onError={showNotification} />;
      case AppRoute.LOGOUT:
        return <LogoutPage onComplete={handleLogout} />;
      default:
        return null;
    }
  };

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-8 px-2">
          <GlobalLogo size="sm" />
          {mobile && (
            <button onClick={() => setIsMobileMenuOpen(false)} className="ml-auto text-gray-500">
              <X size={24} />
            </button>
          )}
        </div>
        
        <nav className="space-y-1">
          {(isAuthenticated
            ? [
                { id: AppRoute.CONTROL_PANEL, icon: Settings, label: 'Control Panel' },
                { id: AppRoute.IMAGINABLE, icon: Sparkles, label: 'Imaginable' },
                { id: AppRoute.EDITABLE, icon: Edit, label: 'Editable' },
                { id: AppRoute.PROMPTABLE, icon: Wand2, label: 'Promptable' },
                { id: AppRoute.COLLECTABLE, icon: Layers, label: 'Collectable' },
                { id: AppRoute.LOGOUT, icon: LogOut, label: 'Logout' }
              ]
            : [
                { id: AppRoute.LOGIN, icon: LogIn, label: 'Login' },
                { id: AppRoute.REGISTER, icon: UserPlus, label: 'Register' },
                { id: AppRoute.FORGOT_PASSWORD, icon: KeyRound, label: 'Forgot Password' }
              ]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => mobile ? handleMobileNavClick(item.id) : setActiveRoute(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                activeRoute === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-slate-100 hover:text-black dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="bg-gradient-to-br from-slate-100 to-white dark:from-zinc-800 dark:to-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 flex justify-between items-center transition-all">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Database</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-xs font-bold text-black dark:text-white">Local Storage Ready</span>
            </div>
          </div>
          
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-white dark:bg-zinc-700 text-black dark:text-blue-300 shadow-md border border-slate-200 dark:border-zinc-600 hover:scale-110 active:scale-95 transition-all"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 flex flex-col font-sans text-gray-800 dark:text-gray-200 transition-colors duration-300">
      <header className="bg-white dark:bg-zinc-900 p-4 flex justify-between items-center shadow-md z-20 sticky top-0">
        <button onClick={() => setIsMobileMenuOpen(true)} className="text-black dark:text-white">
          <Menu size={28} />
        </button>
        <GlobalLogo size="sm" />
        <button onClick={toggleTheme} className="p-2 text-gray-500">
          {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
        </button>
      </header>

      <div className={`fixed inset-0 z-40 transition-opacity ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
        <div className={`absolute top-0 left-0 h-full w-80 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col transform transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <NavContent mobile={true} />
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">{renderContent()}</div>
      </main>

      {notification && (
        <div className="fixed bottom-6 right-6 bg-zinc-900/95 dark:bg-white/95 backdrop-blur text-white dark:text-zinc-900 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <Sparkles size={16} className="text-blue-500" />
          <span className="font-medium text-sm">{notification}</span>
        </div>
      )}
    </div>
  );
}

// 1. LOGIN PAGE
const LoginPage = ({ onLogin, onNavigate }: any) => {
  const [username, setUsername] = useState('kimivoltex');
  const [password, setPassword] = useState('kimi@1234');

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <Card className="p-8 md:p-12">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-6">
            <GlobalLogo size="lg" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-2">Welcome to DIGIART 360°</h1>
              <p className="text-gray-500 dark:text-gray-400">Masuk menggunakan akaun anda untuk meneruskan ke pengalaman kreativiti AI.</p>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Username
                <div className="mt-2 flex items-center gap-3 bg-slate-100 dark:bg-zinc-800 rounded-xl px-4 py-3 border border-transparent focus-within:border-blue-400">
                  <User size={18} className="text-gray-400" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm"
                    placeholder="Masukkan username"
                  />
                </div>
              </label>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Password
                <div className="mt-2 flex items-center gap-3 bg-slate-100 dark:bg-zinc-800 rounded-xl px-4 py-3 border border-transparent focus-within:border-blue-400">
                  <Lock size={18} className="text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm"
                    placeholder="Masukkan password"
                  />
                </div>
              </label>
              <Button onClick={() => onLogin(username, password)} variant="gold" className="w-full" icon={LogIn}>
                Login
              </Button>
              <div className="flex justify-between text-sm text-gray-500">
                <button onClick={() => onNavigate(AppRoute.REGISTER)} className="hover:text-blue-500">Daftar akaun</button>
                <button onClick={() => onNavigate(AppRoute.FORGOT_PASSWORD)} className="hover:text-blue-500">Forgot Password</button>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-8 text-white shadow-2xl">
              <h2 className="text-2xl font-bold mb-4">DIGIART 360°</h2>
              <p className="text-sm text-blue-100 leading-relaxed">
                Platform mesra pengguna untuk menjana imej AI, mengedit, dan menyimpan koleksi kreatif anda dalam satu tempat.
              </p>
              <div className="mt-6 space-y-2 text-xs">
                <p>✅ Username default: <span className="font-semibold">kimivoltex</span></p>
                <p>✅ Password default: <span className="font-semibold">kimi@1234</span></p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// 2. REGISTER PAGE
const RegisterPage = ({ onRegister, onNavigate }: any) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <Card className="p-8 md:p-12 space-y-6">
        <GlobalLogo size="md" />
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Register DIGIART 360°</h1>
          <p className="text-gray-500 dark:text-gray-400">Isi maklumat di bawah untuk mencipta akaun baru.</p>
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Email
            <div className="mt-2 flex items-center gap-3 bg-slate-100 dark:bg-zinc-800 rounded-xl px-4 py-3 border border-transparent focus-within:border-blue-400">
              <Mail size={18} className="text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="contoh@digiart360.io"
              />
            </div>
          </label>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Username
            <div className="mt-2 flex items-center gap-3 bg-slate-100 dark:bg-zinc-800 rounded-xl px-4 py-3 border border-transparent focus-within:border-blue-400">
              <User size={18} className="text-gray-400" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="pilih username"
              />
            </div>
          </label>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Password
            <div className="mt-2 flex items-center gap-3 bg-slate-100 dark:bg-zinc-800 rounded-xl px-4 py-3 border border-transparent focus-within:border-blue-400">
              <Lock size={18} className="text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="kata laluan"
              />
            </div>
          </label>
          <Button
            onClick={() => onRegister({ email, username, password })}
            variant="gold"
            className="w-full"
            icon={UserPlus}
          >
            Register
          </Button>
          <button onClick={() => onNavigate(AppRoute.LOGIN)} className="text-sm text-gray-500 hover:text-blue-500">
            Sudah ada akaun? Login di sini.
          </button>
        </div>
      </Card>
    </div>
  );
};

// 3. FORGOT PASSWORD PAGE
const ForgotPasswordPage = ({ onNavigate, onNotify }: any) => {
  const [email, setEmail] = useState('');

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <Card className="p-8 md:p-12 space-y-6">
        <GlobalLogo size="md" />
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Forgot Password</h1>
          <p className="text-gray-500 dark:text-gray-400">Masukkan email untuk proses reset password.</p>
        </div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Email
          <div className="mt-2 flex items-center gap-3 bg-slate-100 dark:bg-zinc-800 rounded-xl px-4 py-3 border border-transparent focus-within:border-blue-400">
            <Mail size={18} className="text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
              placeholder="contoh@digiart360.io"
            />
          </div>
        </label>
        <Button
          onClick={() => onNotify('Reset link dihantar (demo).')}
          variant="gold"
          className="w-full"
          icon={KeyRound}
        >
          Reset Password
        </Button>
        <button onClick={() => onNavigate(AppRoute.LOGIN)} className="text-sm text-gray-500 hover:text-blue-500">
          Kembali ke login
        </button>
      </Card>
    </div>
  );
};

// 4. CONTROL PANEL PAGE
const ControlPanelPage = ({ user, onUpdate }: any) => {
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState(user?.password || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  useEffect(() => {
    setUsername(user?.username || '');
    setEmail(user?.email || '');
    setPassword(user?.password || '');
    setAvatar(user?.avatar || '');
  }, [user]);

  const handleAvatarChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-4xl font-bold text-black dark:text-white mb-2">Control Panel</h1>
        <p className="text-gray-500 dark:text-gray-400">Urus maklumat profil anda dengan cepat dan mudah.</p>
      </header>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Profile Photo</p>
          <div className="flex flex-col items-center gap-4">
            <div className="w-28 h-28 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-zinc-700">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-gray-400" />
              )}
            </div>
            <label className="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
              <Camera size={16} />
              Tukar gambar profile
              <input type="file" accept="image/*" onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)} className="hidden" />
            </label>
          </div>
        </Card>
        <Card className="p-6 lg:col-span-2 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Profile Settings</p>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-xl px-4 py-3 outline-none border border-transparent focus:border-blue-400"
              />
            </label>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-xl px-4 py-3 outline-none border border-transparent focus:border-blue-400"
              />
            </label>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 md:col-span-2">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-xl px-4 py-3 outline-none border border-transparent focus:border-blue-400"
              />
            </label>
          </div>
          <Button onClick={() => onUpdate({ username, email, password, avatar })} variant="gold" className="w-full" icon={Settings}>
            Save Changes
          </Button>
        </Card>
      </div>
    </div>
  );
};

// 5. LOGOUT PAGE
const LogoutPage = ({ onComplete }: any) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 20;
      });
    }, 300);
    const timer = window.setTimeout(() => {
      onComplete();
    }, 1800);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <Card className="p-10 md:p-12 text-center space-y-6">
        <div className="flex justify-center">
          <GlobalLogo size="lg" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Logging out...</h1>
          <p className="text-gray-500 dark:text-gray-400">Terima kasih menggunakan DIGIART 360°.</p>
        </div>
        <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </Card>
    </div>
  );
};

// 6. IMAGINABLE PAGE
const ImaginablePage = ({ state, setState, onSave, onError }: any) => {
  const { prompt, model, aspectRatio, count, generatedResults, refImages } = state;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [previewImage, setPreviewImage] = useState<any>(null);
  const maxRefImages = 5;

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
    if (!e.target.files || e.target.files.length === 0) return;
    const incoming = Array.from(e.target.files);
    const combined = [...refImages, ...incoming];
    if (combined.length > maxRefImages) {
      onError(`Maximum ${maxRefImages} images allowed.`);
    }
    updateState({ refImages: combined.slice(0, maxRefImages) });
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
        <p className="text-gray-500 dark:text-gray-400">Janakan imej AI menggunakan prompt terbaik anda.</p>
      </header>
      
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Attachment Images</h3>
            <span className="text-xs text-gray-400">{refImages.length}/{maxRefImages}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {refImages.map((file: File, idx: number) => (
              <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700">
                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeRefImage(idx)}
                  className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {refImages.length < maxRefImages && (
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors text-gray-400">
                <Plus size={20} />
                <input type="file" multiple accept="image/*" onChange={handleRefImageChange} className="hidden" />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-400">Upload sehingga 5 imej untuk rujukan.</p>
        </Card>

        <Card className="p-6 min-h-[360px] flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/20">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-blue-400/20 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
              <p className="text-gray-400 font-medium tracking-tight">Sedang menjana imej...</p>
            </div>
          ) : generatedResults.length > 0 ? (
            <div className="w-full h-full overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedResults.map((img: any) => (
                  <div key={img.id} className="group relative bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-xl border border-slate-100 dark:border-zinc-800 hover:shadow-blue-500/20 transition-all">
                    <img src={img.url} alt="Generated" className="w-full h-auto object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                      <button onClick={() => { onSave(img); }} title="Save" className="p-3 bg-blue-500 rounded-full text-white shadow-lg hover:scale-110 active:scale-95 transition-all">
                        <Save size={18} />
                      </button>
                      <a href={img.url} download={`digiart-${img.id}.png`} title="Download" className="p-3 bg-white rounded-full text-black shadow-lg hover:scale-110 active:scale-95 transition-all">
                        <Download size={18} />
                      </a>
                      <button onClick={() => setPreviewImage(img)} title="View Large" className="p-3 bg-white rounded-full text-black shadow-lg hover:scale-110 active:scale-95 transition-all">
                        <Maximize2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-slate-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto text-slate-300 dark:text-zinc-700">
                <ImageIcon size={40} />
              </div>
              <p className="text-slate-400 dark:text-zinc-600 font-semibold text-base tracking-tight">Result imej akan muncul di sini</p>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Prompt</label>
          <div className="relative">
            <textarea 
              value={prompt}
              onChange={(e) => updateState({ prompt: e.target.value })}
              className="w-full p-4 bg-slate-100 dark:bg-zinc-800 rounded-xl min-h-[140px] outline-none text-sm dark:text-white dark:placeholder-gray-500 transition-colors resize-none border-2 border-transparent focus:border-blue-400"
              placeholder="Contoh: sebuah kota futuristik dengan lampu neon biru."
            />
            <button 
              onClick={handleEnhance}
              disabled={!prompt || isEnhancing}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors disabled:opacity-50"
            >
              {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={14} />}
              Enhance Prompt
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Model</label>
            <div className="relative">
              <select 
                value={model}
                onChange={(e) => updateState({ model: e.target.value })}
                className="w-full appearance-none bg-slate-100 dark:bg-zinc-800 p-3 rounded-lg text-xs font-bold outline-none border border-transparent focus:border-blue-400 dark:text-white"
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
                className="w-full appearance-none bg-slate-100 dark:bg-zinc-800 p-3 rounded-lg text-xs font-bold outline-none border border-transparent focus:border-blue-400 dark:text-white"
              >
                <option value={AspectRatio.SQUARE}>Square (1:1)</option>
                <option value={AspectRatio.LANDSCAPE}>Landscape (16:9)</option>
                <option value={AspectRatio.PORTRAIT}>Portrait (9:16)</option>
                <option value={AspectRatio.STANDARD}>Standard (4:3)</option>
                <option value={AspectRatio.TALL}>Standard Portrait (3:4)</option>
                <option value={AspectRatio.LANDSCAPE_3_2}>Classic (3:2)</option>
                <option value={AspectRatio.PORTRAIT_2_3}>Classic (2:3)</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Count</label>
            <div className="relative">
              <select 
                value={count}
                onChange={(e) => updateState({ count: Number(e.target.value) })}
                className="w-full appearance-none bg-slate-100 dark:bg-zinc-800 p-3 rounded-lg text-xs font-bold outline-none border border-transparent focus:border-blue-400 dark:text-white"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
          </div>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || !prompt} 
          variant="gold" 
          className="w-full py-4 text-white"
          icon={isGenerating ? Loader2 : Sparkles}
        >
          {isGenerating ? 'Generating...' : 'Generate Images'}
        </Button>
      </Card>

      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)}>
        {previewImage && (
          <div className="bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <img src={previewImage.url} className="max-w-full max-h-[85vh] rounded-xl" />
            <div className="p-4 flex justify-between items-center">
               <p className="text-sm text-gray-500 dark:text-gray-400 italic line-clamp-1 max-w-[70%]">"{previewImage.prompt}"</p>
               <div className="flex gap-3">
                  <a href={previewImage.url} download className="text-black dark:text-white hover:text-blue-500 transition-colors"><Download size={20} /></a>
                  <button onClick={() => onSave(previewImage)} className="text-black dark:text-white hover:text-blue-500 transition-colors"><Save size={20} /></button>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// 7. EDITABLE PAGE
const EditablePage = ({ state, setState, onSave, onError }: any) => {
  const { baseImage, instruction, resultImage } = state;
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<any>(null);
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
            <div className="w-full h-[400px] border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center relative overflow-hidden group transition-all duration-300">
              {baseImage ? (
                <>
                  <img src={URL.createObjectURL(baseImage as Blob)} alt="Original" className="w-full h-full object-contain" />
                  <button onClick={() => updateState({ baseImage: null })} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"><X size={16} /></button>
                </>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500 hover:text-blue-500 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center"><Plus size={32} /></div>
                  <span className="font-bold tracking-tight">Upload Image to Edit</span>
                  <input type="file" accept="image/*" onChange={(e) => e.target.files && updateState({ baseImage: e.target.files[0] })} className="hidden" />
                </label>
              )}
            </div>
          </Card>

          {/* Instruction Section - Positioned at the bottom of the column below the image */}
          <Card className="p-8 border-2 border-transparent hover:border-blue-500/20 transition-all">
             <div className="space-y-6">
               <div>
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Instruction</label>
                 <div className="flex flex-col gap-4">
                   <input 
                     type="text" 
                     value={instruction} 
                     onChange={(e) => updateState({ instruction: e.target.value })} 
                     placeholder="e.g. 'Add a red hat to the person' or 'Make it snowy'" 
                     className="w-full p-4 bg-slate-100 dark:bg-zinc-800 rounded-xl outline-none border-2 border-transparent focus:border-blue-400 dark:text-white dark:placeholder-gray-500 transition-all" 
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
           <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-100 dark:border-zinc-800 transition-colors relative overflow-hidden">
             {resultImage ? (
               <>
                 <img src={resultImage.url} alt="Result" className="w-full h-full object-contain animate-in fade-in duration-500" />
                 <div className="absolute bottom-4 right-4 flex gap-2">
                    <button onClick={() => onSave(resultImage)} className="p-3 bg-blue-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"><Save size={20} /></button>
                    <a href={resultImage.url} download className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"><Download size={20} /></a>
                    <button onClick={() => setPreviewImage(resultImage)} className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"><Maximize2 size={20} /></button>
                 </div>
               </>
             ) : (
               <div className="text-gray-300 dark:text-gray-700 flex flex-col items-center gap-2">
                 <div className="w-20 h-20 bg-slate-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mb-2"><Wand2 size={40} /></div>
                 <p className="font-bold tracking-tight">Result will appear here</p>
               </div>
             )}
             {isProcessing && (
               <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in">
                  <Loader2 className="animate-spin text-blue-500" size={48} />
                  <p className="text-black dark:text-white font-bold">Applying changes...</p>
               </div>
             )}
           </div>
        </Card>
     </div>

      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)}>
        {previewImage && (
          <div className="bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <img src={previewImage.url} className="max-w-full max-h-[85vh] rounded-xl" />
            <div className="p-4 flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 italic line-clamp-1 max-w-[70%]">"{previewImage.prompt}"</p>
              <div className="flex gap-3">
                <a href={previewImage.url} download className="text-black dark:text-white hover:text-blue-500 transition-colors"><Download size={20} /></a>
                <button onClick={() => onSave(previewImage)} className="text-black dark:text-white hover:text-blue-500 transition-colors"><Save size={20} /></button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// 8. PROMPTABLE PAGE
const PromptablePage = ({ state, setState, onError }: any) => {
  const { image, generatedPrompt } = state;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const updateState = (updates: any) => setState((prev: any) => ({ ...prev, ...updates }));

  const handleAnalyze = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const text = await GeminiService.analyzeImageForPrompt(image, 'image');
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
        <h1 className="text-4xl font-bold mb-2 text-black dark:text-white">Promptable</h1>
        <p className="text-gray-500 dark:text-gray-400">Janakan prompt ringkas daripada imej yang diupload.</p>
      </header>
      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="p-6 space-y-6">
          <div className="h-[360px] border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl flex items-center justify-center relative overflow-hidden bg-slate-100 dark:bg-zinc-800">
            {image ? (
               <>
                 <img src={URL.createObjectURL(image as Blob)} className="h-full object-contain" />
                 <button onClick={() => updateState({ image: null })} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"><X size={16} /></button>
               </>
            ) : (
               <label className="cursor-pointer flex flex-col items-center gap-3 text-gray-400 hover:text-blue-500 transition-colors">
                  <input type="file" accept="image/*" onChange={(e) => e.target.files && updateState({ image: e.target.files[0] })} className="hidden" />
                  <ImageIcon size={64} className="mb-2" />
                  <span className="font-bold">Upload Image</span>
               </label>
            )}
          </div>
          <Button onClick={handleAnalyze} disabled={!image || isAnalyzing} variant="gold" className="w-full" icon={isAnalyzing ? Loader2 : Wand2}>
            {isAnalyzing ? 'Analyzing...' : 'Generate Prompt'}
          </Button>
        </Card>
        <Card className="p-8 bg-white dark:bg-zinc-900 min-h-[360px] flex flex-col border border-slate-200 dark:border-zinc-800 shadow-2xl relative">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-blue-500 font-black tracking-widest uppercase text-xs">Prompt Result</h3>
              {generatedPrompt && <button onClick={() => { navigator.clipboard.writeText(generatedPrompt); onError("Copied!"); }} className="text-gray-400 hover:text-blue-500 transition-colors"><Copy size={18} /></button>}
           </div>
           <div className="flex-1 flex flex-col justify-center">
             {isAnalyzing ? (
               <div className="flex flex-col items-center gap-4 animate-pulse">
                 <Loader2 className="animate-spin text-blue-500" size={40} />
                 <p className="text-gray-400 text-sm">Sedang menganalisis imej...</p>
               </div>
             ) : (
               <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
                 {generatedPrompt || 'Upload imej dan tekan butang Generate Prompt.'}
               </p>
             )}
           </div>
        </Card>
      </div>
    </div>
  );
};

// 9. COLLECTABLE PAGE
const CollectablePage = ({ collection, onError }: any) => {
  const [previewImage, setPreviewImage] = useState<any>(null);
  
  const handleDownload = (img: any) => {
     const link = document.createElement('a');
     link.href = img.url;
     link.download = `digiart-${img.id}.png`;
     link.click();
     onError("Download started.");
  };

  const handleCopy = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    onError("Prompt copied.");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-slate-200 dark:border-zinc-800 pb-6 gap-4">
         <div>
            <h1 className="text-4xl font-bold text-black dark:text-white">Collectable</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Koleksi imej AI yang telah disimpan bersama prompt.</p>
         </div>
         <div className="flex flex-col items-start md:items-end">
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest">Items</span>
            <div className="text-2xl font-black text-black dark:text-white">{collection.length} <span className="text-xs font-medium text-gray-400">SAVED</span></div>
         </div>
      </header>
      
      {collection.length === 0 ? (
        <div className="py-32 flex flex-col items-center text-gray-300 dark:text-zinc-800">
           <div className="w-24 h-24 rounded-full border-4 border-current flex items-center justify-center mb-6 opacity-20">
              <Layers size={48} />
           </div>
           <p className="text-xl font-bold">Belum ada koleksi</p>
           <p className="text-sm mt-2 opacity-50">Mulakan janaan di Imaginable.</p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {collection.map((img: any) => (
            <div key={img.id} className="break-inside-avoid group relative bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-zinc-800 animate-in fade-in duration-500 hover:shadow-2xl transition-all">
              <img src={img.url} className="w-full h-auto object-cover" />
              <div className="p-4 space-y-3">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Prompt</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 italic">"{img.prompt}"</p>
                <div className="flex gap-2">
                  <button onClick={() => setPreviewImage(img)} className="flex-1 py-2 bg-slate-100 text-gray-800 text-xs font-bold rounded-lg hover:bg-blue-500 hover:text-white transition-all">VIEW LARGE</button>
                  <button onClick={() => handleDownload(img)} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all" title="Download"><Download size={16} /></button>
                  <button onClick={() => handleCopy(img.prompt)} className="p-2 bg-slate-200 text-gray-700 rounded-lg hover:bg-blue-500 hover:text-white transition-all" title="Copy Prompt"><Copy size={16} /></button>
                </div>
              </div>
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
                     <button onClick={() => handleDownload(previewImage)} className="flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-blue-500 dark:text-black rounded-lg text-xs font-bold hover:scale-105 transition-all"><Download size={14} /> Download</button>
                     <button onClick={() => handleCopy(previewImage.prompt)} className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-black rounded-lg text-xs font-bold hover:scale-105 transition-all"><Copy size={14} /> Copy Prompt</button>
                  </div>
               </div>
               <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-100 dark:border-zinc-800">
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">"{previewImage.prompt}"</p>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
