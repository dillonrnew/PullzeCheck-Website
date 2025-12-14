// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lvykhhqznqivfswtijpu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eWtoaHF6bnFpdmZzd3RpanB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMDgzOTMsImV4cCI6MjA2MDY4NDM5M30.OGhXuNCywRSUVwc_x5-l9S3fnH66bvO0ykJWqs9hv-w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
