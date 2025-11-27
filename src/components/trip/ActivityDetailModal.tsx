
import React, { useState, useEffect } from 'react';
import { Activity, ActivityComment, Trip } from '../../types';
import { X, MapPin, Clock, DollarSign, MessageSquare, Ticket, Send, Loader2, Navigation } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getPlaceDetails } from '../../lib/gemini';

interface ActivityDetailModalProps {
  activity: Activity | null;
  trip: Trip | null;
  onClose: () => void;
}

const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({ activity, trip, onClose }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'comments'>('info');
  
  // Maps State
  const [mapInfo, setMapInfo] = useState<{ text: string, metadata: any } | null>(null);
  const [loadingMap, setLoadingMap] = useState(false);

  // Comments State
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    if (activity) {
      setMapInfo(null);
      setActiveTab('info');
      // Pre-load comments
      fetchComments();
    }
  }, [activity]);

  useEffect(() => {
    if (activeTab === 'location' && !mapInfo && activity && trip) {
      fetchMapInfo();
    }
  }, [activeTab]);

  const fetchMapInfo = async () => {
    if (!activity || !trip) return;
    setLoadingMap(true);
    const query = `${activity.title} in ${trip.destination}`;
    const result = await getPlaceDetails(query);
    setMapInfo({ text: result.text || "No details found.", metadata: result.groundingMetadata });
    setLoadingMap(false);
  };

  const fetchComments = async () => {
    if (!activity) return;
    setLoadingComments(true);
    const { data } = await supabase
      .from('activity_comments')
      .select('*, profiles(email)')
      .eq('activity_id', activity.id)
      .order('created_at', { ascending: true });
    
    if (data) setComments(data as any);
    setLoadingComments(false);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !activity) return;
    setSendingComment(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('activity_comments').insert([{
        activity_id: activity.id,
        user_id: user.id,
        comment: newComment
      }]);
      setNewComment('');
      fetchComments();
    }
    setSendingComment(false);
  };

  if (!activity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-slate-900 w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl border border-white/10 animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-colors">
          <X className="h-5 w-5" />
        </button>

        {/* Left Side: Visuals */}
        <div className="md:w-5/12 h-48 md:h-full bg-slate-950 relative">
          {activity.image_url ? (
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
              style={{ backgroundImage: `url(${activity.image_url})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center">
              <MapPin className="h-16 w-16 text-indigo-500/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
          
          <div className="absolute bottom-6 left-6 right-6">
            <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md text-white border border-white/10 mb-2">
              {activity.category}
            </span>
            <h2 className="text-3xl font-bold text-white leading-tight mb-1">{activity.title}</h2>
            <div className="flex items-center text-slate-300 text-sm">
               <DollarSign className="h-4 w-4 text-emerald-400 mr-1" />
               {activity.cost} estimated
            </div>
          </div>
        </div>

        {/* Right Side: Content */}
        <div className="flex-1 flex flex-col bg-slate-900">
          {/* Tabs */}
          <div className="flex border-b border-white/5 px-6 pt-4">
            {[
              { id: 'info', label: 'Details' },
              { id: 'location', label: 'Location & Map' },
              { id: 'comments', label: 'Discussion' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 px-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-8 relative">
            
            {/* TAB: INFO */}
            {activeTab === 'info' && (
              <div className="space-y-8 animate-fade-in">
                {activity.logistics && (
                  <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-5">
                    <h4 className="text-indigo-300 font-bold text-sm uppercase tracking-wide mb-3 flex items-center">
                      <Ticket className="h-4 w-4 mr-2" /> Logistics
                    </h4>
                    <p className="text-indigo-100 text-lg font-medium">{activity.logistics}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                   <div className="bg-slate-800/50 p-4 rounded-xl">
                      <p className="text-slate-500 text-xs font-bold uppercase mb-1">Start Time</p>
                      <p className="text-white font-mono text-lg flex items-center"><Clock className="h-4 w-4 mr-2 text-slate-400"/> {activity.start_time?.slice(0,5) || '--:--'}</p>
                   </div>
                   <div className="bg-slate-800/50 p-4 rounded-xl">
                      <p className="text-slate-500 text-xs font-bold uppercase mb-1">End Time</p>
                      <p className="text-white font-mono text-lg flex items-center"><Clock className="h-4 w-4 mr-2 text-slate-400"/> {activity.end_time?.slice(0,5) || '--:--'}</p>
                   </div>
                </div>

                <div>
                  <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-3">Notes</h4>
                  <p className="text-slate-200 leading-relaxed text-sm bg-slate-800/30 p-4 rounded-xl border border-white/5">
                    {activity.notes || "No additional notes."}
                  </p>
                </div>
              </div>
            )}

            {/* TAB: LOCATION (MAPS GROUNDING) */}
            {activeTab === 'location' && (
               <div className="space-y-6 animate-fade-in h-full flex flex-col">
                  {loadingMap ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-indigo-400">
                      <Loader2 className="h-8 w-8 animate-spin mb-3" />
                      <p className="text-sm font-medium">Finding exact location on Google Maps...</p>
                    </div>
                  ) : mapInfo ? (
                    <div className="space-y-6">
                       <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl">
                          <h4 className="text-emerald-400 font-bold text-sm uppercase tracking-wide mb-2 flex items-center">
                             <Navigation className="h-4 w-4 mr-2" /> AI Location Summary
                          </h4>
                          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{mapInfo.text}</p>
                       </div>

                       {mapInfo.metadata?.groundingChunks?.map((chunk: any, idx: number) => {
                          // Extract Google Maps Links
                          if (chunk.web?.uri && (chunk.web.uri.includes('google.com/maps') || chunk.web.title?.includes('Map'))) {
                             return (
                               <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" 
                                  className="block bg-slate-800 hover:bg-slate-700 transition-colors p-4 rounded-xl border border-white/10 group">
                                  <div className="flex justify-between items-center">
                                     <div className="flex items-center space-x-3">
                                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                                           <MapPin className="h-5 w-5" />
                                        </div>
                                        <div>
                                           <p className="text-white font-bold group-hover:text-blue-400 transition-colors">Open in Google Maps</p>
                                           <p className="text-slate-500 text-xs">{chunk.web.title}</p>
                                        </div>
                                     </div>
                                     <Navigation className="h-4 w-4 text-slate-500 group-hover:text-white" />
                                  </div>
                               </a>
                             )
                          }
                          return null;
                       })}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500">
                       <p>Unable to load map data.</p>
                    </div>
                  )}
               </div>
            )}

            {/* TAB: COMMENTS */}
            {activeTab === 'comments' && (
              <div className="flex flex-col h-full">
                 <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                    {loadingComments ? (
                       <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500"/></div>
                    ) : comments.length === 0 ? (
                       <div className="text-center text-slate-500 py-10 flex flex-col items-center">
                          <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                          <p>No discussions yet.</p>
                       </div>
                    ) : (
                       comments.map(c => (
                          <div key={c.id} className="bg-slate-800/50 p-4 rounded-2xl rounded-tl-none border border-white/5">
                             <div className="flex justify-between items-baseline mb-2">
                                <span className="text-indigo-300 text-xs font-bold">{c.profiles?.email?.split('@')[0]}</span>
                                <span className="text-[10px] text-slate-600">{new Date(c.created_at).toLocaleDateString()}</span>
                             </div>
                             <p className="text-slate-300 text-sm">{c.comment}</p>
                          </div>
                       ))
                    )}
                 </div>
                 
                 <form onSubmit={handleSendComment} className="relative">
                    <input 
                      value={newComment} onChange={e => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button disabled={!newComment.trim() || sendingComment} type="submit" className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50">
                       {sendingComment ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </button>
                 </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailModal;