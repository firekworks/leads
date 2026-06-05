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
        <span className="lead-card__description">{lead.nextAction || lead.problemDetected || lead.pain || "Validar encaje comercial"}</span>
        <span className="channel-icons" aria-label="Canales detectados">
          <ChannelIcon icon="instagram" label="Instagram" active={Boolean(lead.instagramUrl || lead.signals.instagram)} />
          <ChannelIcon icon="facebook" label="Facebook" active={Boolean(lead.facebookUrl || lead.signals.facebook)} />
          <ChannelIcon icon="web" label="Web" active={Boolean(lead.website || lead.signals.web)} />
          <ChannelIcon icon="whatsapp" label="WhatsApp" active={Boolean(lead.whatsappUrl || lead.signals.whatsapp)} />
          <ChannelIcon icon="phone" label="Teléfono" active={Boolean(lead.phone)} />
          <ChannelIcon icon="maps" label="Maps" active={Boolean(lead.googleMapsUrl || lead.signals.googleProfile)} />
        </span>
      </span>

      <span className="lead-card__meta">
        <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>
          <strong>{lead.score}</strong>
          <small>{temperature}</small>
        </span>
        <span className="meta-chip">IG {lead.followersBucket}</span>
        <span className="meta-chip meta-chip--content">{lead.contentUse}</span>
      </span>
    </motion.button>
  );
}

function ChannelIcon({
  icon,
  label,
  active
}: {
  icon: "instagram" | "facebook" | "web" | "whatsapp" | "phone" | "maps";
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={active ? `channel-icon channel-icon--${icon} channel-icon--active` : `channel-icon channel-icon--${icon}`}
      title={active ? label : `${label}: no detectado`}
      aria-label={active ? label : `${label} no detectado`}
    >
      <span className={`css-icon css-icon--${icon}`} aria-hidden="true" />
    </span>
  );
}
