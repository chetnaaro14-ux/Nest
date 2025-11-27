
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Logo from './Logo';

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
    <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 border-r border-white/5 bg-slate-950/80 backdrop-blur-xl z-20">
      <div className="p-8">
        <Logo />
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Main Menu</p>
        <NavLink 
          to="/app" 
          end
          className={({ isActive }) => 
            `flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
              isActive 
                ? 'bg-white/5 text-white shadow-inner border border-white/5' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`
          }
        >
          <LayoutDashboard className={`h-5 w-5 transition-colors ${window.location.hash.endsWith('/app') ? 'text-indigo-400' : 'group-hover:text-indigo-400'}`} />
          <span className="font-medium text-sm">Dashboard</span>
        </NavLink>
      </nav>

      <div className="p-6 border-t border-white/5">
        <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5 mb-4">
           <div className="flex items-center space-x-3 mb-3">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
               {email.charAt(0).toUpperCase()}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-xs font-bold text-white truncate">{email}</p>
               <p className="text-[10px] text-indigo-400">Pro Plan</p>
             </div>
           </div>
        </div>
        
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors uppercase tracking-wider"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;