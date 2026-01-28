
export interface GeneratedImage {
  id: string;
  url: string; // Base64 or Blob URL
  prompt: string;
  model: string;
  date: number;
  aspectRatio?: string;
  isSynced?: boolean; // New property to track cloud storage status
}

export enum AppRoute {
  LOGIN = 'Login',
  REGISTER = 'Register',
  FORGOT_PASSWORD = 'Forgot Password',
  CONTROL_PANEL = 'Control Panel',
  IMAGINABLE = 'Imaginable',
  EDITABLE = 'Editable',
  PROMPTABLE = 'Promptable',
  COLLECTABLE = 'Collectable',
  LOGOUT = 'Logout'
}

export enum ImageModel {
  GEMINI_FLASH_IMAGE = 'gemini-2.5-flash-image',
  GEMINI_PRO_IMAGE = 'gemini-3-pro-image-preview',
  IMAGEN_3 = 'imagen-3.0-generate-001', 
  IMAGEN_4 = 'imagen-4.0-generate-001'
}

export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  STANDARD = '4:3',
  TALL = '3:4',
  LANDSCAPE_3_2 = '3:2',
  PORTRAIT_2_3 = '2:3'
}

export interface GenerationConfig {
  prompt: string;
  model: string;
  aspectRatio: string;
  numberOfImages: number;
  referenceImages: File[];
}

export interface ImaginableState {
  prompt: string;
  model: string;
  aspectRatio: string;
  count: number;
  refImages: File[];
  generatedResults: GeneratedImage[];
}

export interface EditableState {
  baseImage: File | null;
  instruction: string;
  resultImage: GeneratedImage | null;
}

export interface PromptableState {
  image: File | null;
  generatedPrompt: string;
}
