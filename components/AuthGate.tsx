"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/browser";
import type { InternalProfile } from "@/lib/api-auth";

type AuthContextValue = {
  accessToken: string;
  profile: InternalProfile;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useInternalAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useInternalAuth debe usarse dentro de AuthGate");
  }
  return context;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<InternalProfile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Comprobando sesión interna");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setMessage("Faltan variables públicas de Supabase");
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProfile(null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session?.access_token) {
      setProfile(null);
      return;
    }

    let active = true;
    setMessage("Validando perfil interno");

    fetch("/api/session/profile", {
      headers: {
        authorization: `Bearer ${session.access_token}`
      }
    })
      .then(async (response) => {
        const payload = (await response.json()) as { profile?: InternalProfile; error?: string };
        if (!response.ok || !payload.profile) throw new Error(payload.error || "Sin acceso interno");
        return payload.profile;
      })
      .then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setMessage("");
      })
      .catch((error) => {
        if (!active) return;
        setProfile(null);
        setMessage(error instanceof Error ? error.message : "No se pudo validar el perfil");
      });

    return () => {
      active = false;
    };
  }, [session]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setMessage("Entrando");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage(error.message);
    }

    setSubmitting(false);
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  if (loading) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <span className="auth-mark">Firekworks Leads</span>
          <h1>Preparando CRM interno</h1>
          <p>{message}</p>
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
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
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
          {message ? <small>{message}</small> : null}
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
