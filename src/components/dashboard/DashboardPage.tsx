import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Trip } from '../../types';
import { Plus, Calendar, MapPin, Loader2, ArrowRight, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  
  // New Trip Form State
  const [newName, setNewName] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();

  const fetchTrips = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Simulate complex query for demo
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

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      let coverImageUrl = null;

      if (coverFile) {
         const fileExt = coverFile.name.split('.').pop();
         const fileName = `${Math.random()}.${fileExt}`;
         const filePath = `${user.id}/${fileName}`;
         
         const { error: uploadError } = await supabase.storage.from('trip-covers').upload(filePath, coverFile);
         if (uploadError) throw uploadError;

         const { data: { publicUrl } } = supabase.storage.from('trip-covers').getPublicUrl(filePath);
         coverImageUrl = publicUrl;
      }

      const { data: tripData, error: tripError } = await supabase.from('trips').insert([{
        user_id: user.id,
        name: newName,
        destination: newDestination,
        start_date: newStartDate,
        end_date: newEndDate,
        status: 'planning',
        cover_image: coverImageUrl
      }]).select().single();

      if (tripError) throw tripError;
      const trip = tripData as Trip;

      await supabase.from('trip_members').insert([{ trip_id: trip.id, user_id: user.id, role: 'owner' }]);

      // Generate Days
      const start = new Date(newStartDate);
      const end = new Date(newEndDate);
      const daysToInsert = [];
      let currentIndex = 0;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        daysToInsert.push({ trip_id: trip.id, date: d.toISOString().split('T')[0], index: currentIndex++ });
      }
      if (daysToInsert.length > 0) await supabase.from('days').insert(daysToInsert);

      setShowNewTripModal(false);
      setNewName(''); setNewDestination(''); setNewStartDate(''); setNewEndDate(''); setCoverFile(null);
      fetchTrips();
    } catch (err) {
      console.error(err);
      alert("Failed to create trip");
    } finally {
      setCreating(false);
    }
  };

  const upcomingTrips = trips.filter(t => new Date(t.start_date) >= new Date());
  const completedTrips = trips.filter(t => new Date(t.end_date) < new Date());

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Hero Section */}
      <header className="mb-12 relative">
         <div className="flex flex-col md:flex-row justify-between items-end gap-6 relative z-10">
            <div>
              <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-200 mb-2 tracking-tight">
                Welcome back
              </h1>
              <p className="text-slate-400 text-lg">Your next family adventure awaits.</p>
            </div>
            <button 
              onClick={() => setShowNewTripModal(true)}
              className="group bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-1 flex items-center space-x-2"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
              <span>Start New Trip</span>
            </button>
         </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { label: 'Total Trips', val: trips.length, color: 'text-white' },
          { label: 'Upcoming', val: upcomingTrips.length, color: 'text-indigo-400' },
          { label: 'Completed', val: completedTrips.length, color: 'text-emerald-400' }
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">{stat.label}</p>
            <p className={`text-5xl font-bold ${stat.color} relative z-10`}>{stat.val}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center">
        Recent Trips <div className="h-px bg-slate-800 flex-1 ml-4"></div>
      </h2>
      
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-indigo-500" /></div>
      ) : trips.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border-dashed border-2 border-slate-700/50">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No trips planned yet</h3>
          <p className="text-slate-400 mb-8 max-w-sm mx-auto">Create your first itinerary to start organizing flights, hotels, and activities.</p>
          <button 
            onClick={() => setShowNewTripModal(true)}
            className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center justify-center mx-auto"
          >
            Create a trip <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map(trip => (
            <div 
              key={trip.id}
              onClick={() => navigate(`/app/trips/${trip.id}`)}
              className="group glass-card hover:bg-slate-800/50 p-0 rounded-2xl cursor-pointer transition-all hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 overflow-hidden"
            >
              {/* Cover Image */}
              <div 
                className="h-40 bg-cover bg-center relative transition-transform duration-700 group-hover:scale-105"
                style={{ 
                  backgroundImage: trip.cover_image 
                    ? `url(${trip.cover_image})` 
                    : 'linear-gradient(to bottom right, #312e81, #1e293b)' 
                }}
              >
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                 <div className="absolute z-10 top-4 left-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide backdrop-blur-md border border-white/10 ${
                      trip.status === 'completed' ? 'bg-emerald-500/80 text-white' :
                      trip.status === 'confirmed' ? 'bg-blue-500/80 text-white' :
                      'bg-slate-500/50 text-white'
                    }`}>
                      {trip.status}
                    </span>
                 </div>
              </div>
              <div className="p-6 relative">
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{trip.name}</h3>
                <div className="flex items-center text-slate-400 text-sm mb-4">
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  {trip.destination}
                </div>
                
                <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-white/5">
                  <div className="flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    <span>{new Date(trip.start_date).toLocaleDateString()}</span>
                  </div>
                  <span className="group-hover:translate-x-1 transition-transform text-indigo-400">View Details &rarr;</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Trip Modal */}
      {showNewTripModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewTripModal(false)} />
          <div className="glass-panel w-full max-w-lg p-8 rounded-3xl relative z-10 animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">Plan a New Trip</h3>
            <form onSubmit={handleCreateTrip} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Trip Name</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Summer in Italy"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Destination</label>
                <input required value={newDestination} onChange={e => setNewDestination(e.target.value)} placeholder="e.g. Rome, Italy"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                  <input required type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                  <input required type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:dark]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cover Image (Optional)</label>
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-indigo-500/50 transition-colors bg-slate-900/30">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    className="hidden" 
                    id="cover-upload"
                  />
                  <label htmlFor="cover-upload" className="cursor-pointer flex flex-col items-center">
                     <Upload className="h-8 w-8 text-slate-500 mb-2" />
                     <span className="text-sm text-slate-300 font-medium">
                       {coverFile ? coverFile.name : 'Click to upload image'}
                     </span>
                     <span className="text-xs text-slate-500 mt-1">SVG, PNG, JPG</span>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-8">
                <button type="button" onClick={() => setShowNewTripModal(false)}
                  className="px-6 py-3 text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/25 flex items-center">
                  {creating && <Loader2 className="animate-spin h-4 w-4 mr-2" />} Create Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;