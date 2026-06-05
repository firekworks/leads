"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Background } from "@/components/Background";
import { useInternalAuth } from "@/components/AuthGate";

export function SystemWorkspace() {
  const { profile } = useInternalAuth();

  return (
    <main className="app">
      <Background />
      <AppShell currentView="system" userLabel={`${profile.role} · ${profile.email}`} sourceLabel="System">
        <header className="workspace-header workspace-header--compact">
          <div>
            <p className="eyebrow">SYSTEM</p>
            <h1>System</h1>
            <p className="workspace-subtitle">Datos, reglas y escaneos.</p>
          </div>
        </header>

        <section className="system-grid">
          <SystemLink href="/system/data-quality" icon="check" title="Data quality" text="Descartes, públicos, faltantes y score sospechoso." />
          <SystemLink href="/system/scan" icon="scan" title="Scan jobs" text="Escanear zonas y guardar comercios válidos." />
          <SystemLink href="/system/texts" icon="file" title="Snippets" text="Textos internos de Leads." />
          <SystemInfo icon="ban" title="Reglas" text="Públicos e institucionales se envían a revisión o descarte." />
          <SystemInfo icon="store" title="Sectores" text="Scoring por encaje, ticket y oportunidad audiovisual." />
          <SystemInfo icon="pulse" title="Scoring" text="Encaje, demanda, brecha digital, contacto y zona." />
        </section>
      </AppShell>
    </main>
  );
}

function SystemLink({ href, icon, title, text }: { href: string; icon: string; title: string; text: string }) {
  return (
    <Link href={href} className="system-card">
      <span className={`css-icon css-icon--${icon}`} aria-hidden="true" />
      <strong>{title}</strong>
      <small>{text}</small>
    </Link>
  );
}

function SystemInfo({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <article className="system-card system-card--info">
      <span className={`css-icon css-icon--${icon}`} aria-hidden="true" />
      <strong>{title}</strong>
      <small>{text}</small>
    </article>
  );
}
