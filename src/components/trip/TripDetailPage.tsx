
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Trip, Day, Activity, GeneratedActivitySuggestion } from '../../types';
import { Loader2, ArrowLeft, Wand2, PlusCircle, Calendar, MapPin, Wallet, Upload, Edit, X, MessageSquare, Image as ImageIcon } from 'lucide-react';
import DayTabs from './DayTabs';
import ActivityList from './ActivityList';
import ActivityForm from './ActivityForm';
import CommentsPanel from './CommentsPanel';
import CollaboratorsPanel from './CollaboratorsPanel';
import AiAssistant from './AiAssistant';
import MediaStudio from './MediaStudio';
import { generateAiActivitiesForTrip } from '../../lib/aiPlanner';

const TripDetailPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [activeCommentActivity, setActiveCommentActivity] = useState<Activity | null>(null);
  
  // AI Planner State (Side Panel)
  const [aiPlannerOpen, setAiPlannerOpen] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<GeneratedActivitySuggestion[]>([]);
  const [aiError, setAiError] = useState(false);

  // Main View Mode (Itinerary vs Assistant vs Studio)
  const [viewMode, setViewMode] = useState<'itinerary' | 'assistant' | 'studio'>('itinerary');

  // Edit Cover State
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => { if (tripId) fetchTripData(); }, [tripId]);

  const fetchTripData = async () => {
    setLoading(true);
    try {
      if (!tripId) return;
      const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).single();
      setTrip(tripData as Trip);

      const { data: daysData } = await supabase.from('days').select('*').eq('trip_id', tripId).order('index', { ascending: true });
      setDays(daysData as Day[]);
      
      if (daysData.length > 0 && !selectedDayId) setSelectedDayId(daysData[0].id);

      const dayIds = daysData.map((d: any) => d.id);
      if (dayIds.length > 0) {
        const { data: actData } = await supabase.from('activities').select('*').in('day_id', dayIds).order('start_time', { ascending: true });
        setActivities(actData as Activity[]);
      }
    } catch (err) { navigate('/app'); } finally { setLoading(false); }
  };

  const handleDaySelect = (id: string) => setSelectedDayId(id);

  const handleDeleteActivity = async (id: string) => {
    if (!confirm("Delete this activity?")) return;
    await supabase.from('activities').delete().eq('id', id);
    fetchTripData();
  };

  // --- AI Planner Logic (Side Panel) ---
  const handleGenerateAi = async () => {
    if (!trip || days.length === 0) return;
    setGeneratingAi(true);
    setAiError(false);
    try {
      const suggestions = await generateAiActivitiesForTrip({ trip, days, existingActivities: activities });
      if (suggestions.length === 0) setAiError(true);
      else setAiSuggestions(suggestions);
    } catch (e) { setAiError(true); } finally { setGeneratingAi(false); }
  };

  const handleAddAiSuggestion = async (suggestion: GeneratedActivitySuggestion) => {
    if (!selectedDayId) return;
    const { error } = await supabase.from('activities').insert([{
      day_id: selectedDayId,
      title: suggestion.title,
      category: suggestion.category,
      start_time: suggestion.approximate_start_time.length === 5 ? suggestion.approximate_start_time : null,
      end_time: suggestion.approximate_end_time.length === 5 ? suggestion.approximate_end_time : null,
      cost: suggestion.cost,
      notes: suggestion.notes
    }]);

    if (!error) {
      setAiSuggestions(prev => prev.filter(s => s !== suggestion));
      fetchTripData();
    }
  };

  const handleDismissAiSuggestion = (suggestion: GeneratedActivitySuggestion) => {
    setAiSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !trip) return;

    setUploadingCover(true);
    try {
       const fileExt = file.name.split('.').pop();
       const fileName = `${Math.random()}.${fileExt}`;
       const filePath = `${trip.user_id}/${fileName}`;
       
       const { error: uploadError } = await supabase.storage.from('trip-covers').upload(filePath, file);
       if (uploadError) throw uploadError;

       const { data: { publicUrl } } = supabase.storage.from('trip-covers').getPublicUrl(filePath);
       
       const { error: updateError } = await supabase
         .from('trips')
         .update({ cover_image: publicUrl })
         .eq('id', trip.id);

       if (updateError) throw updateError;
       setTrip({ ...trip, cover_image: publicUrl });
    } catch (err) {
      console.error(err);
      alert('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500 h-8 w-8" /></div>;
  if (!trip) return <div>Trip not found</div>;

  const currentDayActivities = activities.filter(a => a.day_id === selectedDayId);
  const totalCost = activities.reduce((sum, act) => sum + (act.cost || 0), 0);
  const dayCost = currentDayActivities.reduce((sum, act) => sum + (act.cost || 0), 0);

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate('/app')} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors group">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>
        
        <div 
          className="glass-panel p-8 rounded-3xl relative overflow-hidden bg-cover bg-center group transition-all duration-700"
          style={{ 
            backgroundImage: trip.cover_image ? `url(${trip.cover_image})` : undefined,
            backgroundColor: trip.cover_image ? 'transparent' : 'rgba(15, 23, 42, 0.6)'
          }}
        >
          {trip.cover_image && <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm group-hover:backdrop-blur-md transition-all"></div>}
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
            <div className="flex-1">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>Itinerary Planner</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">{trip.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-slate-300">
                 <div className="flex items-center"><MapPin className="h-4 w-4 mr-1.5 text-slate-400" /> {trip.destination}</div>
                 <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                 <div className="flex items-center"><Calendar className="h-4 w-4 mr-1.5 text-slate-400" /> {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-3">
               <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10 flex items-center transition-colors">
                  {uploadingCover ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : <Edit className="h-3 w-3 mr-2" />}
                  {uploadingCover ? 'Uploading...' : 'Change Cover'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} disabled={uploadingCover} />
               </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex justify-center mb-8">
         <div className="glass-panel p-1 rounded-2xl flex space-x-1">
            <button 
              onClick={() => setViewMode('itinerary')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center ${viewMode === 'itinerary' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Calendar className="h-4 w-4 mr-2" /> Itinerary
            </button>
            <button 
              onClick={() => setViewMode('assistant')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center ${viewMode === 'assistant' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <MessageSquare className="h-4 w-4 mr-2" /> AI Assistant
            </button>
            <button 
              onClick={() => setViewMode('studio')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center ${viewMode === 'studio' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <ImageIcon className="h-4 w-4 mr-2" /> Media Studio
            </button>
         </div>
      </div>

      {/* VIEW CONTENT */}
      {viewMode === 'itinerary' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
          {/* Main Content: Days & Activities */}
          <div className="lg:col-span-8 space-y-6">
            <DayTabs days={days} selectedDayId={selectedDayId} onSelectDay={handleDaySelect} />
            
            <div className="glass-panel rounded-3xl p-6 min-h-[500px]">
               <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                  <h3 className="text-xl font-bold text-white">Day Schedule</h3>
                  <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                     <Wallet className="h-3 w-3 inline mr-1" /> Total: ${dayCost}
                  </div>
               </div>
               
               <ActivityList activities={currentDayActivities} onDelete={handleDeleteActivity} onOpenComments={setActiveCommentActivity} />
               
               {selectedDayId && (
                 <div className="mt-8 pt-8 border-t border-white/5">
                   <ActivityForm dayId={selectedDayId} onSuccess={fetchTripData} />
                 </div>
               )}
            </div>
          </div>

          {/* Sidebar: AI Planner & Collaborators */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`transition-all duration-300 rounded-3xl p-6 border ${aiPlannerOpen ? 'bg-indigo-950/30 border-indigo-500/30 shadow-lg shadow-indigo-900/20' : 'glass-panel border-white/5'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-indigo-100 flex items-center">
                  <Wand2 className="h-5 w-5 mr-2 text-indigo-400" />
                  Auto Planner
                </h3>
                <button 
                  onClick={() => setAiPlannerOpen(!aiPlannerOpen)}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${aiPlannerOpen ? 'bg-indigo-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${aiPlannerOpen ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              <div className={`transition-all duration-300 overflow-hidden ${aiPlannerOpen ? 'max-h-[800px] opacity-100' : 'max-h-20 opacity-60'}`}>
                 <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                    Automatically generate a schedule for this trip using AI.
                 </p>
                 
                 {aiPlannerOpen && (
                   <>
                     {aiSuggestions.length === 0 ? (
                        <button onClick={handleGenerateAi} disabled={generatingAi}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex justify-center items-center shadow-lg shadow-indigo-500/20">
                          {generatingAi ? <Loader2 className="animate-spin h-5 w-5" /> : "Generate Suggestions"}
                        </button>
                     ) : (
                        <div className="space-y-3 mt-2 pr-1 max-h-[500px] overflow-y-auto custom-scrollbar">
                          {aiSuggestions.map((s, idx) => (
                            <div key={idx} className="bg-slate-900/80 border border-white/10 p-4 rounded-xl hover:border-indigo-500/30 transition-colors group">
                              <div className="flex justify-between items-start mb-1">
                                <h5 className="font-bold text-slate-200 text-sm leading-tight">{s.title}</h5>
                                <span className="text-[10px] uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{s.category}</span>
                              </div>
                              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{s.notes}</p>
                              <div className="flex justify-between items-center mt-3">
                                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">${s.cost}</span>
                                <div className="flex items-center space-x-1">
                                  <button onClick={() => handleDismissAiSuggestion(s)} className="text-slate-500 hover:text-white p-1 rounded"><X className="h-4 w-4"/></button>
                                  <button onClick={() => handleAddAiSuggestion(s)}
                                      className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center hover:bg-indigo-500 transition-colors ml-1">
                                      <PlusCircle className="h-3 w-3 mr-1" /> Add
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button onClick={() => setAiSuggestions([])} className="text-xs text-slate-500 hover:text-slate-300 w-full text-center py-2">Clear results</button>
                        </div>
                     )}
                     {aiError && <p className="text-xs text-amber-400 mt-3 p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg">AI unavailable. Try again later.</p>}
                   </>
                 )}
              </div>
            </div>
            
            <CollaboratorsPanel tripId={trip.id} />
          </div>
        </div>
      )}

      {viewMode === 'assistant' && (
         <div className="animate-fade-in-up">
            <AiAssistant />
         </div>
      )}

      {viewMode === 'studio' && (
         <div className="animate-fade-in-up">
            <MediaStudio />
         </div>
      )}

      <CommentsPanel activity={activeCommentActivity} onClose={() => setActiveCommentActivity(null)} />
    </div>
  );
};

export default TripDetailPage;
