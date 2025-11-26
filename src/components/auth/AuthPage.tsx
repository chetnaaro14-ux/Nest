import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock } from 'lucide-react';

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
          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, email: data.user.email }]);
          
          if (profileError) {
             console.error("Profile creation failed, usually implies it already exists or trigger issue", profileError);
          }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-center text-slate-100 mb-2">NEST</h2>
          <p className="text-center text-slate-400 mb-8">Family Travel OS</p>

          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                mode === 'signin' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                mode === 'signup' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-600"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            
            {message && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'
              )}
            </button>
          </form>

          {mode === 'signin' && (
            <div className="mt-4 text-center">
              <button 
                onClick={() => { setMode('forgot'); setError(null); setMessage(null); }}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                Forgot password?
              </button>
            </div>
          )}
          
          {mode === 'forgot' && (
            <div className="mt-4 text-center">
              <button 
                onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;