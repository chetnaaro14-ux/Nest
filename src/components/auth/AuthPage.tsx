
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, Compass, ArrowRight } from 'lucide-react';
import Logo from '../layout/Logo';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          await supabase.from('profiles').insert([{ id: data.user.id, email: data.user.email }]);
          navigate('/app');
        }
      } else if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        navigate('/app');
      } else if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/#/reset-password',
        });
        if (resetError) throw resetError;
        setMessage("If an account exists, you will receive a password reset link.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      navigate('/app');
    } catch (err: any) {
      setError(err.message || "Failed to sign in as guest");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2021&q=80")' }}
      >
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up border border-white/10">
          
          {/* Header */}
          <div className="pt-10 pb-6 flex justify-center">
            <Logo />
          </div>

          <div className="px-8 pb-8">
            {/* Toggle Switch */}
            <div className="flex p-1 bg-slate-900/60 rounded-xl mb-8 relative border border-white/5">
              <div 
                className={`absolute inset-y-1 w-1/2 bg-indigo-600 rounded-lg shadow-lg transition-transform duration-300 ease-out ${mode === 'signup' ? 'translate-x-full' : 'translate-x-0'}`}
              ></div>
              <button
                onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                className={`flex-1 relative z-10 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${mode === 'signin' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                className={`flex-1 relative z-10 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${mode === 'signup' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-4">
                <div className="group relative">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                    placeholder="Email address"
                  />
                </div>

                {mode !== 'forgot' && (
                  <div className="group relative">
                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                      placeholder="Password"
                    />
                  </div>
                )}

                {mode === 'signup' && (
                  <div className="group relative">
                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                      placeholder="Confirm Password"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3 rounded-lg flex items-center">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                  {error}
                </div>
              )}
              
              {message && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs p-3 rounded-lg flex items-center">
                   <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
                   {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {mode === 'signin' && (
              <div className="mt-4 text-center">
                <button 
                  onClick={() => { setMode('forgot'); setError(null); setMessage(null); }}
                  className="text-xs text-slate-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}
            
            {mode === 'forgot' && (
              <div className="mt-4 text-center">
                <button 
                  onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                  className="text-xs text-slate-400 hover:text-indigo-300 transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="mt-8 pt-6 border-t border-slate-700/50">
                <button
                  onClick={handleGuestLogin}
                  disabled={loading}
                  className="w-full bg-slate-900/30 hover:bg-slate-800/50 border border-slate-700 text-slate-300 font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 group"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <>
                      <Compass className="h-5 w-5 text-indigo-400 group-hover:rotate-45 transition-transform duration-500" />
                      <span>Explore as Guest</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;