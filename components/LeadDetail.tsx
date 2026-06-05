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
  variant?: "inline" | "panel";
  onSave: (lead: Lead) => void;
  onEnrich: (lead: Lead) => void;
  onFindOwner: (lead: Lead) => void;
  onAddActivity: (lead: Lead, activity: { type: string; result: string; nextAction: string; reminderAt: string }) => void;
  onConvert: (lead: Lead) => void;
  onClose?: () => void;
  activities: LeadActivity[];
  tasks: LeadTask[];
  notes: LeadNote[];
  enriching: boolean;
  findingOwner: boolean;
};

const followersBuckets: FollowersBucket[] = ["Pendiente", "Sin cuenta", "< 1.000", "1.000 - 5.000", "+5.000"];
const contentUses: ContentUse[] = ["Pendiente", "Sin uso", "Flojo", "Activo", "Muy trabajado"];
const priorityOptions: Lead["priority"][] = ["Muy alta", "Alta", "Media", "Baja"];
const tabs = ["Resumen", "Contacto", "Redes", "Comercial", "Historial"] as const;
type DetailTab = (typeof tabs)[number];

export function LeadDetail({
  lead,
  statuses,
  variant = "panel",
  onSave,
  onEnrich,
  onFindOwner,
  onAddActivity,
  onConvert,
  onClose,
  activities,
  tasks,
  notes,
  enriching,
  findingOwner
}: LeadDetailProps) {
  const [draft, setDraft] = useState(lead);
  const [activeTab, setActiveTab] = useState<DetailTab>("Resumen");
  const [activityType, setActivityType] = useState("WhatsApp");
  const [activityResult, setActivityResult] = useState("");
  const [activityNext, setActivityNext] = useState("");
  const [activityReminder, setActivityReminder] = useState("");
  const searchUrls = useMemo(() => googleSearchUrls(draft), [draft]);
  const monthlyValue = estimateMonthlyValue(draft);
  const plan = recommendServicePlan(draft);
  const potentialReasons = explainPotential(draft);
  const scoreReasons = [...(draft.scoreTags || []), ...(draft.scoreExplanation || [])].slice(0, 6);

  useEffect(() => {
    setDraft(lead);
    setActiveTab("Resumen");
  }, [lead]);

  function update<K extends keyof Lead>(key: K, value: Lead[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function copyText(text: string) {
    if (!text) return;
    void navigator.clipboard?.writeText(text);
  }

  function save() {
    onSave({ ...draft, updatedAt: new Date().toISOString() });
  }

  function discard() {
    onSave({
      ...draft,
      status: "No contactar",
      isInvalid: true,
      isDisqualified: true,
      validationStatus: "descartado",
      disqualifiedReason: draft.disqualifiedReason || "Marcado como no cliente probable",
      updatedAt: new Date().toISOString()
    });
  }

  function restore() {
    onSave({
      ...draft,
      status: draft.status === "No contactar" ? "Detectado" : draft.status,
      isInvalid: false,
      isDisqualified: false,
      validationStatus: "revisar",
      manualOverride: true,
      updatedAt: new Date().toISOString()
    });
  }

  return (
    <aside className={variant === "inline" ? "lead-detail lead-detail--inline" : "lead-detail"}>
      <button className="drawer-close" type="button" onClick={onClose} aria-label="Cerrar ficha">
        ×
      </button>

      <div className="lead-detail__top">
        <div className="lead-title-block">
          <span className="eyebrow">Ficha</span>
          <h2>{draft.name}</h2>
          <p>{draft.city} · {draft.sector}</p>
          <span className={`status-pill status-pill--${statusTone(draft.status)}`}>{draft.status}</span>
        </div>
        <ScoreRing score={draft.score} label={scoreLabel(draft.score)} />
      </div>

      <div className="detail-summary">
        <div>
          <span>Mensualidad</span>
          <strong>{monthlyValue ? `≈ ${monthlyValue}€` : "Sin encaje"}</strong>
        </div>
        <div>
          <span>Plan</span>
          <strong>{plan.name}</strong>
        </div>
        <div>
          <span>Ads</span>
          <strong>≈ {plan.ads}€</strong>
        </div>
      </div>

      <div className="plan-strip">
        <span>{plan.visits}</span>
        <span>{plan.content}</span>
        <span>{draft.contentUse}</span>
      </div>

      <div className="detail-actions">
        <button className="button" type="button" onClick={save}>Guardar</button>
        <button className="button button--ghost" type="button" onClick={() => onEnrich(draft)} disabled={enriching}>
          {enriching ? "Enriqueciendo" : "Enriquecer"}
        </button>
      </div>

      <nav className="detail-tabs" aria-label="Secciones de la ficha">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "detail-tab detail-tab--active" : "detail-tab"}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="detail-form">
        {activeTab === "Resumen" ? (
          <>
            <section className="detail-section">
              <h3>Señales</h3>
              <div className="signal-grid">
                <Signal label="IG" active={Boolean(draft.instagramUrl)} />
                <Signal label="FB" active={Boolean(draft.facebookUrl)} />
                <Signal label="Web" active={Boolean(draft.website)} />
                <Signal label="Tel" active={Boolean(draft.phone || draft.whatsappUrl)} />
                <Signal label="Maps" active={Boolean(draft.googleMapsUrl)} />
                <Signal label="Reseñas" active={draft.reviews > 0} value={String(draft.reviews || 0)} />
              </div>
              <div className="reason-strip">
                {potentialReasons.map((reason) => <span key={reason}>{reason}</span>)}
              </div>
            </section>

            <section className="detail-section">
              <h3>Score</h3>
              <ScoreMetric label="Digital" value={draft.scorePresenciaDigital || 0} />
              <ScoreMetric label="Urgencia" value={draft.scoreUrgencia || 0} />
              <ScoreMetric label="Dinero" value={draft.scoreDinero || 0} />
              <ScoreMetric label="Contacto" value={draft.scoreFacilidadContacto || 0} />
              <ScoreMetric label="Cierre" value={draft.scoreProbabilidadCierre || 0} />
              <ScoreMetric label="Visita" value={draft.scorePrioridadVisita || 0} />
              <div className="score-reasons">
                {scoreReasons.map((reason) => <span key={reason}>{reason}</span>)}
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "Contacto" ? (
          <section className="detail-section detail-section--wide">
            <h3>Contacto</h3>
            <Field label="Nombre" value={draft.name} onChange={(value) => update("name", value)} />
            <Field label="Sector" value={draft.sector} onChange={(value) => update("sector", value)} />
            <Field label="Ciudad" value={draft.city} onChange={(value) => update("city", value)} />
            <Field label="Dirección" value={draft.address} onChange={(value) => update("address", value)} />
            <Field label="Teléfono" value={draft.phone} onChange={(value) => update("phone", value)} />
            <Field label="Dueño/contacto" value={draft.ownerName} onChange={(value) => update("ownerName", value)} />
            <div className="quick-actions detail-form__wide">
              <a href={draft.googleMapsUrl || searchUrls.googleMaps} target="_blank" rel="noreferrer">Maps</a>
              <button type="button" onClick={() => copyText(draft.phone)}>Copiar tel</button>
              <a href={searchUrls.owner} target="_blank" rel="noreferrer">Dueño</a>
              <button type="button" onClick={() => onFindOwner(draft)} disabled={findingOwner || !draft.placeId}>
                {findingOwner ? "Buscando" : "Reseñas"}
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "Redes" ? (
          <section className="detail-section detail-section--wide">
            <h3>Redes</h3>
            <label>
              Seguidores IG
              <select value={draft.followersBucket} onChange={(event) => update("followersBucket", event.target.value as FollowersBucket)}>
                {followersBuckets.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}
              </select>
            </label>
            <label>
              Uso contenido
              <select value={draft.contentUse} onChange={(event) => update("contentUse", event.target.value as ContentUse)}>
                {contentUses.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <Field label="Instagram" value={draft.instagramUrl} onChange={(value) => update("instagramUrl", value)} />
            <Field label="Facebook" value={draft.facebookUrl} onChange={(value) => update("facebookUrl", value)} />
            <Field label="WhatsApp" value={draft.whatsappUrl} onChange={(value) => update("whatsappUrl", value)} />
            <Field label="Web" value={draft.website} onChange={(value) => update("website", value)} />
            <Field label="Logo" value={draft.logoUrl} onChange={(value) => update("logoUrl", value)} />
            <Field label="Título web" value={draft.websiteTitle} onChange={(value) => update("websiteTitle", value)} />
            <NumberField label="Rating" value={draft.rating} onChange={(value) => update("rating", value)} />
            <NumberField label="Reseñas" value={draft.reviews} onChange={(value) => update("reviews", value)} />
            <div className="quick-actions detail-form__wide">
              <a href={searchUrls.instagram} target="_blank" rel="noreferrer">Buscar IG</a>
              <a href={searchUrls.facebook} target="_blank" rel="noreferrer">Buscar FB</a>
              <button type="button" onClick={() => copyText(draft.instagramUrl)}>Copiar IG</button>
              <button type="button" onClick={() => copyText(draft.website)}>Copiar web</button>
            </div>
          </section>
        ) : null}

        {activeTab === "Comercial" ? (
          <section className="detail-section detail-section--wide">
            <h3>Comercial</h3>
            <label>
              Estado
              <select value={draft.status} onChange={(event) => update("status", event.target.value as LeadStatus)}>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label>
              Prioridad
              <select value={draft.priority} onChange={(event) => update("priority", event.target.value as Lead["priority"])}>
                {priorityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <NumberField label="Potencial base" value={draft.potential} onChange={(value) => update("potential", value)} />
            <DateField label="Seguimiento" value={draft.nextFollowUpAt?.slice(0, 16) || ""} onChange={(value) => update("nextFollowUpAt", value)} />
            <TextArea label="Próximo paso" value={draft.nextAction} onChange={(value) => update("nextAction", value)} />
            <TextArea label="Problema" value={draft.problemDetected || draft.pain} onChange={(value) => update("problemDetected", value)} />
            <TextArea label="Oportunidad" value={draft.opportunityDetected || draft.diagnosis} onChange={(value) => update("opportunityDetected", value)} />
            <Field label="Servicio" value={draft.recommendedService || ""} onChange={(value) => update("recommendedService", value)} />
            <Field label="Oferta" value={draft.recommendedOffer || ""} onChange={(value) => update("recommendedOffer", value)} />
            <TextArea label="WhatsApp" value={draft.suggestedWhatsappMessage || ""} onChange={(value) => update("suggestedWhatsappMessage", value)} />
            <TextArea label="Instagram" value={draft.suggestedInstagramMessage || ""} onChange={(value) => update("suggestedInstagramMessage", value)} />
            {draft.isInvalid || draft.isDisqualified ? (
              <Field label="Motivo descarte" value={draft.disqualifiedReason || draft.invalidReason} onChange={(value) => {
                update("disqualifiedReason", value);
                update("invalidReason", value);
              }} />
            ) : null}
            <div className="detail-actions detail-form__wide">
              <button className="button button--dark" type="button" onClick={() => onConvert(draft)}>Convertir</button>
              {draft.isInvalid || draft.isDisqualified || draft.status === "No contactar" ? (
                <button className="button button--ghost" type="button" onClick={restore}>Restaurar</button>
              ) : (
                <button className="button button--ghost" type="button" onClick={discard}>Descartar</button>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "Historial" ? (
          <section className="detail-section detail-section--wide">
            <h3>Historial</h3>
            <label>
              Tipo
              <select value={activityType} onChange={(event) => setActivityType(event.target.value)}>
                {["WhatsApp", "llamada", "email", "Instagram", "visita", "reunión", "propuesta", "nota"].map((item) => (
                  <option key={item} value={item}>{item}</option>
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
              Registrar
            </button>
            <div className="timeline detail-form__wide">
              {tasks.slice(0, 3).map((task) => (
                <article key={task.id}>
                  <strong>{task.title}</strong>
                  <span>{task.dueAt ? new Date(task.dueAt).toLocaleString("es-ES") : "Sin fecha"} · {task.status}</span>
                </article>
              ))}
              {activities.slice(0, 6).map((activity) => (
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
              {!tasks.length && !activities.length && !notes.length ? <span className="empty-state">Sin actividad</span> : null}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function Signal({ label, active, value }: { label: string; active: boolean; value?: string }) {
  return (
    <span className={active ? "signal-chip signal-chip--active" : "signal-chip"}>
      <strong>{value || label}</strong>
      <small>{label}</small>
    </span>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value || 0))} />
    </label>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
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
