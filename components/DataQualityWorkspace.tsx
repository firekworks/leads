"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Background } from "@/components/Background";
import { useInternalAuth } from "@/components/AuthGate";
import { LeadCard } from "@/components/LeadCard";
import { classifyLeadFit } from "@/lib/scoring";
import { loadLeads, persistLead } from "@/lib/leads-repository";
import type { Lead } from "@/types/lead";

export function DataQualityWorkspace() {
  const { accessToken, profile } = useInternalAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [message, setMessage] = useState("Cargando");

  useEffect(() => {
    let active = true;
    loadLeads(accessToken).then((result) => {
      if (!active) return;
      setLeads(result.leads);
      setMessage(result.source === "supabase" ? "Datos activos" : "Fallback local");
    });
    return () => {
      active = false;
    };
  }, [accessToken]);

  const groups = useMemo(() => {
    const publicCandidates = leads.filter((lead) => classifyLeadFit(lead).disqualified || lead.isDisqualified || lead.isInvalid);
    const suspiciousScore = leads.filter((lead) => (classifyLeadFit(lead).disqualified || lead.isDisqualified) && lead.score > 25);
    const missingInstagram = leads.filter((lead) => !lead.instagramUrl && !lead.isInvalid);
    const missingPhone = leads.filter((lead) => !lead.phone && !lead.whatsappUrl && !lead.isInvalid);
    const missingCity = leads.filter((lead) => !lead.city);

    return [
      { id: "public", label: "Públicos", leads: publicCandidates },
      { id: "score", label: "Score sospechoso", leads: suspiciousScore },
      { id: "ig", label: "Sin IG", leads: missingInstagram },
      { id: "phone", label: "Sin teléfono", leads: missingPhone },
      { id: "city", label: "Sin ciudad", leads: missingCity }
    ];
  }, [leads]);

  async function saveLead(lead: Lead) {
    const result = await persistLead(lead, accessToken);
    setLeads(result.leads);
    setSelected(result.lead);
    setMessage(result.source === "supabase" ? "Guardado" : "Guardado local");
  }

  async function confirmDiscard(lead: Lead) {
    const fit = classifyLeadFit(lead);
    await saveLead({
      ...lead,
      status: "No contactar",
      isInvalid: true,
      isDisqualified: true,
      validationStatus: "descartado",
      fitClassification: fit.classification,
      disqualifiedCategory: fit.classification,
      disqualifiedReason: fit.reason || "No cliente probable",
      updatedAt: new Date().toISOString()
    });
  }

  async function restore(lead: Lead) {
    await saveLead({
      ...lead,
      status: lead.status === "No contactar" ? "Detectado" : lead.status,
      isInvalid: false,
      isDisqualified: false,
      validationStatus: "revisar",
      manualOverride: true,
      updatedAt: new Date().toISOString()
    });
  }

  return (
    <main className="app">
      <Background />
      <AppShell currentView="admin" userLabel={`${profile.role} · ${profile.email}`} sourceLabel={message}>
        <header className="workspace-header workspace-header--compact">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Calidad</h1>
          </div>
        </header>

        <section className="data-quality">
          <aside className="quality-stack">
            {groups.map((group) => (
              <a key={group.id} href={`#${group.id}`} className="quality-tile">
                <span>{group.label}</span>
                <strong>{group.leads.length}</strong>
              </a>
            ))}
          </aside>

          <div className="quality-list">
            {groups.map((group) => (
              <section key={group.id} id={group.id}>
                <header>
                  <span>{group.label}</span>
                  <strong>{group.leads.length}</strong>
                </header>
                {group.leads.slice(0, 20).map((lead) => (
                  <div className="quality-row" key={`${group.id}-${lead.id}`}>
                    <LeadCard lead={lead} active={selected?.id === lead.id} onSelect={setSelected} />
                    <div className="quality-row__actions">
                      <button className="button button--ghost" type="button" onClick={() => confirmDiscard(lead)}>Descartar</button>
                      <button className="button button--ghost" type="button" onClick={() => restore(lead)}>Restaurar</button>
                    </div>
                  </div>
                ))}
                {!group.leads.length ? <p className="empty-state">Sin incidencias.</p> : null}
              </section>
            ))}
          </div>
        </section>
      </AppShell>
    </main>
  );
}
