import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function createServerSupabaseClient(accessToken?: string) {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    global: accessToken
      ? {
          headers: {
            authorization: `Bearer ${accessToken}`
          }
        }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
