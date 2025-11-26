import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Trip, Day, Activity, GeneratedActivitySuggestion } from '../../types';
import { Loader2, ArrowLeft, Wand2, PlusCircle, Check } from 'lucide-react';
import DayTabs from './DayTabs';
import ActivityList from './ActivityList';
import ActivityForm from './ActivityForm';
import CommentsPanel from './CommentsPanel';
import CollaboratorsPanel from './CollaboratorsPanel';
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
  
  // AI State
  const [aiActive, setAiActive] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<GeneratedActivitySuggestion[]>([]);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    if (tripId) fetchTripData();
  }, [tripId]);

  const fetchTripData = async () => {
    setLoading(true);
    try {
      if (!tripId) return;

      // 1. Fetch Trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();
      
      if (tripError) throw tripError;
      setTrip(tripData as Trip);

      // 2. Fetch Days
      const { data: daysData, error: daysError } = await supabase
        .from('days')
        .select('*')
        .eq('trip_id', tripId)
        .order('index', { ascending: true });
        
      if (daysError) throw daysError;
      setDays(daysData as Day[]);
      
      if (daysData.length > 0 && !selectedDayId) {
        setSelectedDayId(daysData[0].id);
      }

      // 3. Fetch All Activities for this trip
      // We need to join via days... but simplest is to get days ids first. 
      // Or select activities where day_id in (list of day ids)
      const dayIds = daysData.map((d: any) => d.id);
      if (dayIds.length > 0) {
        const { data: actData, error: actError } = await supabase
          .from('activities')
          .select('*')
          .in('day_id', dayIds)
          .order('start_time', { ascending: true });
          
        if (actError) throw actError;
        setActivities(actData as Activity[]);
      } else {
        setActivities([]);
      }

    } catch (err) {
      console.error(err);
      navigate('/app');
    } finally {
      setLoading(false);
    }
  };

  const handleDaySelect = (id: string) => {
    setSelectedDayId(id);
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm("Delete this activity?")) return;
    await supabase.from('activities').delete().eq('id', id);
    fetchTripData();
  };

  const handleGenerateAi = async () => {
    if (!trip || days.length === 0) return;
    setGeneratingAi(true);
    setAiError(false);
    try {
      const suggestions = await generateAiActivitiesForTrip({
        trip,
        days,
        existingActivities: activities
      });
      if (suggestions.length === 0) {
          setAiError(true);
      } else {
        setAiSuggestions(suggestions);
      }
    } catch (e) {
      setAiError(true);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleAddAiSuggestion = async (suggestion: GeneratedActivitySuggestion) => {
    if (!selectedDayId) return;
    // Insert immediately into current day
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
      // Remove from list to avoid double add
      setAiSuggestions(prev => prev.filter(s => s !== suggestion));
      fetchTripData();
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500 h-8 w-8" /></div>;
  if (!trip) return <div>Trip not found</div>;

  const currentDayActivities = activities.filter(a => a.day_id === selectedDayId);
  const totalCost = activities.reduce((sum, act) => sum + (act.cost || 0), 0);
  const dayCost = currentDayActivities.reduce((sum, act) => sum + (act.cost || 0), 0);

  return (
    <div className="max-w-6xl mx-auto pb-20 relative">
      <button 
        onClick={() => navigate('/app')} 
        className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <span className="text-indigo-400 font-bold tracking-wider text-sm uppercase">Trip Planner</span>
          <h1 className="text-4xl font-bold text-slate-100 mt-1">{trip.name}</h1>
          <p className="text-slate-400 text-lg flex items-center gap-2 mt-1">
             {trip.destination} 
             <span className="w-1 h-1 bg-slate-600 rounded-full"></span> 
             {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right bg-slate-900 border border-slate-800 p-4 rounded-xl min-w-[200px]">
          <p className="text-slate-500 text-xs uppercase font-bold">Total Budget</p>
          <p className="text-2xl font-mono text-emerald-400 font-bold">${totalCost.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <DayTabs days={days} selectedDayId={selectedDayId} onSelectDay={handleDaySelect} />
          
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-xl font-bold text-slate-100">Itinerary</h3>
            <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
               <span>Day Cost:</span>
               <span className="text-emerald-400 font-mono">${dayCost}</span>
            </div>
          </div>

          <ActivityList 
            activities={currentDayActivities} 
            onDelete={handleDeleteActivity}
            onOpenComments={setActiveCommentActivity}
          />
          
          {selectedDayId && (
            <ActivityForm dayId={selectedDayId} onSuccess={fetchTripData} />
          )}
        </div>

        <div className="space-y-6">
          <CollaboratorsPanel tripId={trip.id} />

          {/* AI Planner Section */}
          <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-indigo-200 flex items-center">
                <Wand2 className="h-5 w-5 mr-2" />
                AI Planner
              </h3>
              <div 
                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${aiActive ? 'bg-indigo-500' : 'bg-slate-700'}`}
                onClick={() => setAiActive(!aiActive)}
              >
                <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${aiActive ? 'translate-x-5' : ''}`} />
              </div>
            </div>

            {aiActive && (
              <>
                <p className="text-sm text-indigo-200/70 mb-4">
                  Get intelligent suggestions for your trip to {trip.destination}.
                </p>
                
                {aiSuggestions.length === 0 ? (
                  <button 
                    onClick={handleGenerateAi}
                    disabled={generatingAi}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors flex justify-center items-center"
                  >
                    {generatingAi ? <Loader2 className="animate-spin h-5 w-5" /> : "Generate Suggestions"}
                  </button>
                ) : (
                  <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {aiSuggestions.map((s, idx) => (
                      <div key={idx} className="bg-slate-900/80 border border-indigo-500/30 p-3 rounded-lg text-left">
                        <div className="flex justify-between items-start">
                          <h5 className="font-bold text-indigo-100 text-sm">{s.title}</h5>
                          <span className="text-[10px] uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{s.category}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.notes}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs font-mono text-emerald-400">${s.cost}</span>
                          <button 
                            onClick={() => handleAddAiSuggestion(s)}
                            className="text-xs bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 px-2 py-1 rounded flex items-center"
                          >
                            <PlusCircle className="h-3 w-3 mr-1" /> Add
                          </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => setAiSuggestions([])} 
                      className="text-xs text-slate-500 hover:text-slate-300 w-full text-center mt-2"
                    >
                      Clear suggestions
                    </button>
                  </div>
                )}
                
                {aiError && (
                  <p className="text-xs text-amber-400 mt-3 bg-amber-400/10 p-2 rounded">
                    AI suggestions are unavailable right now or API key is missing. You can still plan manually.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <CommentsPanel 
        activity={activeCommentActivity} 
        onClose={() => setActiveCommentActivity(null)} 
      />
    </div>
  );
};

export default TripDetailPage;