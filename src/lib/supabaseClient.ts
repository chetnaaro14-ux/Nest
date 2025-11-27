import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(https://agqiimoegmxeofasjnxb.supabase.co, eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncWlpbW9lZ214ZW9mYXNqbnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDI3NTAsImV4cCI6MjA3OTgxODc1MH0.eXIPw3ZckWVjgI2FEjD_AzrtvfHLe5nstspuZ1GDtHg)

console.log("%c NEST CONNECTED TO SUPABASE ", "background: #10b981; color: #fff; padding: 4px; border-radius: 4px;");
