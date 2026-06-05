import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("El cliente admin de Supabase no puede usarse en el navegador");
  }

  const { url, secretKey } = getSupabaseConfig();

  if (!url || !secretKey) {
    return null;
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
