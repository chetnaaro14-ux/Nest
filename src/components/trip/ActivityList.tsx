
import React from 'react';
import { Activity } from '../../types';
import { Clock, Trash2, MapPin, ChevronRight, Ticket, Utensils, Camera, BedDouble, Plane, Smile } from 'lucide-react';

interface ActivityListProps {
  activities: Activity[];
  onDelete: (id: string) => void;
  onOpenComments: (activity: Activity) => void;
}

const categoryConfig: Record<string, { bg: string, text: string, icon: React.FC<any>, gradient: string, fallbackImage: string }> = {
  food: { 
    bg: 'bg-orange-500/20', 
    text: 'text-orange-400', 
    icon: Utensils, 
    gradient: 'from-orange-900 to-slate-900',
    fallbackImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=60' // Dark food
  },
  sightseeing: { 
    bg: 'bg-blue-500/20', 
    text: 'text-blue-400', 
    icon: Camera, 
    gradient: 'from-blue-900 to-slate-900',
    fallbackImage: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=60' // Nature/Landscape
  },
  rest: { 
    bg: 'bg-emerald-500/20', 
    text: 'text-emerald-400', 
    icon: BedDouble, 
    gradient: 'from-emerald-900 to-slate-900',
    fallbackImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=60' // Cozy room
  },
  travel: { 
    bg: 'bg-purple-500/20', 
    text: 'text-purple-400', 
    icon: Plane, 
    gradient: 'from-purple-900 to-slate-900',
    fallbackImage: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=60' // Airplane wing
  },
  kids: { 
    bg: 'bg-pink-500/20', 
    text: 'text-pink-400', 
    icon: Smile, 
    gradient: 'from-pink-900 to-slate-900',
    fallbackImage: 'https://images.unsplash.com/photo-1502086223501-681a9134277b?auto=format&fit=crop&w=800&q=60' // Fun/Balloons
  },
};

const ActivityList: React.FC<ActivityListProps> = ({ activities, onDelete, onOpenComments }) => {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-800/50">
        <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
            <MapPin className="h-10 w-10 text-slate-600" />
        </div>
        <p className="text-slate-300 font-bold text-xl mb-2">It's quiet here...</p>
        <p className="text-slate-500 text-sm max-w-xs text-center">Add an activity manually or switch to the AI Assistant tab to generate ideas.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      {/* Vertical Line */}
      <div className="absolute left-[28px] md:left-[120px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-slate-800 opacity-20"></div>
      
      {activities.map((activity) => {
        const config = categoryConfig[activity.category] || categoryConfig['sightseeing'];
        const Icon = config.icon;
        
        return (
          <div key={activity.id} className="relative flex group items-start">
            
            {/* Time Column (Desktop) */}
            <div className="w-28 flex-shrink-0 hidden md:flex flex-col items-end pr-8 pt-6">
              <span className="text-xl font-bold text-slate-200 font-mono tracking-tight">{activity.start_time ? activity.start_time.slice(0, 5) : '--:--'}</span>
              <span className="text-xs text-slate-500 font-medium mt-1">{activity.end_time ? activity.end_time.slice(0, 5) : ''}</span>
            </div>

            {/* Timeline Dot */}
            <div className={`absolute left-[19px] md:left-[111px] top-8 w-5 h-5 rounded-full border-4 border-slate-950 ${config.bg.replace('/20', '')} z-10 shadow-[0_0_15px_rgba(99,102,241,0.4)]`}></div>

            {/* Card */}
            <div 
              onClick={() => onOpenComments(activity)}
              className="flex-1 ml-10 md:ml-0 glass-card border border-white/5 rounded-3xl overflow-hidden hover:border-indigo-500/40 transition-all hover:bg-slate-800/60 cursor-pointer group/card shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
            >
              <div className="flex flex-col md:flex-row">
                
                {/* Large Image Section */}
                <div className="h-48 md:h-auto md:w-1/3 bg-slate-900 relative overflow-hidden">
                   {activity.image_url ? (
                     <div 
                       className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover/card:scale-110" 
                       style={{ backgroundImage: `url(${activity.image_url})` }} 
                     />
                   ) : activity.image_prompt ? (
                     // If generating, show gradient + spinner
                     <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-80 flex items-center justify-center`}>
                        <div className="text-center px-4">
                          <div className="inline-block animate-spin mb-2 w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                          <p className="text-[10px] text-white/70 uppercase tracking-widest font-bold">Generating Visual...</p>
                        </div>
                     </div>
                   ) : (
                     // Fallback static image if no generation planned
                     <div 
                       className="absolute inset-0 bg-cover bg-center opacity-80 transition-transform duration-700 group-hover/card:scale-110"
                       style={{ backgroundImage: `url(${config.fallbackImage})` }}
                     >
                       <div className="absolute inset-0 bg-indigo-900/30 mix-blend-multiply"></div>
                     </div>
                   )}
                   
                   {/* Mobile Time Overlay */}
                   <div className="md:hidden absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-white font-mono text-xs font-bold border border-white/10">
                      {activity.start_time?.slice(0,5) || 'Time TBD'}
                   </div>
                </div>

                {/* Content Section */}
                <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-2">
                     <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.text}`}>
                        <Icon className="h-3 w-3 mr-1.5" />
                        {activity.category}
                     </span>
                     
                     <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(activity.id); }} 
                        className="opacity-0 group-hover/card:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                  </div>

                  <h4 className="text-2xl font-bold text-slate-100 mb-3 leading-tight group-hover/card:text-indigo-300 transition-colors">{activity.title}</h4>
                  
                  {activity.logistics && (
                    <div className="mb-4 flex items-center text-xs text-indigo-300 font-bold bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-500/10 w-fit">
                       <Ticket className="h-3.5 w-3.5 mr-2" />
                       {activity.logistics}
                    </div>
                  )}

                  <p className="text-slate-400 text-sm line-clamp-2 mb-4">{activity.notes || "No details provided."}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                     <div className="flex items-center text-emerald-400 font-mono text-sm font-bold bg-emerald-500/10 px-3 py-1 rounded-full">
                        <span className="mr-1">₹</span>
                        {activity.cost}
                     </div>
                     <div className="flex items-center text-xs text-white font-bold uppercase tracking-wider group-hover/card:translate-x-1 transition-transform">
                        Explore <ChevronRight className="h-3.5 w-3.5 ml-1 text-indigo-400" />
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityList;
