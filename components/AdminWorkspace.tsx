"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Background } from "@/components/Background";
import { useInternalAuth } from "@/components/AuthGate";

export function AdminWorkspace() {
  const { profile } = useInternalAuth();

  return (
    <main className="app">
      <Background />
      <AppShell currentView="admin" userLabel={`${profile.role} · ${profile.email}`} sourceLabel="Admin">
        <header className="workspace-header workspace-header--compact">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Sistema</h1>
          </div>
        </header>

        <section className="admin-grid">
          <AdminCard href="/admin/data-quality" icon="check" title="Calidad" text="Descartes, duplicados y datos incompletos." />
          <AdminCard href="/admin/texts" icon="file" title="Textos" text="Copys internos de Leads." />
          <AdminCard href="/scan" icon="scan" title="Scan" text="Zonas, sectores y Google Places." />
          <AdminCard href="/pipeline" icon="pipeline" title="Pipeline" text="Estados comerciales guardados." />
        </section>
      </AppShell>
    </main>
  );
}

function AdminCard({ href, icon, title, text }: { href: string; icon: string; title: string; text: string }) {
  return (
    <Link href={href} className="admin-card">
      <span className={`css-icon css-icon--${icon}`} aria-hidden="true" />
      <strong>{title}</strong>
      <small>{text}</small>
    </Link>
  );
}
