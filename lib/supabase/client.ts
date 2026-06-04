import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function createClient() {
  const { url, anonKey, isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    return null;
  }

  return createBrowserClient(url!, anonKey!);
}
