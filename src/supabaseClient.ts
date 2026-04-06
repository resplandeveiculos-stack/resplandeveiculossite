import { createClient } from '@supabase/supabase-js';

// Sua nova URL e nova Chave que você acabou de criar!
const supabaseUrl = 'https://tsgqfolyfnziyuekxwyj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzZ3Fmb2x5Zm56aXl1ZWt4d3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTA3MTUsImV4cCI6MjA5MTA4NjcxNX0.79RPieffV1TbCJEOrfvUixVHRg79FCeiDEAeQaBtMS0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);