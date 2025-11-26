import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, LogOut, Hexagon } from 'lucide-react';
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
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-screen sticky top-0">
      <div className="p-6 border-b border-slate-800 flex items-center space-x-2">
        <Hexagon className="text-indigo-500 h-6 w-6 fill-indigo-500/20" />
        <span className="text-xl font-bold text-slate-100 tracking-tight">NEST</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <NavLink 
          to="/app" 
          end
          className={({ isActive }) => 
            `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`
          }
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="font-medium">Dashboard</span>
        </NavLink>
        {/* Placeholder for All Trips if we had a separate list page, pointing to dashboard for now */}
        <NavLink 
          to="/app" 
          className={({ isActive }) => 
            `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive ? 'bg-transparent text-slate-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`
          }
        >
          <Map className="h-5 w-5" />
          <span className="font-medium">All Trips</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="px-4 py-2 mb-2">
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Signed in as</p>
          <p className="text-sm text-slate-300 truncate" title={email}>{email}</p>
        </div>
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center space-x-3 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;