import React, { useState } from 'react';
import { AppTab, AppSettings, DEFAULT_SETTINGS } from './types';
import Dashboard from './components/Dashboard';
import SettingsPanel from './components/SettingsPanel';
import ManualSolver from './components/ManualSolver';
import { LayoutDashboard, Settings, Bot } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [settings, setSettings] = useState<AppSettings>({
    ...DEFAULT_SETTINGS,
    busuuEmail: import.meta.env.VITE_BUSUU_EMAIL || '',
    busuuPassword: import.meta.env.VITE_BUSUU_PASSWORD || '',
  });

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 font-sans">
      {/* Main Content - No Sidebar */}
      <main className="p-8 min-h-screen max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center border-b border-zinc-900 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-200">
              Busuu Solver - Shalk
            </h1>
            <p className="text-zinc-600 text-sm mt-1">
              Outil d'automatisation avancé pour Busuu.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse"></span>
            <span className="text-xs font-mono text-zinc-600 border border-zinc-800 px-2 py-1 rounded bg-zinc-900">
              MODE: Auto-Clicker (Local)
            </span>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Dashboard settings={settings} />
        </div>
      </main>
    </div>
  );
};

export default App;