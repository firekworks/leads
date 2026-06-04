"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContentUse, FollowersBucket, Lead, LeadStatus } from "@/types/lead";
import { googleSearchUrls } from "@/lib/leads-repository";
import { scoreLabel } from "@/lib/scoring";
import { statusTone } from "@/lib/status";
import { ScoreRing } from "@/components/ScoreRing";

type LeadDetailProps = {
  lead: Lead;
  statuses: LeadStatus[];
  onSave: (lead: Lead) => void;
  onEnrich: (lead: Lead) => void;
  enriching: boolean;
};

const followersBuckets: FollowersBucket[] = [
  "Pendiente",
  "Sin cuenta",
  "< 1.000",
  "1.000 - 5.000",
  "+5.000"
];

const contentUses: ContentUse[] = [
  "Pendiente",
  "Sin redes",
  "Abandonado",
  "Básico",
  "Activo",
  "Fuerte"
];

const priorityOptions: Lead["priority"][] = ["Muy alta", "Alta", "Media", "Baja"];

export function LeadDetail({ lead, statuses, onSave, onEnrich, enriching }: LeadDetailProps) {
  const [draft, setDraft] = useState(lead);
  const searchUrls = useMemo(() => googleSearchUrls(draft), [draft]);

  useEffect(() => {
    setDraft(lead);
  }, [lead]);

  function update<K extends keyof Lead>(key: K, value: Lead[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <aside className="lead-detail">
      <div className="lead-detail__top">
        <div>
          <span className="eyebrow">Ficha editable</span>
          <h2>{draft.name}</h2>
          <p>
            {draft.sector} en {draft.city}
          </p>
          <span className={`status-pill status-pill--${statusTone(draft.status)}`}>{draft.status}</span>
        </div>
        <ScoreRing score={draft.score} label={scoreLabel(draft.score)} />
      </div>

      <div className="detail-actions detail-actions--stack">
        <button className="button" type="button" onClick={() => onSave(draft)}>
          Guardar cambios
        </button>
        <button className="button button--ghost" type="button" onClick={() => onEnrich(draft)} disabled={enriching}>
          {enriching ? "Enriqueciendo" : "Enriquecer web/redes"}
        </button>
      </div>

      <div className="quick-actions">
        <a href={searchUrls.instagram} target="_blank" rel="noreferrer">
          Buscar Instagram
        </a>
        <a href={searchUrls.facebook} target="_blank" rel="noreferrer">
          Buscar Facebook
        </a>
        <a href={searchUrls.owner} target="_blank" rel="noreferrer">
          Buscar dueño/contacto
        </a>
      </div>

      <div className="detail-form">
        <Field label="Nombre" value={draft.name} onChange={(value) => update("name", value)} />
        <Field label="Sector" value={draft.sector} onChange={(value) => update("sector", value)} />
        <Field label="Ciudad" value={draft.city} onChange={(value) => update("city", value)} />
        <Field label="Dirección" value={draft.address} onChange={(value) => update("address", value)} />
        <Field label="Teléfono" value={draft.phone} onChange={(value) => update("phone", value)} />
        <Field label="Web" value={draft.website} onChange={(value) => update("website", value)} />
        <Field label="Título web" value={draft.websiteTitle} onChange={(value) => update("websiteTitle", value)} />
        <Field label="Dueño/contacto" value={draft.ownerName} onChange={(value) => update("ownerName", value)} />
        <Field label="Instagram" value={draft.instagramUrl} onChange={(value) => update("instagramUrl", value)} />
        <Field label="Facebook" value={draft.facebookUrl} onChange={(value) => update("facebookUrl", value)} />
        <Field label="WhatsApp" value={draft.whatsappUrl} onChange={(value) => update("whatsappUrl", value)} />
        <Field label="Logo" value={draft.logoUrl} onChange={(value) => update("logoUrl", value)} />
        <Field label="Google Maps" value={draft.googleMapsUrl} onChange={(value) => update("googleMapsUrl", value)} />

        <label>
          Estado
          <select value={draft.status} onChange={(event) => update("status", event.target.value as LeadStatus)}>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          Seguidores IG
          <select
            value={draft.followersBucket}
            onChange={(event) => update("followersBucket", event.target.value as FollowersBucket)}
          >
            {followersBuckets.map((bucket) => (
              <option key={bucket} value={bucket}>
                {bucket}
              </option>
            ))}
          </select>
        </label>

        <label>
          Uso de contenido
          <select value={draft.contentUse} onChange={(event) => update("contentUse", event.target.value as ContentUse)}>
            {contentUses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Prioridad
          <select
            value={draft.priority}
            onChange={(event) => update("priority", event.target.value as Lead["priority"])}
          >
            {priorityOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <NumberField label="Potencial" value={draft.potential} onChange={(value) => update("potential", value)} />
        <NumberField label="Rating" value={draft.rating} onChange={(value) => update("rating", value)} />
        <NumberField label="Reseñas" value={draft.reviews} onChange={(value) => update("reviews", value)} />
        <NumberField label="Fotos Google" value={draft.googlePhotos} onChange={(value) => update("googlePhotos", value)} />

        <TextArea label="Descripción" value={draft.description} onChange={(value) => update("description", value)} />
        <TextArea label="Dolor" value={draft.pain} onChange={(value) => update("pain", value)} />
        <TextArea label="Diagnóstico" value={draft.diagnosis} onChange={(value) => update("diagnosis", value)} />
        <TextArea label="Próximo paso" value={draft.nextAction} onChange={(value) => update("nextAction", value)} />
        <Field label="Último contacto" value={draft.lastContact} onChange={(value) => update("lastContact", value)} />
      </div>
    </aside>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value || 0))} />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="detail-form__wide">
      {label}
      <textarea value={value} rows={3} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
