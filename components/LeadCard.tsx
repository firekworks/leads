"use client";

import { motion } from "framer-motion";
import type { Lead } from "@/types/lead";
import { estimateMonthlyValue, recommendServicePlan, scoreLabel, scoreTone } from "@/lib/scoring";
import { statusTone } from "@/lib/status";

type LeadCardProps = {
  lead: Lead;
  active: boolean;
  onSelect: (lead: Lead) => void;
};

export function LeadCard({ lead, active, onSelect }: LeadCardProps) {
  const initial = lead.name.trim().slice(0, 1).toUpperCase() || "F";
  const monthlyValue = estimateMonthlyValue(lead);
  const plan = recommendServicePlan(lead);

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
          {lead.sector} · {lead.city} · {lead.reviews} reseñas
        </small>
        <span className="lead-card__description">{lead.nextAction || lead.description || lead.pain}</span>
        <span className="channel-badges">
          {lead.signals.googleProfile ? <span className="channel-badge channel-badge--google">G</span> : null}
          {lead.signals.whatsapp ? <span className="channel-badge channel-badge--whatsapp">W</span> : null}
          {lead.signals.instagram ? <span className="channel-badge channel-badge--instagram">IG</span> : null}
          {lead.signals.facebook ? <span className="channel-badge channel-badge--facebook">FB</span> : null}
          {lead.signals.web ? <span className="channel-badge channel-badge--web">Web</span> : null}
        </span>
      </span>

      <span className="lead-card__meta">
        <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>
          <strong>{lead.score}</strong>
          <small>{scoreLabel(lead.score)}</small>
        </span>
        <span className="meta-chip">IG {lead.followersBucket}</span>
        <span className="meta-chip meta-chip--content">{lead.contentUse}</span>
        <span className="meta-chip">{monthlyValue ? `${plan.name} · ≈ ${monthlyValue}€/mes` : "Sin estimación"}</span>
      </span>
    </motion.button>
  );
}
