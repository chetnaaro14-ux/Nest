import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut, Hexagon } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const Sidebar: React.FC = () => {
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email || '');
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-white/5 bg-slate-950/50 backdrop-blur-xl">
      <div className="p-8 pb-4">
        <div className="flex items-center space-x-3 mb-8">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <Hexagon className="text-white h-5 w-5 fill-white/20" />
          </div>
          <span className="text-xl font-bold text-slate-100 tracking-tight">NEST</span>
        </div>
        
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Menu</div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <NavLink 
          to="/app" 
          end
          className={({ isActive }) => 
            `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isActive 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`
          }
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="font-medium">Dashboard</span>
        </NavLink>
      </nav>

      <div className="p-6 border-t border-white/5">
        <div className="flex items-center space-x-3 px-2 mb-4 opacity-70">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
            {email.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{email}</p>
            <p className="text-[10px] text-slate-500">Free Plan</p>
          </div>
        </div>
        
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;