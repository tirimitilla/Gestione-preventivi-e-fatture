import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hkpyrcmtxaxvhfnoyorf.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_kzPMqpjdU8ykd7nfFdhK9g_C7REErt3';

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase URL o Key mancanti. Configura VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nelle impostazioni.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
