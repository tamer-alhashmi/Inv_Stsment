import { useState, useEffect } from 'react';
import { Building2, Mail, Lock, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLoadingBar } from '@/components/LoadingBar';

export function LoginPage() {
  const { signIn, isBootstrap } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>(isBootstrap ? 'signup' : 'login');
  const { start, done } = useLoadingBar();

  useEffect(() => {
    setMode(isBootstrap ? 'signup' : 'login');
  }, [isBootstrap]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    start();

    if (mode === 'signup') {
      if (!isBootstrap) {
        setError('Sign-up is not available. Please contact your administrator.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Set role to admin via direct update — in bootstrap the trigger
        // creates the profile as 'user', so we update it. This works because
        // in bootstrap mode (zero profiles) RLS on UPDATE is authenticated-only
        // with self-check, and the user just signed in.
        await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', data.user.id);

        // Auto sign-in
        await signIn(email, password);
      }
    } else {
      const { error: signInError } = await signIn(email, password);
      if (signInError) setError(signInError);
    }

    setLoading(false);
    done();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-blue-600/30">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">InvoiceHub</h1>
          <p className="text-xs text-gray-500 mt-0.5">Finance Document System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {isBootstrap && (
            <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
              <div className="flex gap-2.5">
                <UserPlus size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-semibold">Welcome! Set up your admin account</p>
                  <p className="mt-0.5 text-blue-600/80">This first account becomes the system administrator.</p>
                </div>
              </div>
            </div>
          )}

          <h2 className="text-sm font-semibold text-gray-900 mb-1">
            {mode === 'login' ? 'Sign in to your account' : 'Create admin account'}
          </h2>
          <p className="text-xs text-gray-400 mb-5">
            {mode === 'login' ? 'Enter your credentials below' : 'Set up the first administrator'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-lg">
                <AlertCircle size={15} className="shrink-0" />
                <span className="text-xs">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {!isBootstrap && mode === 'login' && (
            <p className="text-center text-xs text-gray-400 mt-5">
              Don&apos;t have an account? Contact your administrator.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
