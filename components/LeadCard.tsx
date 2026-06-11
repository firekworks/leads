"use client";

import { motion } from "framer-motion";
import type { Lead } from "@/types/lead";
import { scoreLabel, scoreTone } from "@/lib/scoring";
import { statusTone } from "@/lib/status";

type LeadCardProps = {
  lead: Lead;
  active: boolean;
  onSelect: (lead: Lead) => void;
  onAdvance?: (lead: Lead) => void;
};

export function LeadCard({ lead, active, onSelect, onAdvance }: LeadCardProps) {
  const initial = lead.name.trim().slice(0, 1).toUpperCase() || "F";
  const temperature = scoreLabel(lead.score);
  const chips = cardSignals(lead).slice(0, 4);
  const gap = mainGap(lead);

  return (
    <motion.article
      className={active ? "lead-card lead-card--active" : "lead-card"}
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

      <button type="button" className="lead-card__open" onClick={() => onSelect(lead)}>
        <span className="lead-card__title">
          <strong>{lead.name}</strong>
          <em className={`status-pill status-pill--${statusTone(lead.status)}`}>{shortStatus(lead.status)}</em>
        </span>
        <small>{lead.city} · {lead.sector}</small>
        <span className="lead-card__temperature">
          <strong className={`temperature-dot temperature-dot--${scoreTone(lead.score)}`}>{temperature} · {lead.score}</strong>
          <span>Brecha: {gap}</span>
        </span>
        <span className="lead-card__next">Siguiente: {lead.nextAction || "Definir visita"}</span>
      </button>

      <span className="lead-card__side">
        <span className="lead-signal-row" aria-label="Señales del lead">
          {chips.map((signal) => (
            <span
              className={`lead-signal lead-signal--${signal.state} lead-signal--${signal.id}`}
              key={signal.id}
              title={signal.label}
              aria-label={`${signal.label}: ${signal.state}`}
            >
              {signal.short}
            </span>
          ))}
        </span>
        <span className="lead-card__actions">
          <button type="button" onClick={() => onSelect(lead)}>Abrir ficha</button>
          <button type="button" onClick={() => onAdvance?.(lead)}>Avanzar</button>
        </span>
      </span>
    </motion.article>
  );
}

function cardSignals(lead: Lead) {
  return [
    signal("maps", "Google", "Google Maps", Boolean(lead.googleMapsUrl || lead.signals.googleProfile), false),
    signal("wa", "WA", "WhatsApp", Boolean(lead.whatsappUrl || lead.phone), false),
    signal("ig", lead.instagramUrl ? "IG" : "Sin IG", "Instagram", Boolean(lead.instagramUrl), lead.instagramStatus === "pendiente"),
    signal("fb", lead.facebookUrl ? "FB" : "Sin FB", "Facebook", Boolean(lead.facebookUrl), false),
    signal("web", lead.website ? "Web" : "Sin web", "Web", Boolean(lead.website), false),
    signal("media", lead.contentUse, "Contenido", lead.contentUse === "Activo" || lead.contentUse === "Muy trabajado", lead.contentUse === "Pendiente")
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

function mainGap(lead: Lead) {
  if (!lead.instagramUrl) return "Instagram pendiente";
  if (!lead.website) return "sin web/landing";
  if (!lead.whatsappUrl && !lead.phone) return "contacto poco claro";
  if (lead.contentUse === "Sin uso" || lead.contentUse === "Flojo") return `contenido ${lead.contentUse.toLowerCase()}`;
  if (!lead.facebookUrl) return "Facebook pendiente";
  return lead.scoreDigitalGap && lead.scoreDigitalGap >= 55 ? "captación sin sistema" : "optimizar conversión";
}

function shortStatus(status: Lead["status"]) {
  const labels: Partial<Record<Lead["status"], string>> = {
    "Reunión agendada": "Reunión",
    "Diagnóstico hecho": "Visitado",
    "Propuesta enviada": "Propuesta",
    "No contactar": "No contactar"
  };
  return labels[status] || status;
}
