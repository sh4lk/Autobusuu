export enum AppTab {
  DASHBOARD = 'DASHBOARD',
  SETTINGS = 'SETTINGS',
  MANUAL_SOLVER = 'MANUAL_SOLVER',
}

export enum BotStatus {
  IDLE = 'Inactif',
  SCANNING = 'Scan en cours',
  SOLVING = 'Résolution...',
  ERROR = 'Erreur',
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface AppSettings {
  targetLanguage: string;
  backendUrl: string;
  useLocalLLM: boolean;
  localLLMModel: string;
  autoSubmit: boolean;
  submitDelayMs: number;
  headlessMode: boolean;
  busuuEmail?: string;
  busuuPassword?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  targetLanguage: 'English',
  backendUrl: 'http://localhost:8000',
  useLocalLLM: false, // Default to Gemini for the demo
  localLLMModel: 'llama3',
  autoSubmit: true,
  submitDelayMs: 1500,
  headlessMode: false,
  busuuEmail: '',
  busuuPassword: '',
};