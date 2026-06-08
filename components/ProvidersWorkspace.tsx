"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Background } from "@/components/Background";
import { useInternalAuth } from "@/components/AuthGate";
import type { ProviderHealth } from "@/lib/enrichment/providers/types";

export function ProvidersWorkspace() {
  const { accessToken, profile } = useInternalAuth();
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [message, setMessage] = useState("Test seguro");

  useEffect(() => {
    let active = true;
    fetch("/api/system/providers/test", {
      headers: { authorization: `Bearer ${accessToken}` }
    })
      .then(async (response) => {
        const payload = (await response.json()) as { providers?: ProviderHealth[]; message?: string; error?: string };
        if (!response.ok) throw new Error(payload.error || "No se pudo testear");
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setProviders(payload.providers || []);
        setMessage(payload.message || "OK");
      })
      .catch((error) => active && setMessage(error instanceof Error ? error.message : "Error"));

    return () => {
      active = false;
    };
  }, [accessToken]);

  return (
    <main className="app">
      <Background />
      <AppShell currentView="system" userLabel={`${profile.role} · ${profile.email}`} sourceLabel={message}>
        <header className="workspace-header workspace-header--compact">
          <div>
            <p className="eyebrow">Sistema</p>
            <h1>Integraciones</h1>
            <p className="workspace-subtitle">Conexiones preparadas sin ejecutar llamadas de coste en el test.</p>
          </div>
        </header>

        <section className="providers-grid">
          {providers.map((provider) => (
            <article className={`provider-card provider-card--${provider.status}`} key={provider.id}>
              <header>
                <span>{provider.label}</span>
                <strong>{provider.status}</strong>
              </header>
              <p>{provider.note}</p>
              <div>
                <span>Última sync</span>
                <strong>{provider.lastSync}</strong>
              </div>
              <div>
                <span>Coste estimado</span>
                <strong>{provider.estimatedCost}</strong>
              </div>
            </article>
          ))}
        </section>
      </AppShell>
    </main>
  );
}
