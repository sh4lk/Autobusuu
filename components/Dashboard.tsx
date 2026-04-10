import React, { useEffect, useState, useRef } from 'react';
import { BotStatus, LogEntry, AppSettings } from '../types';
import { Activity, PlayCircle, StopCircle, Terminal, RefreshCw, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  settings: AppSettings;
}

const Dashboard: React.FC<DashboardProps> = ({ settings }) => {
  const [status, setStatus] = useState<BotStatus>(BotStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({ lessons: 0, xp: 0, startTime: null, errors: 0 });
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Poll backend status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${settings.backendUrl}/status`);
        const data = await response.json();
        
        if (data.status === 'RUNNING') setStatus(BotStatus.SCANNING);
        else if (data.status === 'IDLE') setStatus(BotStatus.IDLE);
        else if (data.status === 'WAITING_FOR_USER') setStatus(BotStatus.IDLE); // Or a new status "READY"
        else if (data.status === 'ERROR') setStatus(BotStatus.ERROR);

        // Update logs
        if (data.logs && data.logs.length > 0) {
            setLogs(data.logs);
        }
        
        // Update stats
        if (data.stats) {
            setStats(data.stats);
        }
      } catch (error) {
        // Backend likely down
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [settings.backendUrl]);

  const formatTime = (startTime: number | null) => {
      if (!startTime) return "00:00";
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const mins = Math.floor(diff / 60).toString().padStart(2, '0');
      const secs = (diff % 60).toString().padStart(2, '0');
      return `${mins}:${secs}`;
  };

  const [autoNav, setAutoNav] = useState(true);

  const launchBrowser = async () => {
    try {
        await fetch(`${settings.backendUrl}/launch`, { method: 'POST' });
        addLog('info', "Navigateur lancé. Connectez-vous manuellement.");
    } catch (e) {
        addLog('error', "Erreur lancement navigateur");
    }
  };

  const startSolving = async () => {
    try {
        await fetch(`${settings.backendUrl}/start_solving`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ autoNavigation: autoNav })
        });
        setStatus(BotStatus.SCANNING);
    } catch (e) {
        addLog('error', "Erreur démarrage bot");
    }
  };

  const stopBot = async () => {
      try {
        await fetch(`${settings.backendUrl}/stop`, { method: 'POST' });
        setStatus(BotStatus.IDLE);
      } catch (e) {
        addLog('error', "Erreur arrêt bot");
      }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">

      {/* Status Panel */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 shadow-lg">
          <h2 className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-4">État du système</h2>

          <div className="flex items-center justify-between mb-6">
            <div className={`text-xl font-bold flex items-center gap-3 ${
              status === BotStatus.SCANNING ? 'text-zinc-200' : 'text-zinc-500'
            }`}>
              {status === BotStatus.SCANNING && <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-50"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-300"></span>
              </span>}
              {status}
            </div>
            <Activity className={status === BotStatus.SCANNING ? 'text-zinc-400 animate-pulse' : 'text-zinc-700'} size={18} />
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-black p-3 rounded border border-zinc-800">
              <div className="text-xs text-zinc-600 mb-1">Leçons</div>
              <div className="text-xl font-bold text-zinc-300">{stats.lessons}</div>
            </div>
            <div className="bg-black p-3 rounded border border-zinc-800">
              <div className="text-xs text-zinc-600 mb-1">XP Gagné</div>
              <div className="text-xl font-bold text-zinc-300">{stats.xp}</div>
            </div>
            <div className="bg-black p-3 rounded border border-zinc-800">
              <div className="text-xs text-zinc-600 mb-1">Temps</div>
              <div className="text-xl font-bold text-zinc-300">{formatTime(stats.startTime)}</div>
            </div>
            <div className="bg-black p-3 rounded border border-zinc-800">
              <div className="text-xs text-zinc-600 mb-1">Erreurs</div>
              <div className="text-xl font-bold text-zinc-500">{stats.errors}</div>
            </div>
          </div>

          <div className="space-y-3">
            <button
                onClick={launchBrowser}
                className="w-full py-3 rounded font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all text-sm border border-zinc-700"
            >
                1. Ouvrir Navigateur
            </button>

            <div className="flex items-center gap-2 bg-black p-2 rounded border border-zinc-800">
                <input
                    type="checkbox"
                    checked={autoNav}
                    onChange={e => setAutoNav(e.target.checked)}
                    className="w-4 h-4"
                />
                <span className="text-sm text-zinc-500">Navigation Auto</span>
            </div>

            <button
                onClick={status === BotStatus.SCANNING ? stopBot : startSolving}
                className={`w-full py-4 rounded font-bold flex items-center justify-center gap-2 transition-all text-sm ${
                status !== BotStatus.SCANNING
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                    : 'bg-zinc-950 hover:bg-zinc-900 text-red-500 border border-red-900'
                }`}
            >
                {status !== BotStatus.SCANNING ? <PlayCircle size={20} /> : <StopCircle size={20} />}
                {status !== BotStatus.SCANNING ? '2. Démarrer IA' : 'Pause'}
            </button>
          </div>
        </div>

      </div>

      {/* Console/Logs Panel */}
      <div className="lg:col-span-2 bg-black rounded-lg border border-zinc-900 shadow-lg flex flex-col overflow-hidden font-mono text-sm">
        <div className="bg-zinc-950 p-3 border-b border-zinc-900 flex justify-between items-center">
          <div className="flex items-center gap-2 text-zinc-600">
            <Terminal size={14} />
            <span className="text-xs tracking-widest uppercase">Console</span>
          </div>
          <button onClick={clearLogs} className="text-zinc-700 hover:text-zinc-400 transition-colors" title="Effacer logs">
            <RefreshCw size={13} />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-1">
          {logs.length === 0 && (
            <div className="text-zinc-700 italic text-center mt-10 text-xs">En attente de connexion...</div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2">
              <span className="text-zinc-800 shrink-0 text-xs mt-0.5">[{log.timestamp}]</span>
              <span className="shrink-0 mt-1.5">
                {log.level === 'success' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>}
                {log.level === 'error'   && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600"></span>}
                {(log.level === 'info' || log.level === 'warning') && <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-700"></span>}
              </span>
              <span className={`break-all text-xs ${
                log.level === 'error'   ? 'text-red-600' :
                log.level === 'success' ? 'text-zinc-300' :
                log.level === 'warning' ? 'text-zinc-500' :
                'text-zinc-600'
              }`}>
                {log.message}
              </span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;