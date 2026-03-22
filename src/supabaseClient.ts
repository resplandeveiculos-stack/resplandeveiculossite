import { createClient } from '@supabase/supabase-js';

// Esses dados são exclusivos do seu projeto "Resplande Veículos"
const supabaseUrl = 'https://usiolknyxcpvnslvbrzv.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaW9sa255eGNwdm5zbHZicnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTUzMDIsImV4cCI6MjA4OTc5MTMwMn0.0t5edQuAittli91GtQZm7SEAyKfICiTvrGWZPpHe0RA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
