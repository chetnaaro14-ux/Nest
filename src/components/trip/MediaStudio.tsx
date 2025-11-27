
import React, { useState } from 'react';
import { 
  generateImagePro, 
  editImage, 
  analyzeImage, 
  generateVideoVeo 
} from '../../lib/gemini';
import { Image, Video, Wand2, Upload, Eye, Loader2, Download } from 'lucide-react';

const MediaStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'analyze' | 'video'>('generate');
  
  // Common State
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  
  // Specific States
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  
  // Veo Key State
  const [hasKey, setHasKey] = useState(false);

  // File Upload Helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setResultUrl(null);
        setAnalysisText(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const checkKey = async () => {
    if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
      setHasKey(true);
      return true;
    }
    return false;
  };

  const handleAction = async () => {
    if (!prompt && activeTab !== 'analyze') return; // Analyze might allow empty prompt (default)
    setLoading(true);
    setResultUrl(null);
    setAnalysisText(null);

    try {
      if (activeTab === 'generate') {
        const url = await generateImagePro(prompt, aspectRatio, imageSize);
        setResultUrl(url);
      } else if (activeTab === 'edit') {
        if (!uploadedImage) throw new Error("Upload an image first");
        const url = await editImage(uploadedImage, prompt);
        setResultUrl(url);
      } else if (activeTab === 'analyze') {
        if (!uploadedImage) throw new Error("Upload an image first");
        const text = await analyzeImage(uploadedImage, prompt);
        setAnalysisText(text);
      } else if (activeTab === 'video') {
        // Check API Key for Veo
        if (!await checkKey()) {
           if (window.aistudio) {
             await window.aistudio.openSelectKey();
             // Race condition handling: try again or assume success
             if (!await checkKey()) {
                throw new Error("API Key selection required for Veo");
             }
           } else {
             throw new Error("AI Studio environment required");
           }
        }
        
        const url = await generateVideoVeo(prompt, videoAspectRatio);
        setResultUrl(url);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 min-h-[600px] border border-white/10">
      <div className="flex items-center space-x-2 mb-6">
        <Wand2 className="h-6 w-6 text-indigo-400" />
        <h2 className="text-2xl font-bold text-white">Media Studio</h2>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'generate', label: 'Generate Image', icon: Image },
          { id: 'edit', label: 'Edit Image', icon: Wand2 },
          { id: 'analyze', label: 'Analyze', icon: Eye },
          { id: 'video', label: 'Create Video (Veo)', icon: Video },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setResultUrl(null); setUploadedImage(null); setAnalysisText(null); setPrompt(''); }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls Column */}
        <div className="space-y-6">
          
          {/* File Upload (Edit/Analyze) */}
          {(activeTab === 'edit' || activeTab === 'analyze') && (
             <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:border-indigo-500/50 transition-colors bg-slate-900/30">
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="studio-upload" />
                <label htmlFor="studio-upload" className="cursor-pointer flex flex-col items-center">
                   {uploadedImage ? (
                     <img src={uploadedImage} alt="Preview" className="h-48 object-contain rounded-lg shadow-md" />
                   ) : (
                     <>
                       <Upload className="h-10 w-10 text-slate-500 mb-3" />
                       <span className="text-sm text-slate-300 font-medium">Upload source image</span>
                     </>
                   )}
                </label>
             </div>
          )}

          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {activeTab === 'analyze' ? 'Question (Optional)' : 'Prompt'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === 'generate' ? "A futuristic family car flying over Rome..." :
                activeTab === 'edit' ? "Add fireworks in the sky..." :
                activeTab === 'analyze' ? "What landmark is this?" :
                "A cinematic drone shot of a tropical beach..."
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none placeholder-slate-600"
            />
          </div>

          {/* Configuration Options */}
          {activeTab === 'generate' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Aspect Ratio</label>
                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none">
                  {["1:1", "3:4", "4:3", "9:16", "16:9"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Size</label>
                <select value={imageSize} onChange={e => setImageSize(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none">
                  {["1K", "2K", "4K"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Aspect Ratio</label>
              <select value={videoAspectRatio} onChange={e => setVideoAspectRatio(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none">
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-2">Note: Veo requires a paid API key selection.</p>
            </div>
          )}

          <button
            onClick={handleAction}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Wand2 className="h-5 w-5 mr-2" />}
            {activeTab === 'generate' ? 'Generate Image' : activeTab === 'edit' ? 'Edit Image' : activeTab === 'analyze' ? 'Analyze' : 'Generate Video'}
          </button>
        </div>

        {/* Results Column */}
        <div 
          className="bg-slate-950/50 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden"
          style={(!resultUrl && !analysisText && !loading) ? {
             backgroundImage: 'url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60")',
             backgroundSize: 'cover',
             backgroundPosition: 'center'
          } : undefined}
        >
          {(!resultUrl && !analysisText && !loading) && (
             <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
          )}

          <div className="relative z-10 w-full h-full flex items-center justify-center">
            {loading ? (
               <div className="text-center">
                 <Loader2 className="animate-spin h-10 w-10 text-indigo-500 mx-auto mb-4" />
                 <p className="text-slate-400 animate-pulse">Creating magic...</p>
                 {activeTab === 'video' && <p className="text-xs text-slate-500 mt-2">Video generation takes longer.</p>}
               </div>
            ) : resultUrl ? (
               <div className="relative group w-full h-full flex items-center justify-center">
                  {activeTab === 'video' ? (
                    <video src={resultUrl} controls className="max-w-full max-h-[400px] rounded-lg shadow-2xl" />
                  ) : (
                    <img src={resultUrl} alt="Result" className="max-w-full max-h-[400px] object-contain rounded-lg shadow-2xl" />
                  )}
                  <a href={resultUrl} download={`nest-${activeTab}-${Date.now()}.${activeTab === 'video' ? 'mp4' : 'png'}`} 
                     className="absolute bottom-4 right-4 bg-white text-slate-900 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                     <Download className="h-5 w-5" />
                  </a>
               </div>
            ) : analysisText ? (
              <div className="text-left w-full h-full overflow-y-auto">
                <h4 className="text-indigo-400 font-bold mb-2 flex items-center"><Eye className="h-4 w-4 mr-2" /> Analysis Result</h4>
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{analysisText}</p>
              </div>
            ) : (
               <div className="text-center text-slate-300">
                 <Wand2 className="h-12 w-12 mx-auto mb-3 text-indigo-400" />
                 <p className="font-bold">Your creation will appear here.</p>
                 <p className="text-xs text-slate-400 mt-1">Use prompts to generate or edit media.</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaStudio;
