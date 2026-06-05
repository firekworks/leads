"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [message, setMessage] = useState("Validando acceso");

  useEffect(() => {
    let active = true;

    if (!supabase) {
      setMessage("Supabase no configurado");
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        router.replace(data.session ? "/auth/update-password" : "/");
      })
      .catch(() => {
        if (!active) return;
        setMessage("No se pudo validar el enlace");
      });

    return () => {
      active = false;
    };
  }, [router, supabase]);

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <span className="auth-mark">Firekworks Leads</span>
        <h1>Acceso interno</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}
