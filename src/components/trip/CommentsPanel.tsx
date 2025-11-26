import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Activity, ActivityComment } from '../../types';
import { X, Send, Loader2 } from 'lucide-react';

interface CommentsPanelProps {
  activity: Activity | null;
  onClose: () => void;
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({ activity, onClose }) => {
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activity) {
      fetchComments();
    }
  }, [activity]);

  const fetchComments = async () => {
    if (!activity) return;
    setLoading(true);
    // Fetch comments and join with profiles to get email
    // Since Supabase JS client join syntax can be tricky with types, we might need a view or simple fetch
    // We'll fetch comments then fetch profiles manually if join is complex, but let's try standard select
    
    // Note: 'profiles' table join requires foreign key setup properly. 
    // Assuming 'user_id' in activity_comments refs profiles.id
    
    const { data, error } = await supabase
      .from('activity_comments')
      .select('*, profiles(email)')
      .eq('activity_id', activity.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data as unknown as ActivityComment[]);
    }
    setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !activity) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('activity_comments').insert([{
        activity_id: activity.id,
        user_id: user.id,
        comment: newComment
      }]);
      
      if (!error) {
        setNewComment('');
        fetchComments();
      }
    }
    setSubmitting(false);
  };

  if (!activity) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      
      <div className="w-full max-w-md bg-slate-900 h-full shadow-2xl pointer-events-auto flex flex-col border-l border-slate-800">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Comments</h3>
            <p className="text-sm text-slate-400 truncate max-w-[250px]">{activity.title}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : comments.length === 0 ? (
            <div className="text-center text-slate-500 py-10">No comments yet.</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex flex-col">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-bold text-indigo-400">{comment.profiles?.email?.split('@')[0]}</span>
                  <span className="text-[10px] text-slate-600">{new Date(comment.created_at).toLocaleString()}</span>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg rounded-tl-none text-sm text-slate-200">
                  {comment.comment}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex space-x-2">
            <input
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Type a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={submitting || !newComment.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
            >
              {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentsPanel;