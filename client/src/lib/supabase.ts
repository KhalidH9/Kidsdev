import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Surfaced on first call; intentionally not throwing at import time to allow
  // the UI shell to render with a clear error message.
  console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in env');
}

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'anon', {
  auth: { persistSession: true, autoRefreshToken: true },
});
