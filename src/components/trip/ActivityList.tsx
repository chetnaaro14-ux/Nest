import React from 'react';
import { Activity } from '../../types';
import { Clock, DollarSign, MessageSquare, Trash2 } from 'lucide-react';

interface ActivityListProps {
  activities: Activity[];
  onDelete: (id: string) => void;
  onOpenComments: (activity: Activity) => void;
}

const categoryColors: Record<string, string> = {
  food: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  sightseeing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  rest: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  travel: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  kids: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

const ActivityList: React.FC<ActivityListProps> = ({ activities, onDelete, onOpenComments }) => {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
        <p className="text-slate-500">This day is empty. Add a meal, walk, or a rest block.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="group bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-colors flex flex-col md:flex-row gap-4 relative">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase border ${categoryColors[activity.category] || 'bg-slate-700 text-slate-300'}`}>
                {activity.category}
              </span>
              <div className="flex items-center text-slate-400 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {activity.start_time?.slice(0, 5)} - {activity.end_time?.slice(0, 5)}
              </div>
            </div>
            <h4 className="text-lg font-bold text-slate-100">{activity.title}</h4>
            {activity.notes && <p className="text-slate-400 text-sm mt-1">{activity.notes}</p>}
          </div>

          <div className="flex items-center gap-4 border-t border-slate-800 md:border-0 pt-3 md:pt-0 mt-2 md:mt-0">
            <div className="flex items-center text-slate-300 font-mono text-sm bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
              <DollarSign className="h-3 w-3 mr-1 text-emerald-400" />
              {activity.cost}
            </div>
            
            <button 
              onClick={() => onOpenComments(activity)}
              className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
              title="Comments"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            
            <button 
              onClick={() => onDelete(activity.id)}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityList;