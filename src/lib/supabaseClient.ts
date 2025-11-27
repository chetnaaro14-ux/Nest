import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// REAL SUPABASE CLIENT
// ------------------------------------------------------------------

const supabaseUrl = 'https://agqiimoegmxeofasjnxb.supabase.co';
const supabaseKey = 'sb_publishable_WWllEBVlP4W4IIclujb8lg_8AGjIIiM';

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key is missing!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log("%c NEST CONNECTED TO SUPABASE ", "background: #10b981; color: #fff; padding: 4px; border-radius: 4px;");
