"use client";

import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getBrowserSupabaseConfigError() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY";
  }

  if (isSecretLikeKey(anonKey)) {
    return "La clave pública de Supabase parece una secret key. Revisa Vercel y usa solo la anon/publishable key.";
  }

  return "";
}

export function createBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const error = getBrowserSupabaseConfigError();

  if (!url || !anonKey || error) return null;

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return browserClient;
}

function isSecretLikeKey(value: string) {
  return value.startsWith("sb_secret_") || value.includes("service_role");
}
