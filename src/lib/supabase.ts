import { createClient } from '@supabase/supabase-js';

// Supabase project credentials as provided in your AsiaFlix Prime project
export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 'https://wzkipjjgbszldkvwkydv.supabase.co';

export const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_JndNcOb-db3xo84Me6FEXA_QqUn2ocY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const ADMIN_EMAILS = ['dramifyprime@gmail.com', 'dramifydrama@gmail.com'];
export const ADMIN_EMAIL = 'dramifyprime@gmail.com';
