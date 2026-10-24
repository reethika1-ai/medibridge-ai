import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://zpjxaxfcupjbqpcfosiu.supabase.co";
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || "";

export const supabase = createClient(
  supabaseUrl,
  supabaseSecretKey,
  { auth: { persistSession: false } }
);