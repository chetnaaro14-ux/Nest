
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Trip, GeneratedActivitySuggestion } from '../../types';
import { Plus, Calendar, MapPin, Loader2, ArrowRight, Upload, Sparkles, Wand2, Compass, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateAiActivitiesForTrip } from '../../lib/aiPlanner';
import { generateImagePro } from '../../lib/gemini';

const DashboardPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  
  // Wizard State
  const [mode, setMode] = useState<'manual' | 'ai'>('ai');
  const [newName, setNewName] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [aiPreferences, setAiPreferences] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  
  // Processing State
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const navigate = useNavigate();

  const fetchTrips = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: memberData } = await supabase.from('trip_members').select('trip_id').eq('user_id', user.id);
    const tripIds = memberData?.map(m => m.trip_id) || [];
    
    if (tripIds.length > 0) {
      const { data: tripsData } = await supabase.from('trips').select('*').in('id', tripIds).order('start_date', { ascending: true });
      if (tripsData) setTrips(tripsData as Trip[]);
    } else {
        setTrips([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTrips(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setStatusMsg(mode === 'ai' ? 'Consulting Gemini AI...' : 'Creating your trip...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // 1. Handle Cover Image
      let coverImageUrl = null;
      if (coverFile) {
         setStatusMsg('Uploading cover image...');
         const fileExt = coverFile.name.split('.').pop();
         const fileName = `${Math.random()}.${fileExt}`;
         const filePath = `${user.id}/${fileName}`;
         await supabase.storage.from('trip-covers').upload(filePath, coverFile);
         const { data: { publicUrl } } = supabase.storage.from('trip-covers').getPublicUrl(filePath);
         coverImageUrl = publicUrl;
      } else if (mode === 'ai') {
         // Try to generate a cover if none provided
         setStatusMsg('Generating trip cover...');
         try {
           coverImageUrl = await generateImagePro(`A cinematic travel shot of ${newDestination}, 4k, aesthetic`, "16:9", "1K");
         } catch (e) { console.error("Cover generation failed", e); }
      }

      // 2. Calculate Dates for AI
      let startDate = newStartDate;
      let endDate = newEndDate;
      
      if (mode === 'ai' && !startDate) {
         // Default to next week if not set
         const d = new Date();
         d.setDate(d.getDate() + 7);
         startDate = d.toISOString().split('T')[0];
         const e = new Date(d);
         e.setDate(e.getDate() + 2); // 3 day default
         endDate = e.toISOString().split('T')[0];
      }

      // 3. Insert Trip
      setStatusMsg('Saving trip details...');
      const { data: tripData, error: tripError } = await supabase.from('trips').insert([{
        user_id: user.id,
        name: newName || `Trip to ${newDestination}`,
        destination: newDestination,
        start_date: startDate,
        end_date: endDate,
        status: 'planning',
        cover_image: coverImageUrl
      }]).select().single();

      if (tripError) throw tripError;
      const trip = tripData as Trip;
      await supabase.from('trip_members').insert([{ trip_id: trip.id, user_id: user.id, role: 'owner' }]);

      // 4. Generate Days
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysToInsert = [];
      let currentIndex = 0;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        daysToInsert.push({ 
            trip_id: trip.id, 
            date: d.toISOString().split('T')[0], 
            index: currentIndex++,
            id: crypto.randomUUID() // Pre-generate ID for references
        });
      }
      if (daysToInsert.length > 0) await supabase.from('days').insert(daysToInsert);

      // 5. AI Itinerary Generation
      if (mode === 'ai') {
        setStatusMsg('Designing itinerary...');
        const suggestions = await generateAiActivitiesForTrip({ 
           trip: { ...trip, destination: `${newDestination} ${aiPreferences ? `(${aiPreferences})` : ''}` }, 
           days: daysToInsert as any, 
           existingActivities: [] 
        });

        // Insert activities with prompts (Image generation happens on detail page to save time here)
        if (suggestions.length > 0) {
            setStatusMsg(`Adding ${suggestions.length} activities...`);
            const activitiesToInsert = suggestions.map((s, idx) => ({
                day_id: daysToInsert[idx % daysToInsert.length].id,
                title: s.title, 
                category: s.category,
                start_time: s.approximate_start_time.length === 5 ? s.approximate_start_time : null,
                end_time: s.approximate_end_time.length === 5 ? s.approximate_end_time : null,
                cost: s.cost, 
                notes: s.notes, 
                logistics: s.logistics, 
                image_prompt: s.image_prompt, // Save the prompt!
                image_url: null // Will be generated on view
            }));
            await supabase.from('activities').insert(activitiesToInsert);
        }
      }

      setShowWizard(false);
      navigate(`/app/trips/${trip.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create trip. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Hero Header */}
      <header className="mb-12 pt-8">
         <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                 <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                 <p className="text-indigo-400 font-bold tracking-widest uppercase text-xs">My Dashboard</p>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Your Journeys</h1>
            </div>
            
            <button 
              onClick={() => { setShowWizard(true); setMode('ai'); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-1 flex items-center space-x-2 border border-white/10 group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
              <span>Create New Trip</span>
            </button>
         </div>
      </header>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40">
           <Loader2 className="animate-spin h-12 w-12 text-indigo-500 mb-4" />
           <p className="text-slate-500 text-sm">Loading your adventures...</p>
        </div>
      ) : trips.length === 0 ? (
        <div 
          className="glass-panel p-16 rounded-3xl text-center border-dashed border-2 border-slate-700/50 flex flex-col items-center relative overflow-hidden"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2000&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
           <div className="relative z-10 flex flex-col items-center">
             <div className="w-32 h-32 bg-slate-900/50 rounded-full flex items-center justify-center mb-8 border border-white/10 relative overflow-hidden group backdrop-blur-md">
               <div className="absolute inset-0 bg-indigo-500/20 blur-xl group-hover:bg-indigo-500/30 transition-colors"></div>
               <Compass className="h-12 w-12 text-indigo-400 relative z-10" />
             </div>
             <h3 className="text-3xl font-bold text-white mb-3">No trips planned yet</h3>
             <p className="text-slate-300 mb-10 max-w-md mx-auto leading-relaxed">
               Your next great adventure is just a click away. Let our AI architect design the perfect itinerary for you.
             </p>
             <button 
               onClick={() => { setShowWizard(true); setMode('ai'); }}
               className="bg-white text-slate-900 hover:bg-indigo-50 px-8 py-4 rounded-xl font-bold transition-all hover:-translate-y-1 shadow-xl flex items-center"
             >
               <Sparkles className="h-4 w-4 mr-2 text-indigo-600" />
               Start Planning with AI
             </button>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trips.map(trip => (
            <div 
              key={trip.id}
              onClick={() => navigate(`/app/trips/${trip.id}`)}
              className="group glass-card rounded-3xl cursor-pointer transition-all hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-2 overflow-hidden border border-white/5 bg-slate-900/40 flex flex-col h-full"
            >
              <div 
                className="h-64 bg-cover bg-center relative transition-transform duration-700 group-hover:scale-105"
                style={{ 
                  backgroundImage: trip.cover_image 
                    ? `url(${trip.cover_image})` 
                    : 'linear-gradient(to bottom right, #1e1b4b, #312e81)' 
                }}
              >
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                 
                 <div className="absolute top-5 right-5 z-10">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-lg ${
                      trip.status === 'completed' ? 'bg-emerald-500/80 text-white' : 'bg-slate-950/60 text-white'
                    }`}>
                      {trip.status}
                    </span>
                 </div>
              </div>
              
              <div className="p-8 relative -mt-16 flex-1 flex flex-col">
                <div className="bg-slate-950/80 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-2xl flex-1 flex flex-col">
                  <h3 className="text-2xl font-bold text-white mb-2 leading-tight group-hover:text-indigo-400 transition-colors">{trip.name}</h3>
                  <div className="flex items-center text-slate-400 text-sm mb-6 font-medium">
                    <MapPin className="h-4 w-4 mr-2 text-indigo-500" />
                    {trip.destination}
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center text-xs text-slate-500 font-bold uppercase tracking-wider">
                      <Calendar className="h-3.5 w-3.5 mr-2" />
                      <span>{new Date(trip.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                       <ArrowRight className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Add New Card */}
          <button 
             onClick={() => { setShowWizard(true); setMode('ai'); }}
             className="rounded-3xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all flex flex-col items-center justify-center min-h-[400px] group relative overflow-hidden"
          >
             {/* Subtle texture for create card */}
             <div 
               className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
               style={{ 
                 backgroundImage: 'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1000&q=80")', 
                 backgroundSize: 'cover' 
               }} 
             />
             
             <div className="relative z-10 flex flex-col items-center">
               <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg border border-white/5">
                  <Plus className="h-8 w-8 text-slate-500 group-hover:text-indigo-400" />
               </div>
               <span className="text-slate-400 font-bold group-hover:text-indigo-300">Create New Trip</span>
             </div>
          </button>
        </div>
      )}

      {/* Create Trip Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => !processing && setShowWizard(false)} />
          <div className="glass-panel w-full max-w-2xl rounded-3xl relative z-10 animate-fade-in-up border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
               <div>
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    {mode === 'ai' ? <Sparkles className="h-6 w-6 mr-3 text-indigo-400" /> : <Layout className="h-6 w-6 mr-3 text-slate-400" />}
                    {mode === 'ai' ? 'AI Trip Architect' : 'Manual Planner'}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {mode === 'ai' ? 'Let Gemini AI generate a complete itinerary for you.' : 'Start from scratch and build your own plan.'}
                  </p>
               </div>
               
               {/* Toggle */}
               <div className="flex bg-slate-950 rounded-lg p-1 border border-white/5">
                 <button onClick={() => setMode('manual')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${mode === 'manual' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Manual</button>
                 <button onClick={() => setMode('ai')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${mode === 'ai' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>AI Auto</button>
               </div>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
               {processing ? (
                 <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-20 h-20 relative mb-6">
                       <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                       <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                       <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="h-8 w-8 text-indigo-400 animate-pulse" />
                       </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{statusMsg}</h3>
                    <p className="text-slate-500 text-sm">Building your dream journey...</p>
                 </div>
               ) : (
                 <form id="create-trip-form" onSubmit={handleCreate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Destination</label>
                          <input 
                            required 
                            value={newDestination} 
                            onChange={e => setNewDestination(e.target.value)} 
                            placeholder="e.g. Tokyo, Japan"
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-600" 
                          />
                       </div>

                       {mode === 'manual' && (
                         <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Trip Name</label>
                            <input 
                              required 
                              value={newName} 
                              onChange={e => setNewName(e.target.value)} 
                              placeholder="e.g. Summer Vacation"
                              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-600" 
                            />
                         </div>
                       )}

                       <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Start Date</label>
                          <input 
                            required 
                            type="date" 
                            value={newStartDate} 
                            onChange={e => setNewStartDate(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:dark]" 
                          />
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">End Date</label>
                          <input 
                            required 
                            type="date" 
                            value={newEndDate} 
                            onChange={e => setNewEndDate(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:dark]" 
                          />
                       </div>

                       {mode === 'ai' && (
                         <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center">
                               <Sparkles className="h-3 w-3 mr-1" /> Trip Preferences
                            </label>
                            <textarea 
                              rows={3}
                              value={aiPreferences} 
                              onChange={e => setAiPreferences(e.target.value)} 
                              placeholder="e.g. We love food, history, and walking. Traveling with two kids. Prefer relaxed pace."
                              className="w-full bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-indigo-300/30 resize-none" 
                            />
                         </div>
                       )}

                       <div className="md:col-span-2">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cover Image (Optional)</label>
                         <div className="border-2 border-dashed border-slate-800 rounded-xl p-4 flex items-center justify-center hover:border-slate-600 transition-colors bg-slate-900/30">
                            <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)} className="hidden" id="wizard-upload" />
                            <label htmlFor="wizard-upload" className="cursor-pointer flex items-center text-slate-400 hover:text-white transition-colors">
                               <Upload className="h-5 w-5 mr-3" />
                               <span>{coverFile ? coverFile.name : "Upload a cover image"}</span>
                            </label>
                         </div>
                       </div>
                    </div>
                 </form>
               )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-slate-900/50 flex justify-end gap-4">
               <button 
                 onClick={() => setShowWizard(false)}
                 disabled={processing}
                 className="px-6 py-3 text-slate-400 hover:text-white font-medium transition-colors"
               >
                 Cancel
               </button>
               {!processing && (
                 <button 
                   form="create-trip-form"
                   type="submit" 
                   className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
                 >
                   {mode === 'ai' ? <Wand2 className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                   {mode === 'ai' ? 'Generate Itinerary' : 'Create Trip'}
                 </button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
