import React, { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface ActivityFormProps {
  dayId: string;
  onSuccess: () => void;
}

const ActivityForm: React.FC<ActivityFormProps> = ({ dayId, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
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
        day_id: dayId, title, category,
        start_time: startTime || null, end_time: endTime || null,
        cost: cost ? parseFloat(cost) : 0, notes
      }]);
      if (error) throw error;
      setTitle(''); setCategory('sightseeing'); setStartTime(''); setEndTime(''); setCost(''); setNotes('');
      setIsOpen(false);
      onSuccess();
    } catch (err) { console.error(err); alert("Failed to add activity"); } finally { setLoading(false); }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full py-4 border-2 border-dashed border-slate-700/50 rounded-2xl text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all font-medium flex items-center justify-center gap-2 group"
      >
        <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
        Add Activity Manually
      </button>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
         <h3 className="text-lg font-bold text-white">New Activity</h3>
         <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Activity Name</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Lunch at Mario's"
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-600" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="food">Food</option>
              <option value="sightseeing">Sightseeing</option>
              <option value="rest">Rest</option>
              <option value="travel">Travel</option>
              <option value="kids">Kids</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cost</label>
            <input type="number" min="0" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00"
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-600" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Starts At</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:dark]" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ends At</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:dark]" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add details, addresses, or reminders..."
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-slate-600" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center transition-all shadow-lg shadow-indigo-500/20">
            {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />} Save Activity
          </button>
        </div>
      </form>
    </div>
  );
};

export default ActivityForm;