import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api, ApiError } from '../lib/api';
import type { Role, UserDto } from '@kids/shared';

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: UserDto | null;
  role: Role | null;
  error: string | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthCtx = createContext<AuthState | undefined>(undefined);

interface MeResponse {
  id: string;
  email: string;
  role: Role | null;
  profile: UserDto | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserDto | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async (current: Session | null): Promise<void> => {
    if (!current) {
      setProfile(null);
      setRole(null);
      return;
    }
    try {
      const me = await api.get<MeResponse>('/auth/me');
      setProfile(me.profile);
      setRole(me.role);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setError('Your account is inactive or has no profile. Contact your administrator.');
        await supabase.auth.signOut();
        setSession(null);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load profile');
      }
      setProfile(null);
      setRole(null);
    }
  };

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
      const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
        setSession(next);
        await loadProfile(next);
      });
      unsub = () => listener.subscription.unsubscribe();
    })();
    return () => unsub?.();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      profile,
      role,
      error,
      async signIn(email, password) {
        setError(null);
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw new Error(signInErr.message);
      },
      async signOut() {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setRole(null);
      },
      async refresh() {
        await loadProfile(session);
      },
    }),
    [loading, session, profile, role, error],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
