
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkpyrcmtxaxvhfnoyorf.supabase.co';
const supabaseKey = 'sb_publishable_kzPMqpjdU8ykd7nfFdhK9g_C7REErt3';

export const supabase = createClient(supabaseUrl, supabaseKey);
