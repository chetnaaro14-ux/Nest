import React from 'react';
import { Day } from '../../types';

interface DayTabsProps {
  days: Day[];
  selectedDayId: string | null;
  onSelectDay: (id: string) => void;
}

const DayTabs: React.FC<DayTabsProps> = ({ days, selectedDayId, onSelectDay }) => {
  return (
    <div className="flex overflow-x-auto space-x-2 pb-4 mb-4 scrollbar-hide">
      {days.map((day) => {
        const date = new Date(day.date);
        const isSelected = selectedDayId === day.id;
        
        return (
          <button
            key={day.id}
            onClick={() => onSelectDay(day.id)}
            className={`flex-shrink-0 px-4 py-3 rounded-xl border transition-all ${
              isSelected 
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            }`}
          >
            <span className="block text-xs font-semibold uppercase tracking-wider mb-1">Day {day.index + 1}</span>
            <span className="block text-sm font-bold">{date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</span>
          </button>
        );
      })}
    </div>
  );
};

export default DayTabs;