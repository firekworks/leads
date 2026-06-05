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
  const tags = (lead.scoreTags || []).slice(0, 3);

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
          <span className={`status-pill status-pill--${statusTone(lead.status)}`}>{lead.status}</span>
        </span>
        <small>
          {lead.city} · {lead.sector}
        </small>
        <span className="lead-card__signals" aria-label="Señales rápidas">
          <SignalChip icon="instagram" label="IG" active={Boolean(lead.instagramUrl || lead.signals.instagram)} />
          <SignalChip icon="facebook" label="FB" active={Boolean(lead.facebookUrl || lead.signals.facebook)} />
          <SignalChip icon="web" label="Web" active={Boolean(lead.website || lead.signals.web)} />
          <SignalChip icon="phone" label="Tel" active={Boolean(lead.phone || lead.whatsappUrl || lead.signals.whatsapp)} />
          <SignalChip icon="maps" label="Maps" active={Boolean(lead.googleMapsUrl || lead.signals.googleProfile)} />
          <SignalChip icon="star" label={`${lead.reviews || 0}`} active={lead.reviews > 0} />
        </span>
      </span>

      <span className="lead-card__meta">
        <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>
          <strong>{lead.score}</strong>
          <small>{temperature}</small>
        </span>
        <span className="lead-card__chips">
          <span className="meta-chip">{quickAction(lead)}</span>
          <span className="meta-chip">IG {lead.followersBucket}</span>
          <span className="meta-chip meta-chip--content">{lead.contentUse}</span>
          {tags.map((tag) => (
            <span className="meta-chip meta-chip--quiet" key={tag}>{tag}</span>
          ))}
        </span>
      </span>
    </motion.button>
  );
}

function SignalChip({
  icon,
  label,
  active
}: {
  icon: "instagram" | "facebook" | "web" | "phone" | "maps" | "star";
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={active ? `signal-chip signal-chip--${icon} signal-chip--active` : `signal-chip signal-chip--${icon}`}
      title={active ? label : `${label}: no detectado`}
      aria-label={active ? label : `${label} no detectado`}
    >
      <span className={`css-icon css-icon--${icon}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function quickAction(lead: Lead) {
  if (lead.isInvalid || lead.isDisqualified || lead.status === "No contactar") return "Revisar descarte";
  if (!lead.instagramUrl) return "Validar IG";
  if (!lead.phone && !lead.whatsappUrl) return "Buscar tel";
  if (lead.status === "Detectado" || lead.status === "Validado") return "Priorizar";
  if (lead.status === "Contactado") return "Seguimiento";
  if (lead.status === "Respondió") return "Reunión";
  if (lead.status === "Propuesta enviada" || lead.status === "Negociación") return "Cerrar";
  return lead.nextAction ? lead.nextAction.slice(0, 18) : "Revisar";
}
