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

  return (
    <motion.button
      type="button"
      className={active ? "lead-card lead-card--active" : "lead-card"}
      onClick={() => onSelect(lead)}
      layout
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
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
          <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>{lead.score}</span>
        </span>
        <small>
          {lead.sector} · {lead.city}
        </small>
        <span>{lead.description || lead.pain}</span>
        <span className="channel-badges">
          {lead.signals.googleProfile ? <span className="channel-badge channel-badge--google">Google</span> : null}
          {lead.signals.whatsapp ? <span className="channel-badge channel-badge--whatsapp">WhatsApp</span> : null}
          {lead.signals.instagram ? <span className="channel-badge channel-badge--instagram">Instagram</span> : null}
          {lead.signals.facebook ? <span className="channel-badge channel-badge--facebook">Facebook</span> : null}
          {lead.signals.web ? <span className="channel-badge channel-badge--web">Web</span> : null}
        </span>
      </span>
      <span className="lead-card__meta">
        <small>{scoreLabel(lead.score)}</small>
        <small className={`status-pill status-pill--${statusTone(lead.status)}`}>{lead.status}</small>
        <small>IG {lead.followersBucket}</small>
        <small>{lead.contentUse}</small>
      </span>
    </motion.button>
  );
}
