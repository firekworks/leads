import { NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { InternalProfile, InternalRole } from "@/types/auth";

type RequireOptions = {
  write?: boolean;
  admin?: boolean;
};

type ProfileRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: InternalRole;
  is_active: boolean;
};

export async function requireInternalUser(request: Request, options: RequireOptions = {}) {
  const { url, anonKey } = getSupabaseConfig();
  const admin = createAdminClient();

  if (!url || !anonKey) {
    return { response: NextResponse.json({ error: "Supabase no configurado" }, { status: 503 }) };
  }

  const token = bearerToken(request);
  if (!token) {
    return { response: NextResponse.json({ error: "Sesión interna requerida" }, { status: 401 }) };
  }

  const authClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const { data, error } = await authClient.auth.getUser(token);
  const user = data.user;

  if (error || !user?.id || !user.email) {
    return { response: NextResponse.json({ error: "Sesión inválida" }, { status: 401 }) };
  }

  const dataClient = admin || createUserScopedClient(url, anonKey, token);
  const profile = await getOrBootstrapProfile(dataClient, user, Boolean(admin));

  if (!profile || !profile.is_active) {
    return {
      response: NextResponse.json(
        { error: "Usuario sin acceso interno. Añádelo en la tabla profiles." },
        { status: 403 }
      )
    };
  }

  if (options.admin && profile.role !== "admin") {
    return { response: NextResponse.json({ error: "Rol admin requerido" }, { status: 403 }) };
  }

  if (options.write && profile.role === "viewer") {
    return { response: NextResponse.json({ error: "Rol de ventas o admin requerido" }, { status: 403 }) };
  }

  return {
    admin: dataClient,
    user,
    profile: {
      userId: profile.user_id,
      email: profile.email,
      fullName: profile.full_name || "",
      role: profile.role
    } satisfies InternalProfile
  };
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function createUserScopedClient(url: string, anonKey: string, token: string) {
  return createClient(url, anonKey, {
    global: {
      headers: {
        authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function getOrBootstrapProfile(client: SupabaseClient, user: User, canBootstrap: boolean) {
  const { data, error } = await client
    .from("profiles")
    .select("user_id,email,full_name,role,is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  const profile = data as ProfileRow | null;

  if (error) return null;
  if (profile) return profile;
  if (!canBootstrap) return null;

  const allowedEmails = (process.env.INTERNAL_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedEmails.includes((user.email || "").toLowerCase())) {
    return null;
  }

  const { data: insertedData, error: insertError } = await client
    .from("profiles")
    .insert({
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "",
      role: "admin",
      is_active: true
    })
    .select("user_id,email,full_name,role,is_active")
    .single();
  const inserted = insertedData as ProfileRow | null;

  return insertError ? null : inserted;
}
