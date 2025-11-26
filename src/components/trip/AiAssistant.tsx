
import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Search, Sparkles, User, Bot, Loader2 } from 'lucide-react';
import { sendChatMessage, ChatMessage } from '../../lib/gemini';

const AiAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your NEST travel assistant. I can help you find places, check news, or plan your day.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'general' | 'travel_guide' | 'fast'>('travel_guide');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const response = await sendChatMessage(messages, userText, mode);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text, 
        groundingMetadata: response.groundingMetadata 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render grounding chips
  const renderGrounding = (metadata: any) => {
    if (!metadata?.groundingChunks) return null;

    const chunks = metadata.groundingChunks;
    const links: React.ReactElement[] = [];

    chunks.forEach((chunk: any, i: number) => {
      if (chunk.web?.uri) {
        links.push(
          <a key={`web-${i}`} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" 
             className="inline-flex items-center text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-1 rounded-md hover:bg-indigo-500/20 mr-2 mb-2">
            <Search className="h-3 w-3 mr-1" /> {chunk.web.title || 'Source'}
          </a>
        );
      }
      if (chunk.maps?.placeAnswerSources?.length > 0) {
        // Just linking to Google Maps search or specific place if URI available
        // Note: The API returns detailed Maps data, simplistic rendering here:
        links.push(
           <span key={`map-${i}`} className="inline-flex items-center text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-1 rounded-md mr-2 mb-2">
             <MapPin className="h-3 w-3 mr-1" /> Map Result
           </span>
        );
      }
    });

    if (links.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap">
        {links}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[600px] glass-panel rounded-3xl overflow-hidden border border-white/10">
      {/* Header / Mode Switcher */}
      <div className="p-4 border-b border-white/5 bg-slate-900/50 flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-lg font-bold text-white flex items-center">
          <Bot className="h-5 w-5 mr-2 text-indigo-400" />
          Assistant
        </h3>
        <div className="flex bg-slate-950 rounded-lg p-1 border border-white/5">
          <button 
            onClick={() => setMode('travel_guide')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'travel_guide' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Travel Guide
          </button>
          <button 
            onClick={() => setMode('general')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'general' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Chatbot (Pro)
          </button>
          <button 
            onClick={() => setMode('fast')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'fast' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Fast
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
            }`}>
              <div className="flex items-center space-x-2 mb-1 opacity-50 text-[10px] uppercase font-bold tracking-wider">
                {msg.role === 'user' ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                <span>{msg.role === 'user' ? 'You' : 'NEST AI'}</span>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.text}
              </div>
              {msg.role === 'model' && renderGrounding(msg.groundingMetadata)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-slate-800 rounded-2xl rounded-tl-none p-4 flex items-center space-x-2 border border-white/5">
               <Loader2 className="animate-spin h-4 w-4 text-indigo-400" />
               <span className="text-xs text-slate-400">Thinking...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-slate-900/50">
        <div className="flex gap-2 relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'travel_guide' ? "Ask about places, news, or maps..." :
              mode === 'general' ? "Ask complex questions..." :
              "Ask quick questions..."
            }
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-500 pr-12"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 rounded-lg transition-colors flex items-center justify-center"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 text-center">
          {mode === 'travel_guide' ? "Uses Gemini Flash + Google Search & Maps" : 
           mode === 'general' ? "Uses Gemini 3 Pro Preview" : 
           "Uses Gemini Flash Lite"}
        </p>
      </form>
    </div>
  );
};

export default AiAssistant;
