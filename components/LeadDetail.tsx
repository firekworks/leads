"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContentUse, FollowersBucket, Lead, LeadActivity, LeadNote, LeadStatus, LeadTask } from "@/types/lead";
import { googleSearchUrls } from "@/lib/leads-repository";
import { estimateMonthlyValue, explainPotential, recommendServicePlan, scoreLabel } from "@/lib/scoring";
import { statusTone } from "@/lib/status";
import { ScoreRing } from "@/components/ScoreRing";

type LeadDetailProps = {
  lead: Lead;
  statuses: LeadStatus[];
  onSave: (lead: Lead) => void;
  onEnrich: (lead: Lead) => void;
  onFindOwner: (lead: Lead) => void;
  onAddActivity: (lead: Lead, activity: { type: string; result: string; nextAction: string; reminderAt: string }) => void;
  onConvert: (lead: Lead) => void;
  activities: LeadActivity[];
  tasks: LeadTask[];
  notes: LeadNote[];
  enriching: boolean;
  findingOwner: boolean;
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
  "Sin uso",
  "Flojo",
  "Activo",
  "Muy trabajado"
];

const priorityOptions: Lead["priority"][] = ["Muy alta", "Alta", "Media", "Baja"];

export function LeadDetail({
  lead,
  statuses,
  onSave,
  onEnrich,
  onFindOwner,
  onAddActivity,
  onConvert,
  activities,
  tasks,
  notes,
  enriching,
  findingOwner
}: LeadDetailProps) {
  const [draft, setDraft] = useState(lead);
  const [activityResult, setActivityResult] = useState("");
  const [activityType, setActivityType] = useState("WhatsApp");
  const [activityNext, setActivityNext] = useState("");
  const [activityReminder, setActivityReminder] = useState("");
  const searchUrls = useMemo(() => googleSearchUrls(draft), [draft]);
  const monthlyValue = estimateMonthlyValue(draft);
  const plan = recommendServicePlan(draft);
  const potentialReasons = explainPotential(draft);

  useEffect(() => {
    setDraft(lead);
  }, [lead]);

  function update<K extends keyof Lead>(key: K, value: Lead[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <aside className="lead-detail">
      <div className="lead-detail__top">
        <div className="lead-title-block">
          <span className="eyebrow">Ficha comercial</span>
          <h2>{draft.name}</h2>
          <p>
            {draft.sector} · {draft.city}
          </p>
          <span className={`status-pill status-pill--${statusTone(draft.status)}`}>{draft.status}</span>
        </div>
        <ScoreRing score={draft.score} label={scoreLabel(draft.score)} />
      </div>

      <div className="detail-summary">
        <div>
          <span>Estimación</span>
          <strong>{monthlyValue ? `≈ ${monthlyValue}€/mes` : "Sin potencial activo"}</strong>
        </div>
        <div>
          <span>Plan</span>
          <strong>{plan.name}</strong>
        </div>
        <div>
          <span>Ads</span>
          <strong>≈ {plan.ads}€/mes</strong>
        </div>
      </div>

      <div className="plan-strip">
        <span>{plan.visits}</span>
        <span>{plan.content}</span>
        <span>{draft.contentUse}</span>
      </div>

      <div className="reason-strip" aria-label="Motivos del potencial">
        {potentialReasons.map((reason) => (
          <span key={reason}>{reason}</span>
        ))}
      </div>

      <div className="detail-actions">
        <button className="button" type="button" onClick={() => onSave(draft)}>
          Guardar
        </button>
        <button className="button button--ghost" type="button" onClick={() => onEnrich(draft)} disabled={enriching}>
          {enriching ? "Enriqueciendo" : "Enriquecer web"}
        </button>
        <button className="button button--dark" type="button" onClick={() => onConvert(draft)}>
          Convertir en cliente
        </button>
      </div>

      <div className="quick-actions">
        <a href={searchUrls.instagram} target="_blank" rel="noreferrer">
          IG
        </a>
        <a href={searchUrls.facebook} target="_blank" rel="noreferrer">
          FB
        </a>
        <a href={searchUrls.owner} target="_blank" rel="noreferrer">
          Dueño
        </a>
        <a href={draft.googleMapsUrl || searchUrls.googleMaps} target="_blank" rel="noreferrer">
          Maps
        </a>
        <button type="button" onClick={() => onFindOwner(draft)} disabled={findingOwner || !draft.placeId}>
          {findingOwner ? "Buscando" : "Reseñas"}
        </button>
      </div>

      <div className="detail-form">
        <section className="detail-section detail-section--decision">
          <h3>Decisión comercial</h3>
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
          <NumberField label="Potencial base" value={draft.potential} onChange={(value) => update("potential", value)} />
          <DateField
            label="Próximo seguimiento"
            value={draft.nextFollowUpAt?.slice(0, 16) || ""}
            onChange={(value) => update("nextFollowUpAt", value)}
          />
          <TextArea label="Próximo paso" value={draft.nextAction} onChange={(value) => update("nextAction", value)} />
        </section>

        <section className="detail-section">
          <h3>Contacto</h3>
          <Field label="Nombre" value={draft.name} onChange={(value) => update("name", value)} />
          <Field label="Sector" value={draft.sector} onChange={(value) => update("sector", value)} />
          <Field label="Ciudad" value={draft.city} onChange={(value) => update("city", value)} />
          <Field label="Dirección" value={draft.address} onChange={(value) => update("address", value)} />
          <Field label="Teléfono" value={draft.phone} onChange={(value) => update("phone", value)} />
          <Field label="Dueño/contacto" value={draft.ownerName} onChange={(value) => update("ownerName", value)} />
        </section>

        <section className="detail-section">
          <h3>Imagen digital</h3>
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
          <Field label="Instagram" value={draft.instagramUrl} onChange={(value) => update("instagramUrl", value)} />
          <Field label="Facebook" value={draft.facebookUrl} onChange={(value) => update("facebookUrl", value)} />
          <Field label="WhatsApp" value={draft.whatsappUrl} onChange={(value) => update("whatsappUrl", value)} />
          <Field label="Web" value={draft.website} onChange={(value) => update("website", value)} />
          <Field label="Logo" value={draft.logoUrl} onChange={(value) => update("logoUrl", value)} />
          <Field label="Título web" value={draft.websiteTitle} onChange={(value) => update("websiteTitle", value)} />
        </section>

        <section className="detail-section">
          <h3>Diagnóstico Firekworks</h3>
          <TextArea label="Problema detectado" value={draft.problemDetected || ""} onChange={(value) => update("problemDetected", value)} />
          <TextArea label="Oportunidad detectada" value={draft.opportunityDetected || ""} onChange={(value) => update("opportunityDetected", value)} />
          <Field label="Servicio recomendado" value={draft.recommendedService || ""} onChange={(value) => update("recommendedService", value)} />
          <Field label="Oferta recomendada" value={draft.recommendedOffer || ""} onChange={(value) => update("recommendedOffer", value)} />
          <TextArea label="Gancho de venta" value={draft.salesHook || ""} onChange={(value) => update("salesHook", value)} />
          <TextArea label="Objeción probable" value={draft.probableObjection || ""} onChange={(value) => update("probableObjection", value)} />
          <TextArea label="WhatsApp sugerido" value={draft.suggestedWhatsappMessage || ""} onChange={(value) => update("suggestedWhatsappMessage", value)} />
          <TextArea label="Argumento presencial" value={draft.inPersonArgument || ""} onChange={(value) => update("inPersonArgument", value)} />
        </section>

        <section className="detail-section">
          <h3>Scoring</h3>
          <ScoreMetric label="Digital" value={draft.scorePresenciaDigital || 0} />
          <ScoreMetric label="Urgencia" value={draft.scoreUrgencia || 0} />
          <ScoreMetric label="Dinero" value={draft.scoreDinero || 0} />
          <ScoreMetric label="Contacto" value={draft.scoreFacilidadContacto || 0} />
          <ScoreMetric label="Cierre" value={draft.scoreProbabilidadCierre || 0} />
          <ScoreMetric label="Visita" value={draft.scorePrioridadVisita || 0} />
          <div className="score-reasons">
            {(draft.scoreExplanation || []).map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        </section>

        <section className="detail-section">
          <h3>Actividad</h3>
          <label>
            Tipo
            <select value={activityType} onChange={(event) => setActivityType(event.target.value)}>
              {["WhatsApp", "llamada", "email", "Instagram", "visita", "reunión", "propuesta", "nota"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <DateField label="Recordatorio" value={activityReminder} onChange={setActivityReminder} />
          <TextArea label="Resultado" value={activityResult} onChange={setActivityResult} />
          <TextArea label="Siguiente acción" value={activityNext} onChange={setActivityNext} />
          <button
            className="button detail-form__wide"
            type="button"
            onClick={() => {
              onAddActivity(draft, {
                type: activityType,
                result: activityResult,
                nextAction: activityNext,
                reminderAt: activityReminder
              });
              setActivityResult("");
              setActivityNext("");
              setActivityReminder("");
            }}
          >
            Registrar actividad
          </button>
          <div className="timeline detail-form__wide">
            {activities.length || tasks.length || notes.length ? (
              <>
                {tasks.slice(0, 3).map((task) => (
                  <article key={task.id}>
                    <strong>{task.title}</strong>
                    <span>{task.dueAt ? new Date(task.dueAt).toLocaleString("es-ES") : "Sin fecha"} · {task.status}</span>
                  </article>
                ))}
                {activities.slice(0, 5).map((activity) => (
                  <article key={activity.id}>
                    <strong>{activity.type}</strong>
                    <span>{activity.result || activity.nextAction || "Actividad registrada"}</span>
                  </article>
                ))}
                {notes.slice(0, 3).map((note) => (
                  <article key={note.id}>
                    <strong>Nota</strong>
                    <span>{note.note}</span>
                  </article>
                ))}
              </>
            ) : (
              <span className="empty-state">Sin actividad todavía</span>
            )}
          </div>
        </section>

        <section className="detail-section">
          <h3>Google y datos</h3>
          <NumberField label="Rating" value={draft.rating} onChange={(value) => update("rating", value)} />
          <NumberField label="Reseñas" value={draft.reviews} onChange={(value) => update("reviews", value)} />
          <NumberField label="Fotos" value={draft.googlePhotos} onChange={(value) => update("googlePhotos", value)} />
          <Field label="Google Maps" value={draft.googleMapsUrl} onChange={(value) => update("googleMapsUrl", value)} />
          <TextArea label="Descripción" value={draft.description} onChange={(value) => update("description", value)} />
          <TextArea label="Dolor" value={draft.pain} onChange={(value) => update("pain", value)} />
          <TextArea label="Diagnóstico" value={draft.diagnosis} onChange={(value) => update("diagnosis", value)} />
          <Field label="Último contacto" value={draft.lastContact} onChange={(value) => update("lastContact", value)} />
          <label className="check-row">
            <input
              type="checkbox"
              checked={draft.isInvalid}
              onChange={(event) => update("isInvalid", event.target.checked)}
            />
            Marcado como inválido
          </label>
          {draft.isInvalid ? (
            <Field label="Motivo inválido" value={draft.invalidReason} onChange={(value) => update("invalidReason", value)} />
          ) : null}
        </section>
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

function DateField({
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
      <input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} />
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

function ScoreMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <i style={{ width: `${value}%` }} />
    </div>
  );
}
