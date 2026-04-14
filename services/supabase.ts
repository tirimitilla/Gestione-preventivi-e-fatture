import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRORE CRITICO: Configurazione Supabase mancante!");
  console.log("Assicurati di aver impostato VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nelle variabili d'ambiente.");
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
