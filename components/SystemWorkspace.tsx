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
  const [actionMessage, setActionMessage] = useState("");

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

  async function runSystemAction(endpoint: string, label: string) {
    setActionMessage(`${label}: preparando`);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ allowPaidRequests: false, limit: 25 })
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo ejecutar");
      setActionMessage(payload.message || `${label}: listo`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo ejecutar");
    }
  }

  return (
    <main className="app">
      <Background />
      <AppShell currentView="system" userLabel={`${profile.role} · ${profile.email}`} sourceLabel={message}>
        <header className="workspace-header workspace-header--compact">
          <div>
            <p className="eyebrow">Firekworks Leads</p>
            <h1>Sistema</h1>
            <p className="workspace-subtitle">Integraciones, enriquecimiento seguro, calidad de datos y reglas comerciales.</p>
          </div>
          {actionMessage ? <span className="source-pill">{actionMessage}</span> : null}
        </header>

        <section className="system-layout">
          <SystemPanel title="Integraciones">
            <SystemRow label="Supabase" value={message} />
            <SystemRow label="Google Maps" value={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "Conectado" : "Pendiente"} />
            <SystemRow label="Google Places" value="Seguro: preview por defecto" />
            <SystemRow label="Geocoding" value="Pendiente bajo confirmación" />
            <SystemRow label="Routes" value="URL Maps gratuita" />
            <SystemRow label="Meta / Ad Library" value="Preparado, sin prometer scraping" />
            <SystemRow label="Stats bridge" value="Preparado" />
          </SystemPanel>

          <SystemPanel title="Enriquecimiento">
            <SystemAction label="Geocodificar pendientes" onClick={() => runSystemAction("/api/leads/geocode-batch", "Geocodificar")} />
            <SystemAction label="Enriquecer web/redes" onClick={() => runSystemAction("/api/leads/enrich-batch", "Enriquecer")} />
            <SystemAction label="Recalcular scoring" onClick={() => runSystemAction("/api/leads/recalculate-batch", "Scoring")} />
            <SystemRow label="Google Places" value="Nunca hace coste sin allowPaidRequests" />
            <SystemRow label="Instagram/Facebook" value="Manual o API autorizada" />
          </SystemPanel>

          <SystemPanel title="Calidad de datos" href="/system/data-quality">
            <SystemRow label="Públicos" value={stats.publicLeads} />
            <SystemRow label="Duplicados" value={stats.duplicates} />
            <SystemRow label="Sin IG" value={stats.noInstagram} />
            <SystemRow label="Sin teléfono" value={stats.noPhone} />
            <SystemRow label="Sin ciudad" value={stats.noCity} />
            <SystemRow label="Score sospechoso" value={stats.suspicious} />
          </SystemPanel>

          <SystemPanel title="Scoring" href="/system/scoring">
            <SystemRow label="Demanda local" value="25%" />
            <SystemRow label="Capacidad pago" value="25%" />
            <SystemRow label="Brecha digital" value="25%" />
            <SystemRow label="Encaje Firekworks" value="15%" />
            <SystemRow label="Visitabilidad" value="10%" />
            <SystemRow label="Penalizaciones" value="Públicos/cadenas/sin datos" />
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

function SystemAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="system-action" type="button" onClick={onClick}>
      <span>{label}</span>
      <strong>Ejecutar</strong>
    </button>
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
