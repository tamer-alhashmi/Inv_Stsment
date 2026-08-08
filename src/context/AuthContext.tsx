import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/types';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isBootstrap: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBootstrap, setIsBootstrap] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Check if bootstrap mode (no admins exist yet) via RPC function
      const { data: bootstrap } = await supabase.rpc('is_bootstrap_mode');
      if (mounted) setIsBootstrap(bootstrap === true);

      const { data: { session } } = await supabase.auth.getSession();
      if (session && mounted) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, email')
          .eq('id', session.user.id)
          .single();

        if (mounted) {
          setUser({
            id: session.user.id,
            email: session.user.email || profile?.email || '',
            role: (profile?.role as UserRole) || 'user',
          });
        }
      }
      if (mounted) setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session) {
          setUser(null);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, email')
          .eq('id', session.user.id)
          .single();

        setUser({
          id: session.user.id,
          email: session.user.email || profile?.email || '',
          role: (profile?.role as UserRole) || 'user',
        });
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isBootstrap }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
