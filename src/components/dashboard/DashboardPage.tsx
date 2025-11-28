
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Trip, GeneratedActivitySuggestion } from '../../types';
import { Plus, Calendar, MapPin, Loader2, ArrowRight, Upload, Sparkles, Wand2, Compass, Layout, Database, Copy, Check, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateAiActivitiesForTrip } from '../../lib/aiPlanner';
import { generateImagePro } from '../../lib/gemini';

const REQUIRED_SCHEMA_SQL = `
-- COPY THIS INTO SUPABASE SQL EDITOR AND RUN

-- 1. Create Tables
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  created_at timestamptz default now()
);

create table if not exists public.trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  name text,
  destination text,
  start_date date,
  end_date date,
  status text default 'planning',
  cover_image text,
  created_at timestamptz default now()
);

create table if not exists public.days (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  date date,
  index integer
);

create table if not exists public.activities (
  id uuid default gen_random_uuid() primary key,
  day_id uuid references public.days(id) on delete cascade,
  title text,
  category text,
  start_time time,
  end_time time,
  cost numeric,
  notes text,
  logistics text,
  image_url text,
  image_prompt text,
  created_at timestamptz default now()
);

create table if not exists public.trip_members (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  user_id uuid references public.profiles(id),
  role text default 'editor',
  created_at timestamptz default now()
);

create table if not exists public.activity_comments (
  id uuid default gen_random_uuid() primary key,
  activity_id uuid references public.activities(id) on delete cascade,
  user_id uuid references public.profiles(id),
  comment text,
  created_at timestamptz default now()
);

-- 2. Disable RLS for Development (Fixes Permission Errors)
alter table public.profiles enable row level security;
create policy "Allow all profiles" on public.profiles for all using (true);

alter table public.trips enable row level security;
create policy "Allow all trips" on public.trips for all using (true);

alter table public.days enable row level security;
create policy "Allow all days" on public.days for all using (true);

alter table public.activities enable row level security;
create policy "Allow all activities" on public.activities for all using (true);

alter table public.trip_members enable row level security;
create policy "Allow all members" on public.trip_members for all using (true);

alter table public.activity_comments enable row level security;
create policy "Allow all comments" on public.activity_comments for all using (true);

-- 3. Storage Setup
insert into storage.buckets (id, name, public) values ('trip-covers', 'trip-covers', true) on conflict do nothing;
create policy "Public Access Covers" on storage.objects for select using ( bucket_id = 'trip-covers' );
create policy "Auth Upload Covers" on storage.objects for insert with check ( bucket_id = 'trip-covers' and auth.role() = 'authenticated' );
`;

const DashboardPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [dbSetupNeeded, setDbSetupNeeded] = useState(false);
  
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
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();

  const fetchTrips = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      const { data: memberData, error } = await supabase.from('trip_members').select('trip_id').eq('user_id', user.id);
      
      if (error) {
        console.error("Fetch trips error:", error);
        // Detect missing table error
        if (
          error.message.includes('relation "public.trip_members" does not exist') || 
          error.code === '42P01'
        ) {
          setDbSetupNeeded(true);
        }
        setTrips([]);
        setLoading(false);
        return;
      }

      const tripIds = memberData?.map(m => m.trip_id) || [];
      
      if (tripIds.length > 0) {
        const { data: tripsData } = await supabase.from('trips').select('*').in('id', tripIds).order('start_date', { ascending: true });
        if (tripsData) setTrips(tripsData as Trip[]);
      } else {
          setTrips([]);
      }
    } catch (e) {
      console.error(e);
      setTrips([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTrips(); }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(REQUIRED_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setStatusMsg(mode === 'ai' ? 'Consulting Gemini AI...' : 'Creating your trip...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to create a trip.");

      // CRITICAL: Ensure profile exists before creating trip to avoid Foreign Key error
      // This heals accounts created before the DB tables existed.
      const { error: profileCheckError } = await supabase.from('profiles').upsert({ 
          id: user.id, 
          email: user.email 
      }, { onConflict: 'id' });
      
      if (profileCheckError) {
          console.warn("Auto-healing profile failed, attempting to proceed:", profileCheckError);
      }

      // 1. Handle Cover Image
      let coverImageUrl = null;
      if (coverFile) {
         setStatusMsg('Uploading cover image...');
         const fileExt = coverFile.name.split('.').pop();
         const fileName = `${Math.random()}.${fileExt}`;
         const filePath = `${user.id}/${fileName}`;
         
         const { error: uploadError } = await supabase.storage.from('trip-covers').upload(filePath, coverFile);
         if (uploadError) {
           console.warn("Upload failed (Bucket might not exist):", uploadError.message);
         } else {
           const { data: { publicUrl } } = supabase.storage.from('trip-covers').getPublicUrl(filePath);
           coverImageUrl = publicUrl;
         }
      } else if (mode === 'ai') {
         setStatusMsg('Generating trip cover...');
         try {
           coverImageUrl = await generateImagePro(`A cinematic travel shot of ${newDestination}, 4k, aesthetic`, "16:9", "1K");
         } catch (e) { console.error("Cover generation failed", e); }
      }

      // 2. Calculate Dates for AI
      let startDate = newStartDate;
      let endDate = newEndDate;
      
      if (mode === 'ai' && !startDate) {
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

      if (tripError) {
        console.error("Trip Insert Error:", tripError);
        // Explicitly check for missing table error codes
        if (
            tripError.message.includes('relation "public.trips" does not exist') || 
            tripError.code === '42P01' ||
            tripError.message.includes('does not exist')
        ) {
          setDbSetupNeeded(true);
          throw new Error("Missing Database Tables. Please click 'Troubleshoot Database' and run the SQL.");
        }
        throw new Error(`Database Error: ${tripError.message}`);
      }
      
      const trip = tripData as Trip;
      
      // Insert Member
      const { error: memberError } = await supabase.from('trip_members').insert([{ trip_id: trip.id, user_id: user.id, role: 'owner' }]);
      if (memberError) {
         console.error("Member Insert Error:", memberError);
      }

      // 4. Generate Days
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysToInsert = [];
      let currentIndex = 0;
      const MAX_DAYS = 30;
      let dayCount = 0;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (dayCount++ > MAX_DAYS) break;
        daysToInsert.push({ 
            trip_id: trip.id, 
            date: d.toISOString().split('T')[0], 
            index: currentIndex++,
            id: crypto.randomUUID() 
        });
      }
      
      if (daysToInsert.length > 0) {
        const { error: daysError } = await supabase.from('days').insert(daysToInsert);
        if (daysError) console.error("Days Insert Error:", daysError);
      }

      // 5. AI Itinerary Generation
      if (mode === 'ai') {
        setStatusMsg('Designing itinerary...');
        const suggestions = await generateAiActivitiesForTrip({ 
           trip: { ...trip, destination: `${newDestination} ${aiPreferences ? `(${aiPreferences})` : ''}` }, 
           days: daysToInsert as any, 
           existingActivities: [] 
        });

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
                image_prompt: s.image_prompt, 
                image_url: null 
            }));
            const { error: actError } = await supabase.from('activities').insert(activitiesToInsert);
            if (actError) console.error("Activity Insert Error:", actError);
        }
      }

      setShowWizard(false);
      navigate(`/app/trips/${trip.id}`);
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes('relation') || err.message.includes('does not exist'))) {
        setDbSetupNeeded(true);
      } else {
        alert(`Failed to create trip: ${err.message || err}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-fade-in relative">
      
      {/* DB Setup Warning/Modal */}
      {dbSetupNeeded && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" />
          <div className="glass-panel w-full max-w-3xl rounded-3xl relative z-10 animate-fade-in-up border border-red-500/30 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 bg-red-500/10 border-b border-red-500/20 flex items-center">
               <Database className="h-6 w-6 text-red-400 mr-3" />
               <h2 className="text-xl font-bold text-red-100">Action Required: Database Setup</h2>
            </div>
            <div className="p-8 overflow-y-auto">
              <p className="text-slate-300 mb-4 leading-relaxed">
                The app cannot save trips because the <strong>Supabase database tables are missing</strong>. 
                This is normal for a new project.
              </p>
              <ol className="list-decimal pl-5 text-slate-300 space-y-2 mb-6">
                <li>Click <strong>Copy SQL</strong> below.</li>
                <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" className="text-indigo-400 hover:underline">Supabase Dashboard</a>.</li>
                <li>Open the <strong>SQL Editor</strong> tab on the left.</li>
                <li>Paste the code and click <strong>Run</strong>.</li>
              </ol>
              
              <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6">
                <button 
                  onClick={handleCopySql}
                  className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition-colors flex items-center text-xs font-bold"
                >
                  {copied ? <Check className="h-4 w-4 mr-2 text-emerald-400" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? 'Copied' : 'Copy SQL'}
                </button>
                <pre className="text-xs text-indigo-200 font-mono overflow-x-auto whitespace-pre-wrap max-h-[300px] p-2">
                  {REQUIRED_SCHEMA_SQL}
                </pre>
              </div>

              <div className="flex justify-end gap-3">
                 <button 
                  onClick={() => setDbSetupNeeded(false)}
                  className="px-4 py-3 text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button 
                  onClick={() => { setDbSetupNeeded(false); window.location.reload(); }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg transition-all"
                >
                  I've run the SQL, Reload App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            
            <div className="flex gap-3">
               <button 
                  onClick={() => setDbSetupNeeded(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-4 rounded-2xl font-bold transition-all flex items-center space-x-2 border border-white/5"
                  title="Troubleshoot Database"
                >
                  <Database className="h-5 w-5" />
                  <span className="hidden md:inline">Troubleshoot DB</span>
                </button>
                <button 
                  onClick={() => { setShowWizard(true); setMode('ai'); }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-1 flex items-center space-x-2 border border-white/10 group"
                >
                  <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                  <span>Create New Trip</span>
                </button>
            </div>
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
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-950/40 to-transparent"></div>
                 
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
