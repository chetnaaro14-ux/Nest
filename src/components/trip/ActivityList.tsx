import React from 'react';
import { Activity } from '../../types';
import { Clock, DollarSign, MessageSquare, Trash2, MapPin } from 'lucide-react';

interface ActivityListProps {
  activities: Activity[];
  onDelete: (id: string) => void;
  onOpenComments: (activity: Activity) => void;
}

const categoryStyles: Record<string, { bg: string, text: string, border: string }> = {
  food: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  sightseeing: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  rest: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  travel: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  kids: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
};

const ActivityList: React.FC<ActivityListProps> = ({ activities, onDelete, onOpenComments }) => {
  if (activities.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <MapPin className="h-6 w-6 text-slate-600" />
        </div>
        <p className="text-slate-400 font-medium">No plans for this day yet.</p>
        <p className="text-slate-600 text-sm mt-1">Use the form below or AI to add activities.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 before:absolute before:left-24 before:top-4 before:bottom-4 before:w-px before:bg-slate-800/50 hidden md:block">
       {/* Mobile/Simple View Fallback handled via CSS classes or keep simple structure for responsive */}
      {activities.map((activity) => {
        const style = categoryStyles[activity.category] || { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' };
        
        return (
          <div key={activity.id} className="relative flex group">
            {/* Time Column */}
            <div className="w-24 flex-shrink-0 flex flex-col items-end pr-6 pt-1">
              <span className="text-sm font-bold text-slate-200">{activity.start_time ? activity.start_time.slice(0, 5) : '--:--'}</span>
              <span className="text-xs text-slate-500">{activity.end_time ? activity.end_time.slice(0, 5) : ''}</span>
            </div>

            {/* Timeline Dot */}
            <div className={`absolute left-[5.75rem] top-2 w-3 h-3 rounded-full border-2 border-slate-950 ${style.text.replace('text-', 'bg-')} z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}></div>

            {/* Card */}
            <div className="flex-1 glass-card border border-white/5 rounded-2xl p-5 hover:border-slate-600/50 transition-all hover:bg-slate-800/30">
              <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                      {activity.category}
                    </span>
                 </div>
                 <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onOpenComments(activity)} className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors">
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(activity.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                 </div>
              </div>

              <h4 className="text-lg font-bold text-slate-100 mb-1">{activity.title}</h4>
              {activity.notes && <p className="text-slate-400 text-sm mb-3 leading-relaxed">{activity.notes}</p>}

              <div className="flex items-center pt-3 border-t border-white/5">
                <div className="flex items-center text-slate-300 font-mono text-sm">
                   <DollarSign className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                   {activity.cost}
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