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
  const chips = cardChips(lead);

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
        <span className="lead-card__chips">
          {chips.map((tag) => (
            <span className="meta-chip" key={tag}>{tag}</span>
          ))}
        </span>
      </span>

      <span className="lead-card__meta">
        <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>
          <strong>{lead.score}</strong>
          <small>{temperature}</small>
        </span>
        <span className={`status-pill status-pill--${statusTone(lead.status)}`}>{shortStatus(lead.status)}</span>
      </span>
    </motion.button>
  );
}

function cardChips(lead: Lead) {
  const chips: string[] = [];
  if (lead.isInvalid || lead.isDisqualified || lead.status === "No contactar") chips.push("Público");
  if (!lead.instagramUrl) chips.push("Sin IG");
  if (!lead.website) chips.push("Sin web");
  if (lead.phone || lead.whatsappUrl) chips.push("Tel");
  if (lead.googleMapsUrl || lead.signals.googleProfile) chips.push("Maps");
  if (lead.reviews >= 80) chips.push("Buen fit");
  if (lead.validationStatus === "duplicado") chips.push("Duplicado");
  return Array.from(new Set(chips)).slice(0, 3);
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
