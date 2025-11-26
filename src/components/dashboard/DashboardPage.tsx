import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Trip } from '../../types';
import { Plus, Calendar, MapPin, Loader2 } from 'lucide-react';
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
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();

  const fetchTrips = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get trips where user is owner OR a member
    // Since RLS policies might vary, we assume we can fetch trips joined with trip_members
    // Alternatively, simpler approach: fetch IDs from trip_members then fetch trips
    
    // Step 1: Get trips I'm a member of
    const { data: memberData } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', user.id);
      
    const tripIds = memberData?.map(m => m.trip_id) || [];
    
    // Step 2: Get trips I own (if not covered by members logic, but usually owner is a member)
    // To be safe, let's just query trips where ID is in the list
    if (tripIds.length > 0) {
      const { data: tripsData, error } = await supabase
        .from('trips')
        .select('*')
        .in('id', tripIds)
        .order('start_date', { ascending: true });
        
      if (!error && tripsData) {
        setTrips(tripsData as Trip[]);
      }
    } else {
        setTrips([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // 1. Insert Trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          name: newName,
          destination: newDestination,
          start_date: newStartDate,
          end_date: newEndDate,
          status: 'planning'
        }])
        .select()
        .single();

      if (tripError) throw tripError;
      const trip = tripData as Trip;

      // 2. Insert Trip Member (Owner)
      await supabase.from('trip_members').insert([{
        trip_id: trip.id,
        user_id: user.id,
        role: 'owner'
      }]);

      // 3. Generate Days
      const start = new Date(newStartDate);
      const end = new Date(newEndDate);
      const daysToInsert = [];
      let currentIndex = 0;
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        daysToInsert.push({
          trip_id: trip.id,
          date: d.toISOString().split('T')[0],
          index: currentIndex++
        });
      }

      if (daysToInsert.length > 0) {
        await supabase.from('days').insert(daysToInsert);
      }

      setShowNewTripModal(false);
      setNewName('');
      setNewDestination('');
      setNewStartDate('');
      setNewEndDate('');
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
    <div className="max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Welcome back</h1>
          <p className="text-slate-400 mt-1">Ready for your next adventure?</p>
        </div>
        <button 
          onClick={() => setShowNewTripModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus className="h-5 w-5" />
          <span>New Trip</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Trips</p>
          <p className="text-4xl font-bold text-slate-100 mt-2">{trips.length}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Upcoming</p>
          <p className="text-4xl font-bold text-indigo-400 mt-2">{upcomingTrips.length}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Completed</p>
          <p className="text-4xl font-bold text-emerald-400 mt-2">{completedTrips.length}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-100 mb-6">Recent Trips</h2>
      
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>
      ) : trips.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
          <p className="text-slate-500 mb-4">Start your first family adventure with NEST</p>
          <button 
            onClick={() => setShowNewTripModal(true)}
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Create a trip now &rarr;
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map(trip => (
            <div 
              key={trip.id}
              onClick={() => navigate(`/app/trips/${trip.id}`)}
              className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer transition-all hover:shadow-xl hover:shadow-indigo-500/10"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg">
                  <MapPin className="h-6 w-6" />
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                  trip.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                  trip.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-slate-700/50 text-slate-400'
                }`}>
                  {trip.status}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-1 group-hover:text-indigo-400 transition-colors">{trip.name}</h3>
              <p className="text-slate-400 text-sm mb-4">{trip.destination}</p>
              
              <div className="flex items-center text-slate-500 text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{new Date(trip.start_date).toLocaleDateString()} — {new Date(trip.end_date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Trip Modal */}
      {showNewTripModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-100 mb-4">Plan a New Trip</h3>
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Trip Name</label>
                <input 
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Summer in Italy"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Destination</label>
                <input 
                  required
                  value={newDestination}
                  onChange={e => setNewDestination(e.target.value)}
                  placeholder="e.g. Rome, Italy"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                  <input 
                    required
                    type="date"
                    value={newStartDate}
                    onChange={e => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">End Date</label>
                  <input 
                    required
                    type="date"
                    value={newEndDate}
                    onChange={e => setNewEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowNewTripModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center"
                >
                  {creating && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                  Create Trip
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