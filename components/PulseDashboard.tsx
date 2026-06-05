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
  const hot = valid.filter((lead) => lead.score >= 80);
  const noInstagram = valid.filter((lead) => !lead.instagramUrl);
  const noWeb = valid.filter((lead) => !lead.website);
  const suspect = leads.filter((lead) => lead.isInvalid || lead.isDisqualified || lead.status === "No contactar");
  const monthly = valid.reduce((total, lead) => total + estimateWeightedMonthlyValue(lead), 0);
  const priority = valid.slice().sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <section className="pulse-grid">
      <article className="pulse-hero">
        <div>
          <span className="eyebrow">Pulse</span>
          <h2>Captación local</h2>
        </div>
        <div className="pulse-curve" aria-hidden="true">
          <span style={{ height: "34%" }} />
          <span style={{ height: "50%" }} />
          <span style={{ height: "43%" }} />
          <span style={{ height: "66%" }} />
          <span style={{ height: "58%" }} />
          <span style={{ height: "78%" }} />
          <span style={{ height: "70%" }} />
        </div>
        <div className="pulse-metrics">
          <Metric label="Válidos" value={valid.length} />
          <Metric label="Calientes" value={hot.length} />
          <Metric label="Sin IG" value={noInstagram.length} />
        </div>
        <strong className="pulse-value">≈ {monthly}€/mes</strong>
      </article>

      <aside className="today-panel">
        <header>
          <span>Hoy</span>
          <strong>{hot.length + noInstagram.length + suspect.length}</strong>
        </header>
        <Action href="/leads?quick=hot" label="Revisar calientes" count={hot.length} />
        <Action href="/admin/data-quality" label="Limpiar descartes" count={suspect.length} />
        <Action href="/leads?quick=noInstagram" label="Añadir Instagram" count={noInstagram.length} />
      </aside>

      <article className="priority-queue">
        <header>
          <span>Prioridad</span>
          <Link href="/leads">Abrir</Link>
        </header>
        {priority.map((lead) => (
          <button key={lead.id} type="button" onClick={() => onSelect(lead)}>
            <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>{lead.score}</span>
            <strong>{lead.name}</strong>
            <small>{lead.city} · {scoreLabel(lead.score)}</small>
          </button>
        ))}
      </article>

      <article className="quality-panel">
        <header>
          <span>Calidad</span>
          <Link href="/admin/data-quality">Datos</Link>
        </header>
        <QualityBar label="Sin Instagram" value={noInstagram.length} total={valid.length} />
        <QualityBar label="Sin web" value={noWeb.length} total={valid.length} />
        <QualityBar label="Descartes" value={suspect.length} total={leads.length} />
      </article>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
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

function QualityBar({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="quality-bar">
      <span>{label}</span>
      <strong>{value}</strong>
      <i><b style={{ width: `${percentage}%` }} /></i>
    </div>
  );
}
