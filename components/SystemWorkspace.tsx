"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Background } from "@/components/Background";
import { useInternalAuth } from "@/components/AuthGate";
import { loadLeads } from "@/lib/leads-repository";
import { classifyLeadFit } from "@/lib/scoring";
import type { Lead } from "@/types/lead";

export function SystemWorkspace() {
  const { accessToken, profile } = useInternalAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [message, setMessage] = useState("Cargando");

  useEffect(() => {
    let active = true;
    loadLeads(accessToken).then((result) => {
      if (!active) return;
      setLeads(result.leads);
      setMessage(result.source === "supabase" ? "Guardado" : "Local");
    });
    return () => {
      active = false;
    };
  }, [accessToken]);

  const stats = useMemo(() => {
    const publicLeads = leads.filter((lead) => classifyLeadFit(lead).disqualified || lead.isDisqualified || lead.isInvalid);
    const duplicateKeys = duplicateLeadIds(leads);
    return {
      publicLeads: publicLeads.length,
      duplicates: duplicateKeys.size,
      noInstagram: leads.filter((lead) => !lead.instagramUrl && !lead.isInvalid).length,
      noPhone: leads.filter((lead) => !lead.phone && !lead.whatsappUrl && !lead.isInvalid).length,
      noCity: leads.filter((lead) => !lead.city).length,
      suspicious: leads.filter((lead) => (classifyLeadFit(lead).disqualified || lead.isDisqualified) && lead.score > 25).length
    };
  }, [leads]);

  return (
    <main className="app">
      <Background />
      <AppShell currentView="system" userLabel={`${profile.role} · ${profile.email}`} sourceLabel={message}>
        <header className="workspace-header workspace-header--compact">
          <div>
            <p className="eyebrow">Firekworks Leads</p>
            <h1>Sistema</h1>
            <p className="workspace-subtitle">Providers, calidad de datos, escaneos y reglas.</p>
          </div>
        </header>

        <section className="system-layout">
          <SystemPanel title="Providers" href="/system/providers">
            <SystemRow label="Supabase" value={message} />
            <SystemRow label="Google Places" value="Seguro" />
            <SystemRow label="Google Maps" value="Cliente" />
            <SystemRow label="Search" value="Opcional" />
            <SystemRow label="Stats connector" value="Preparado" />
          </SystemPanel>

          <SystemPanel title="Calidad de datos" href="/system/data-quality">
            <SystemRow label="Públicos" value={stats.publicLeads} />
            <SystemRow label="Duplicados" value={stats.duplicates} />
            <SystemRow label="Sin IG" value={stats.noInstagram} />
            <SystemRow label="Sin teléfono" value={stats.noPhone} />
            <SystemRow label="Sin ciudad" value={stats.noCity} />
            <SystemRow label="Score sospechoso" value={stats.suspicious} />
          </SystemPanel>

          <SystemPanel title="Escaneos" href="/system/scan">
            <SystemRow label="Ejecutar escaneo" value="Preview" />
            <SystemRow label="Peticiones por import" value="1" />
            <SystemRow label="Sectores" value="16" />
            <SystemRow label="Errores" value="Ver log" />
          </SystemPanel>

          <SystemPanel title="Reglas de scoring" href="/system/scoring">
            <SystemRow label="Descarte" value="Públicos" />
            <SystemRow label="Sectores válidos" value="Privados" />
            <SystemRow label="Zona foco" value="Foia" />
            <SystemRow label="Scoring" value="Fit + demanda" />
          </SystemPanel>

          <SystemPanel title="Ajustes" href="/system/texts">
            <SystemRow label="Snippets" value="Leads" />
            <SystemRow label="Zonas" value="Activas" />
            <SystemRow label="Usuario" value={profile.role} />
            <SystemRow label="Supabase" value={message} />
          </SystemPanel>
        </section>
      </AppShell>
    </main>
  );
}

function SystemPanel({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <article className="system-panel">
      <header>
        <span>{title}</span>
        {href ? <Link href={href}>Abrir</Link> : null}
      </header>
      <div>{children}</div>
    </article>
  );
}

function SystemRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="system-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function duplicateLeadIds(leads: Lead[]) {
  const seen = new Map<string, string>();
  const duplicates = new Set<string>();

  for (const lead of leads) {
    const keys = [
      lead.placeId ? `place:${lead.placeId}` : "",
      lead.phone ? `phone:${lead.phone}` : "",
      lead.website ? `web:${lead.website}` : "",
      `name:${lead.name.toLowerCase()}|${lead.city.toLowerCase()}`
    ].filter(Boolean);

    for (const key of keys) {
      const first = seen.get(key);
      if (first && first !== lead.id) duplicates.add(lead.id);
      else seen.set(key, lead.id);
    }
  }

  return duplicates;
}
