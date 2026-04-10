import React, { useState } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';
import { Save, Server, Cpu, Clock, Globe } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Server className="text-busuu-blue" />
          Configuration du Bot
        </h2>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-busuu-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          <Save size={18} />
          Sauvegarder
        </button>
      </div>

      <div className="space-y-6">
        
        {/* Busuu Credentials */}
        <section className="space-y-4">
          <h3 className="text-sm uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700 pb-2">
            Identifiants Busuu
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={localSettings.busuuEmail || ''}
                onChange={(e) => handleChange('busuuEmail', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-busuu-blue focus:border-transparent outline-none"
                placeholder="votre@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Mot de passe</label>
              <input
                type="password"
                value={localSettings.busuuPassword || ''}
                onChange={(e) => handleChange('busuuPassword', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-busuu-blue focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>
        </section>

        {/* Backend & Connectivity */}
        <section className="space-y-4">
          <h3 className="text-sm uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700 pb-2">
            Backend & LLM
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">URL du Scraper Backend</label>
              <input
                type="text"
                value={localSettings.backendUrl}
                onChange={(e) => handleChange('backendUrl', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-busuu-blue focus:border-transparent outline-none"
                placeholder="http://localhost:8000"
              />
              <p className="text-xs text-slate-500 mt-1">L'adresse où tourne votre script Python/Puppeteer.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Type de LLM</label>
              <div className="flex bg-slate-900 p-1 rounded border border-slate-600">
                <button
                  onClick={() => handleChange('useLocalLLM', false)}
                  className={`flex-1 py-1.5 text-sm rounded transition-colors ${!localSettings.useLocalLLM ? 'bg-busuu-blue text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Cloud (Gemini)
                </button>
                <button
                  onClick={() => handleChange('useLocalLLM', true)}
                  className={`flex-1 py-1.5 text-sm rounded transition-colors ${localSettings.useLocalLLM ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Local (Ollama)
                </button>
              </div>
            </div>
          </div>

          {localSettings.useLocalLLM && (
            <div className="bg-slate-900/50 p-4 rounded border border-slate-700 animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-green-400 mb-1 flex items-center gap-2">
                <Cpu size={16} />
                Modèle Local (via Ollama)
              </label>
              <input
                type="text"
                value={localSettings.localLLMModel}
                onChange={(e) => handleChange('localLLMModel', e.target.value)}
                className="w-full bg-slate-950 border border-slate-600 rounded px-3 py-2 text-white focus:border-green-500 outline-none"
                placeholder="ex: llama3, mistral"
              />
            </div>
          )}
        </section>

        {/* Behavior */}
        <section className="space-y-4">
          <h3 className="text-sm uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700 pb-2">
            Comportement
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                <Globe size={16} />
                Langue Cible
              </label>
              <select
                value={localSettings.targetLanguage}
                onChange={(e) => handleChange('targetLanguage', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white outline-none"
              >
                <option value="English">Anglais</option>
                <option value="Spanish">Espagnol</option>
                <option value="French">Français</option>
                <option value="German">Allemand</option>
                <option value="Japanese">Japonais</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                <Clock size={16} />
                Délai avant soumission (ms)
              </label>
              <input
                type="number"
                value={localSettings.submitDelayMs}
                onChange={(e) => handleChange('submitDelayMs', parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-900 rounded border border-slate-700">
            <input
              type="checkbox"
              id="autoSubmit"
              checked={localSettings.autoSubmit}
              onChange={(e) => handleChange('autoSubmit', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-busuu-blue focus:ring-busuu-blue"
            />
            <label htmlFor="autoSubmit" className="text-sm text-slate-200">
              Soumettre automatiquement les réponses correctes détectées
            </label>
          </div>
          
           <div className="flex items-center gap-3 p-3 bg-slate-900 rounded border border-slate-700">
            <input
              type="checkbox"
              id="headless"
              checked={localSettings.headlessMode}
              onChange={(e) => handleChange('headlessMode', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-busuu-blue focus:ring-busuu-blue"
            />
            <label htmlFor="headless" className="text-sm text-slate-200">
              Mode Headless (Navigateur invisible - Performance max)
            </label>
          </div>
        </section>

      </div>
    </div>
  );
};

export default SettingsPanel;