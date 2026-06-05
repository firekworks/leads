"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setMessage("Supabase no configurado");
      return;
    }

    if (password.length < 10) {
      setMessage("Usa al menos 10 caracteres");
      return;
    }

    if (password !== confirm) {
      setMessage("Las contraseñas no coinciden");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({ password });

    setSaving(false);

    if (error) {
      setMessage("No se pudo actualizar la contraseña");
      return;
    }

    setMessage("Contraseña actualizada");
    window.setTimeout(() => router.replace("/"), 900);
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <span className="auth-mark">Firekworks Leads</span>
        <h1>Nueva contraseña</h1>
        <p>Actualiza tu acceso interno y vuelve al CRM.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label>
            Repetir contraseña
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button className="button" type="submit" disabled={saving}>
            {saving ? "Guardando" : "Guardar contraseña"}
          </button>
        </form>
        {message ? <small>{message}</small> : null}
      </section>
    </main>
  );
}
