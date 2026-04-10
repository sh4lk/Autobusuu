import React, { useState } from 'react';
import { solveQuizQuestion } from '../services/geminiService';
import { BrainCircuit, Play, Loader2, CheckCircle2 } from 'lucide-react';

const ManualSolver: React.FC = () => {
  const [context, setContext] = useState('');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<{ answer: string; explanation: string; confidence?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSolve = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await solveQuizQuestion(context, question);
      setResult(data);
    } catch (err) {
      setError("Erreur lors de la résolution. Vérifiez la clé API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <BrainCircuit className="text-purple-400" />
          Testeur de Résolution IA
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Utilisez cet outil pour tester la capacité du modèle à répondre correctement aux questions de Busuu avant de lancer l'automatisation complète.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Contexte (Phrase, Audio transcript, etc.)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white h-24 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none font-mono text-sm"
              placeholder="Ex: John is walking to the store..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              placeholder="Ex: Where is John going?"
            />
          </div>

          <button
            onClick={handleSolve}
            disabled={loading || !question}
            className={`w-full py-3 rounded-md font-bold flex items-center justify-center gap-2 transition-all ${
              loading || !question
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
            {loading ? 'Analyse en cours...' : 'Résoudre avec l\'IA'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-800 text-red-200 rounded">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="bg-slate-800 p-6 rounded-lg border border-green-500/30 shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-4">
            <div className="bg-green-500/20 p-3 rounded-full">
              <CheckCircle2 className="text-green-400 w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-400 mb-1">Réponse Suggérée</h3>
              <div className="text-2xl font-bold text-white mb-4 tracking-wide font-mono bg-slate-950 p-4 rounded border border-slate-700">
                {result.answer}
              </div>
              
              <div className="space-y-2">
                <p className="text-slate-300 text-sm">
                  <span className="font-semibold text-slate-500 uppercase text-xs">Explication:</span><br/>
                  {result.explanation}
                </p>
                {result.confidence && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <span>Confiance IA:</span>
                    <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${result.confidence * 100}%` }}
                      />
                    </div>
                    <span>{Math.round(result.confidence * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualSolver;