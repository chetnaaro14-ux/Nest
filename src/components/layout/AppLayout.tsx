import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading NEST...</div>;

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100 font-sans">
      <Sidebar />
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-900 border-b border-slate-800 p-4 z-50 flex justify-between items-center">
        <span className="font-bold text-lg">NEST</span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-400">
          <Menu />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900 pt-20 px-6">
           <div className="space-y-4">
             <button onClick={() => navigate('/app')} className="block text-xl font-medium text-slate-300">Dashboard</button>
             <button onClick={() => supabase.auth.signOut()} className="block text-xl font-medium text-red-400">Sign Out</button>
             <button onClick={() => setMobileMenuOpen(false)} className="mt-8 text-sm text-slate-500">Close Menu</button>
           </div>
        </div>
      )}

      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-8 w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;