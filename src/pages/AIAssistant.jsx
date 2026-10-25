import React, { useState } from 'react';
import { aiService } from '../services/aiService';
import Icon from '../components/common/Icon';

const AIAssistant = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const ask = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    const q = question.trim();
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setQuestion('');
    setLoading(true);
    try {
      const res = await aiService.assistant(q);
      const data = res.data || {};
      setMessages((m) => [...m, { role: 'assistant', text: data.answer || 'No grounded answer available.', meta: data }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: err.message || 'Assistant is currently unavailable.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-margin py-8">
      <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-outline-variant/40 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary-fixed dark:bg-orange-950 text-primary flex items-center justify-center">
              <Icon name="smart_toy" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-on-surface dark:text-white">RailResolve AI Assistant</h1>
              <p className="text-xs text-on-surface-variant dark:text-slate-400">Grounded in RailResolve knowledge and only your authorized complaint/journey context.</p>
            </div>
          </div>
        </div>
        <div className="p-6 min-h-[360px] space-y-4">
          {messages.length === 0 && <p className="text-sm text-on-surface-variant dark:text-slate-400">Ask about your complaint status, your journeys, or how RailResolve works.</p>}
          {messages.map((m, i) => (
            <div key={i} className={`p-4 rounded-2xl ${m.role === 'user' ? 'bg-primary text-on-primary ml-8' : 'bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-white mr-8'}`}>
              <p className="text-sm font-semibold whitespace-pre-wrap">{m.text}</p>
              {m.meta && <p className="mt-2 text-[10px] opacity-70">Intent: {m.meta.intent || 'UNKNOWN'} · {m.meta.grounded ? 'Grounded' : 'Needs human/source review'}</p>}
            </div>
          ))}
          {loading && <p className="text-xs font-bold text-primary">Checking grounded information…</p>}
        </div>
        <form onSubmit={ask} className="p-4 border-t border-outline-variant/40 dark:border-slate-800 flex gap-2">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question…" className="flex-1 bg-surface-container-low dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm dark:text-white outline-none" />
          <button className="px-5 rounded-2xl bg-primary text-on-primary font-extrabold text-sm"><Icon name="send" /></button>
        </form>
      </div>
    </div>
  );
};
export default AIAssistant;
