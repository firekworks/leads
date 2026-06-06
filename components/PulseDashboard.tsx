"use client";

import Link from "next/link";
import type { Lead } from "@/types/lead";
import { estimateWeightedMonthlyValue, scoreLabel, scoreTone } from "@/lib/scoring";

type PulseDashboardProps = {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
};

export function PulseDashboard({ leads, onSelect }: PulseDashboardProps) {
  const valid = leads.filter((lead) => !lead.isInvalid && !lead.isDisqualified && !["No contactar", "No encaja", "Perdido"].includes(lead.status));
  const hot = valid.filter((lead) => lead.score >= 70);
  const noInstagram = valid.filter((lead) => !lead.instagramUrl);
  const followUps = valid.filter((lead) => lead.nextFollowUpAt && new Date(lead.nextFollowUpAt).getTime() <= Date.now() + 1000 * 60 * 60 * 24);
  const routePending = valid.filter((lead) => lead.nextFollowUpType === "ruta" || lead.score >= 70).slice(0, 12);
  const suspect = leads.filter((lead) => lead.isInvalid || lead.isDisqualified || lead.status === "No contactar");
  const monthly = valid.reduce((total, lead) => total + estimateWeightedMonthlyValue(lead), 0);
  const priority = valid.slice().sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <section className="pulse-grid">
      <article className="pulse-hero">
        <div className="pulse-hero__head">
          <span className="eyebrow">Pulse</span>
          <h2>Captación local</h2>
        </div>

        <div className="pulse-metrics" aria-label="Resumen comercial">
          <Metric label="Válidos" value={valid.length} />
          <Metric label="Calientes" value={hot.length} />
          <Metric label="Sin IG" value={noInstagram.length} />
          <Metric label="Potencial" value={`${monthly}€`} />
        </div>
      </article>

      <aside className="today-panel">
        <header>
          <span>Hoy</span>
          <strong>{followUps.length + noInstagram.length + suspect.length + routePending.length}</strong>
        </header>
        <Action href="/system/data-quality" label="Revisar descartes" count={suspect.length} />
        <Action href="/leads?quick=noInstagram" label="Añadir Instagram" count={noInstagram.length} />
        <Action href="/leads?quick=contactEasy" label="Seguimientos" count={followUps.length} />
        <Action href="/route" label="Ruta pendiente" count={routePending.length} />
      </aside>

      <article className="priority-queue">
        <header>
          <span>Prioridad</span>
          <Link href="/leads?quick=hot">Leads</Link>
        </header>
        <div className="priority-list">
          {priority.map((lead) => (
            <button key={lead.id} type="button" onClick={() => onSelect(lead)}>
              <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>{lead.score}</span>
              <span>
                <strong>{lead.name}</strong>
                <small>{lead.city}</small>
              </span>
              <em>{nextAction(lead)}</em>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Action({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link href={href} className="today-action">
      <span>{label}</span>
      <strong>{count}</strong>
    </Link>
  );
}

function nextAction(lead: Lead) {
  if (lead.nextAction) return lead.nextAction;
  if (!lead.instagramUrl) return "Buscar IG";
  if (!lead.phone && !lead.whatsappUrl) return "Buscar tel";
  return scoreLabel(lead.score);
}
