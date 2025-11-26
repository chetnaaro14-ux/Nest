import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface ActivityFormProps {
  dayId: string;
  onSuccess: () => void;
}

const ActivityForm: React.FC<ActivityFormProps> = ({ dayId, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('sightseeing');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dayId) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('activities').insert([{
        day_id: dayId,
        title,
        category,
        start_time: startTime || null,
        end_time: endTime || null,
        cost: cost ? parseFloat(cost) : 0,
        notes
      }]);

      if (error) throw error;
      
      // Reset
      setTitle('');
      setCategory('sightseeing');
      setStartTime('');
      setEndTime('');
      setCost('');
      setNotes('');
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Failed to add activity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mt-8">
      <h3 className="text-lg font-bold text-slate-100 mb-4">Add Activity</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Title</label>
            <input 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Lunch at Mario's"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          
          <div>
            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="food">Food</option>
              <option value="sightseeing">Sightseeing</option>
              <option value="rest">Rest</option>
              <option value="travel">Travel</option>
              <option value="kids">Kids</option>
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Cost</label>
            <input 
              type="number"
              min="0"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Start Time</label>
            <input 
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">End Time</label>
            <input 
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:dark]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Notes</label>
            <textarea 
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Address, booking reference, ideas..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button 
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center transition-colors"
          >
            {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
            Add Activity
          </button>
        </div>
      </form>
    </div>
  );
};

export default ActivityForm;