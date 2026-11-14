import { createClient, type User, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isConfigured: isSupabaseConfigured,
  };
}

export interface AuthSessionState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  lastSyncedAt: string | null;
}

export type { User, Session };
