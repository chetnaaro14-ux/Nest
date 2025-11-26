import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { TripMember } from '../../types';
import { UserPlus, User, Loader2 } from 'lucide-react';

interface CollaboratorsPanelProps {
  tripId: string;
}

const CollaboratorsPanel: React.FC<CollaboratorsPanelProps> = ({ tripId }) => {
  const [members, setMembers] = useState<TripMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchMembers = async () => {
    // Assuming profiles are joined or we only have IDs. 
    // To display emails, we usually need to select from profiles.
    const { data, error } = await supabase
      .from('trip_members')
      .select('*, profiles(email)')
      .eq('trip_id', tripId);

    if (!error && data) {
      setMembers(data as unknown as TripMember[]);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [tripId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 1. Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError || !profiles) {
        setMessage('User not found. They must sign up for NEST first.');
        setLoading(false);
        return;
      }

      // 2. Check if already member
      const existing = members.find(m => m.user_id === profiles.id);
      if (existing) {
        setMessage('User is already a member.');
        setLoading(false);
        return;
      }

      // 3. Insert member
      const { error: insertError } = await supabase
        .from('trip_members')
        .insert([{
          trip_id: tripId,
          user_id: profiles.id,
          role: role
        }]);

      if (insertError) throw insertError;
      
      setMessage('Member added!');
      setEmail('');
      fetchMembers();

    } catch (err) {
      console.error(err);
      setMessage('Failed to invite user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 mb-8">
      <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center">
        <UserPlus className="h-5 w-5 mr-2 text-indigo-400" />
        Collaborators
      </h3>
      
      <div className="space-y-3 mb-6">
        {members.map(member => (
          <div key={member.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
             <div className="flex items-center space-x-3">
               <div className="bg-slate-800 p-2 rounded-full">
                 <User className="h-4 w-4 text-slate-400" />
               </div>
               <div>
                 <p className="text-sm font-medium text-slate-200">{member.profiles?.email || 'Unknown User'}</p>
                 <p className="text-xs text-slate-500 capitalize">{member.role}</p>
               </div>
             </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleInvite} className="flex flex-col space-y-3">
        <input 
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Invite by email..."
          className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
        />
        <div className="flex space-x-2">
          <select 
            value={role}
            onChange={e => setRole(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none w-1/3"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button 
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg p-2 flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Invite"}
          </button>
        </div>
        {message && <p className={`text-xs ${message.includes('added') ? 'text-green-400' : 'text-amber-400'}`}>{message}</p>}
      </form>
    </div>
  );
};

export default CollaboratorsPanel;