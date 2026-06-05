"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserClient, getBrowserSupabaseConfigError } from "@/lib/supabase/client";
import type { InternalProfile } from "@/types/auth";

type AuthContextValue = {
  accessToken: string;
  profile: InternalProfile;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_TIMEOUT_MS = 7000;
const INTERNAL_ALIASES: Record<string, string> = {
  iker: "firekworks@gmail.com"
};
let cachedSession: Session | null = null;
let cachedProfile: InternalProfile | null = null;

export function useInternalAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useInternalAuth debe usarse dentro de AuthGate");
  }
  return context;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(() => cachedSession);
  const [profile, setProfile] = useState<InternalProfile | null>(() => cachedProfile);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Comprobando sesión interna");
  const [resetMessage, setResetMessage] = useState("");
  const [loading, setLoading] = useState(!cachedSession);
  const [submitting, setSubmitting] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [bootKey, setBootKey] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setMessage(getBrowserSupabaseConfigError() || "Supabase no disponible");
      setLoading(false);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      if (!active) return;
      setMessage("La comprobación tarda demasiado. Reintenta o revisa conexión.");
      setLoading(false);
    }, SESSION_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        window.clearTimeout(timeout);
        cachedSession = data.session;
        setSession(data.session);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        window.clearTimeout(timeout);
        setMessage(error instanceof Error ? error.message : "No se pudo comprobar la sesión");
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const changedUser = cachedSession?.user?.id !== nextSession?.user?.id;
      cachedSession = nextSession;
      if (!nextSession || changedUser) cachedProfile = null;
      setSession(nextSession);
      if (!nextSession || changedUser) setProfile(null);
    });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, [supabase, bootKey]);

  useEffect(() => {
    if (!session?.access_token) {
      setProfile(null);
      cachedProfile = null;
      return;
    }

    if (cachedProfile && cachedSession?.access_token === session.access_token) {
      setProfile(cachedProfile);
      setMessage("");
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS);
    setMessage("Validando perfil interno");
    setCheckingProfile(true);

    fetch("/api/session/profile", {
      headers: {
        authorization: `Bearer ${session.access_token}`
      },
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = (await response.json()) as { profile?: InternalProfile; error?: string };
        if (!response.ok || !payload.profile) throw new Error(payload.error || "Sin acceso interno");
        return payload.profile;
      })
      .then((nextProfile) => {
        if (!active) return;
        cachedProfile = nextProfile;
        setProfile(nextProfile);
        setMessage("");
      })
      .catch((error) => {
        if (!active) return;
        setProfile(null);
        setMessage(error instanceof Error && error.name === "AbortError" ? "Validación lenta. Reintenta." : error instanceof Error ? error.message : "No se pudo validar el perfil");
      })
      .finally(() => {
        if (!active) return;
        window.clearTimeout(timeout);
        setCheckingProfile(false);
      });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [session]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setResetMessage("");
    setMessage("Entrando");
    const loginEmail = normalizeLogin(email);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password
    });

    if (error) {
      setMessage("Usuario o contraseña incorrectos");
    }

    setSubmitting(false);
  }

  async function handleResetPassword() {
    if (!supabase) return;
    const loginEmail = normalizeLogin(email);

    if (!loginEmail.includes("@")) {
      setResetMessage("Escribe tu email interno para recuperar contraseña");
      return;
    }

    setSubmitting(true);
    setResetMessage("");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${appUrl}/auth/update-password`
    });

    setSubmitting(false);
    setResetMessage(error ? "No se pudo enviar el enlace de recuperación" : "Enlace de recuperación enviado");
  }

  async function signOut() {
    await supabase?.auth.signOut();
    cachedSession = null;
    cachedProfile = null;
    setSession(null);
    setProfile(null);
  }

  if (loading || (session && !profile && checkingProfile)) {
    return (
      <main className="auth-check">
        <section className="auth-check__panel">
          <span className="auth-check__dot" aria-hidden="true" />
          <div>
            <strong>Comprobando acceso</strong>
            <p>{message}</p>
          </div>
          <button className="button button--ghost" type="button" onClick={() => setBootKey((value) => value + 1)}>
            Reintentar
          </button>
        </section>
      </main>
    );
  }

  if (!session || !profile) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <span className="auth-mark">Firekworks Leads</span>
          <h1>Acceso interno</h1>
          <p>Solo usuarios autorizados de Firekworks pueden ver oportunidades, contactos y pipeline.</p>
          <form onSubmit={handleLogin}>
            <label>
              Usuario o email
              <input type="text" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? "Entrando" : "Entrar"}
            </button>
          </form>
          <button className="auth-link" type="button" onClick={handleResetPassword} disabled={submitting}>
            Recuperar contraseña
          </button>
          {message ? <small>{message}</small> : null}
          {resetMessage ? <small>{resetMessage}</small> : null}
          {checkingProfile ? <small>Comprobando rol interno...</small> : null}
        </section>
      </main>
    );
  }

  return (
    <AuthContext.Provider value={{ accessToken: session.access_token, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function normalizeLogin(value: string) {
  const normalized = value.trim().toLowerCase();
  return INTERNAL_ALIASES[normalized] || normalized;
}
