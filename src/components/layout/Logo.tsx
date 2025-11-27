
import React from 'react';
import { Hexagon } from 'lucide-react';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "", collapsed = false }) => {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-indigo-500 blur-sm opacity-50 rounded-full"></div>
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-2 rounded-xl shadow-lg relative z-10 border border-white/10">
          <Hexagon className="text-white h-5 w-5 fill-indigo-400/20" strokeWidth={2.5} />
        </div>
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="text-xl font-bold text-white tracking-tight leading-none">NEST</span>
          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] leading-none mt-0.5">Travel OS</span>
        </div>
      )}
    </div>
  );
};

export default Logo;