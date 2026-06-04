import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

const publicPrefixes = ["/login", "/auth", "/error"];

export async function updateSession(request: NextRequest) {
  const { url, anonKey, isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url!, anonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers = {}) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      }
    }
  });

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = publicPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isApiRoute = pathname.startsWith("/api");

  if (isPublicRoute || isApiRoute) {
    return supabaseResponse;
  }

  const { data } = await supabase.auth.getClaims();
  let isAuthenticated = Boolean(data?.claims);

  if (!isAuthenticated) {
    const { data: userData } = await supabase.auth.getUser();
    isAuthenticated = Boolean(userData.user);
  }

  if (!isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
