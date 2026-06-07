"use client";

import { motion } from "framer-motion";
import type { Lead } from "@/types/lead";
import { scoreLabel, scoreTone } from "@/lib/scoring";
import { statusTone } from "@/lib/status";

type LeadCardProps = {
  lead: Lead;
  active: boolean;
  onSelect: (lead: Lead) => void;
};

export function LeadCard({ lead, active, onSelect }: LeadCardProps) {
  const initial = lead.name.trim().slice(0, 1).toUpperCase() || "F";
  const temperature = scoreLabel(lead.score);
  const signals = cardSignals(lead);

  return (
    <motion.button
      type="button"
      className={active ? "lead-card lead-card--active" : "lead-card"}
      onClick={() => onSelect(lead)}
      layout
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18 }}
    >
      <span className="lead-avatar" aria-hidden="true">
        {lead.logoUrl ? (
          <img
            src={lead.logoUrl}
            alt=""
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <span>{initial}</span>
      </span>

      <span className="lead-card__main">
        <span className="lead-card__title">
          <strong>{lead.name}</strong>
        </span>
        <small>
          {lead.city} · {lead.sector}
        </small>
        <span className="lead-card__state">
          {shortStatus(lead.status)} · {lead.validationStatus === "validado" ? "Validado" : lead.validationStatus === "descartado" ? "Descartado" : "Pendiente de validar"}
        </span>
        <span className="lead-signal-row" aria-label="Señales del lead">
          {signals.map((signal) => (
            <span
              className={`lead-signal lead-signal--${signal.state}`}
              key={signal.id}
              title={signal.label}
              aria-label={`${signal.label}: ${signal.state}`}
            >
              {signal.short}
            </span>
          ))}
        </span>
      </span>

      <span className="lead-card__meta">
        <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>
          <strong>{lead.score}</strong>
          <small>{temperature}</small>
        </span>
        <span className={`status-pill status-pill--${statusTone(lead.status)}`}>{temperature}</span>
      </span>
    </motion.button>
  );
}

function cardSignals(lead: Lead) {
  return [
    signal("ig", "IG", "Instagram", Boolean(lead.instagramUrl), lead.instagramStatus === "pendiente"),
    signal("web", "W", "Web", Boolean(lead.website), false),
    signal("phone", "T", "Teléfono", Boolean(lead.phone || lead.whatsappUrl), false),
    signal("maps", "M", "Google Maps", Boolean(lead.googleMapsUrl || lead.signals.googleProfile), false),
    signal("money", "€", "Potencial estimado; facturación no verificada", Boolean(lead.adsSignal), true),
    signal("media", "AV", "Medios", Boolean(lead.googlePhotos >= 12 || lead.contentUse === "Muy trabajado"), lead.contentUse === "Pendiente"),
    signal("ads", "AD", "Ads", Boolean(lead.adsSignal), true)
  ];
}

function signal(id: string, short: string, label: string, active: boolean, pending: boolean) {
  return {
    id,
    short,
    label,
    state: active ? "active" : pending ? "pending" : "off"
  };
}

function shortStatus(status: Lead["status"]) {
  const labels: Partial<Record<Lead["status"], string>> = {
    "Reunión agendada": "Reunión",
    "Diagnóstico hecho": "Diagnóstico",
    "Propuesta enviada": "Propuesta",
    "No contactar": "No contactar"
  };
  return labels[status] || status;
}
