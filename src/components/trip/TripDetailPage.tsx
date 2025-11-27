
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Trip, Day, Activity } from '../../types';
import { Loader2, ArrowLeft, Calendar, MapPin, Edit, MessageSquare, Image as ImageIcon } from 'lucide-react';
import DayTabs from './DayTabs';
import ActivityList from './ActivityList';
import ActivityForm from './ActivityForm';
import ActivityDetailModal from './ActivityDetailModal';
import AiAssistant from './AiAssistant';
import MediaStudio from './MediaStudio';
import { generateImagePro } from '../../lib/gemini';

const TripDetailPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [viewMode, setViewMode] = useState<'itinerary' | 'assistant' | 'studio'>('itinerary');
  const [uploadingCover, setUploadingCover] = useState(false);

  // Background Image Generation Queue
  const processingImages = useRef(new Set<string>());
  // Track failed images so we don't retry them infinitely causing 429s
  const failedImages = useRef(new Set<string>());

  useEffect(() => { if (tripId) fetchTripData(); }, [tripId]);

  // Image Generation Effect
  useEffect(() => {
    const processImageGeneration = async () => {
       // Find activities that have a prompt but no URL and aren't being processed AND haven't failed before
       const pending = activities.filter(a => 
         a.image_prompt && 
         !a.image_url && 
         !processingImages.current.has(a.id) &&
         !failedImages.current.has(a.id)
       );
       
       if (pending.length > 0) {
          // Process one at a time to avoid rate limits
          const activity = pending[0];
          processingImages.current.add(activity.id);
          
          try {
             // Using gemini-3-pro-image-preview via gemini.ts lib
             const url = await generateImagePro(activity.image_prompt!, "16:9", "1K");
             if (url) {
                // Update DB
                await supabase.from('activities').update({ image_url: url }).eq('id', activity.id);
                // Update Local State
                setActivities(prev => prev.map(a => a.id === activity.id ? { ...a, image_url: url } : a));
             }
          } catch (e) {
             console.error("Failed to generate image for activity", activity.title);
             // Mark as failed so we don't retry immediately
             failedImages.current.add(activity.id);
          } finally {
             processingImages.current.delete(activity.id);
          }
       }
    };

    // Interval to process queue. 4000ms is a safe buffer for rate limits.
    const interval = setInterval(processImageGeneration, 4000); 
    return () => clearInterval(interval);
  }, [activities]);

  const fetchTripData = async () => {
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
       await supabase.from('trips').update({ cover_image: publicUrl }).eq('id', trip.id);
       setTrip({ ...trip, cover_image: publicUrl });
    } catch (err) { alert('Failed to upload cover image'); } finally { setUploadingCover(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500 h-8 w-8" /></div>;
  if (!trip) return <div>Trip not found</div>;

  const currentDayActivities = activities.filter(a => a.day_id === selectedDayId);

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate('/app')} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors group">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>
        
        <div 
          className="glass-panel p-8 md:p-12 rounded-[2rem] relative overflow-hidden bg-cover bg-center group transition-all duration-1000 shadow-2xl"
          style={{ 
            backgroundImage: trip.cover_image ? `url(${trip.cover_image})` : undefined,
            backgroundColor: trip.cover_image ? 'transparent' : 'rgba(15, 23, 42, 0.6)'
          }}
        >
          {trip.cover_image && <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30"></div>}
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
            <div className="flex-1">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-3">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <span>Itinerary Planner</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight drop-shadow-xl">{trip.name}</h1>
              <div className="flex flex-wrap items-center gap-6 text-slate-200 font-medium">
                 <div className="flex items-center bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10"><MapPin className="h-4 w-4 mr-2 text-indigo-300" /> {trip.destination}</div>
                 <div className="flex items-center bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10"><Calendar className="h-4 w-4 mr-2 text-indigo-300" /> {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-3">
               <label className="cursor-pointer bg-slate-950/50 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10 flex items-center transition-all shadow-lg hover:shadow-xl hover:scale-105">
                  {uploadingCover ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : <Edit className="h-3 w-3 mr-2" />}
                  {uploadingCover ? 'Uploading...' : 'Change Cover'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} disabled={uploadingCover} />
               </label>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-10 sticky top-4 z-40">
         <div className="glass-panel p-1.5 rounded-2xl flex space-x-1 shadow-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl">
            {[
              { id: 'itinerary', label: 'Itinerary', icon: Calendar },
              { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
              { id: 'studio', label: 'Media Studio', icon: ImageIcon }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center ${viewMode === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <tab.icon className="h-4 w-4 mr-2" /> {tab.label}
              </button>
            ))}
         </div>
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {viewMode === 'itinerary' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
            <div className="lg:col-span-12 space-y-8">
              <DayTabs days={days} selectedDayId={selectedDayId} onSelectDay={handleDaySelect} />
              
              <div className="space-y-6">
                 {/* Activity List */}
                 <ActivityList 
                   activities={currentDayActivities} 
                   onDelete={handleDeleteActivity} 
                   onOpenComments={setActiveActivity} 
                 />
                 
                 {/* Add Button */}
                 {selectedDayId && (
                   <div className="mt-8 pt-8 border-t border-white/5">
                     <ActivityForm dayId={selectedDayId} onSuccess={fetchTripData} />
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'assistant' && <div className="animate-fade-in-up"><AiAssistant /></div>}
        {viewMode === 'studio' && <div className="animate-fade-in-up"><MediaStudio /></div>}
      </div>

      <ActivityDetailModal 
        activity={activeActivity} 
        trip={trip}
        onClose={() => setActiveActivity(null)} 
      />
    </div>
  );
};

export default TripDetailPage;
