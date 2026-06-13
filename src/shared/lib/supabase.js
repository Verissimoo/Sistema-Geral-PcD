import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('Faltam variáveis de ambiente do Supabase (VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY). O cliente não será inicializado corretamente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
