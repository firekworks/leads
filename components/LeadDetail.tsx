"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ContentUse, FollowersBucket, Lead, LeadActivity, LeadNote, LeadStatus, LeadTask } from "@/types/lead";
import { googleSearchUrls } from "@/lib/leads-repository";
import { estimateAdBudget, estimateMonthlyValue, recommendServicePlan, scoreLabel } from "@/lib/scoring";
import { statusTone } from "@/lib/status";
import { ScoreRing } from "@/components/ScoreRing";

type LeadDetailProps = {
  lead: Lead;
  statuses: LeadStatus[];
  variant?: "inline" | "panel";
  onSave: (lead: Lead) => void | Promise<void>;
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
const tabs = ["Resumen", "Auditoría", "Fuentes", "Propuesta", "Seguimiento", "Acciones"] as const;
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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirtyRef = useRef(false);
  const searchUrls = useMemo(() => googleSearchUrls(draft), [draft]);
  const plan = recommendServicePlan(draft);
  const monthlyValue = estimateMonthlyValue(draft);
  const scoreReasons = [...(draft.scoreExplanation || []), ...(draft.scoreTags || [])].slice(0, 6);
  const demo = buildDemo(draft);
  const messages = buildMessages(draft);

  useEffect(() => {
    dirtyRef.current = false;
    setDraft(lead);
    setActiveTab("Resumen");
    setSaveStatus("idle");
  }, [lead]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = window.setTimeout(() => {
      void saveDraft({ silent: true });
    }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  function update<K extends keyof Lead>(key: K, value: Lead[K]) {
    dirtyRef.current = true;
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveDraft(options?: { silent?: boolean }) {
    setSaveStatus("saving");
    try {
      await onSave({ ...draft, updatedAt: new Date().toISOString() });
      dirtyRef.current = false;
      setSaveStatus("saved");
      if (!options?.silent) setActiveTab(activeTab);
    } catch {
      setSaveStatus("error");
    }
  }

  async function generateDemo() {
    const nextLead = {
      ...draft,
      problemDetected: demo.problem,
      opportunityDetected: demo.opportunity,
      recommendedService: demo.proposal,
      recommendedOffer: plan.name,
      salesHook: demo.hook,
      inPersonArgument: messages.visit,
      suggestedWhatsappMessage: messages.whatsapp,
      suggestedInstagramMessage: messages.instagram,
      probableObjection: messages.objections,
      nextAction: draft.nextAction || "Enviar diagnóstico breve y proponer visita de 15 minutos",
      updatedAt: new Date().toISOString()
    };
    setDraft(nextLead);
    dirtyRef.current = false;
    await onSave(nextLead);
    setSaveStatus("saved");
  }

  function copyText(text: string) {
    if (!text) return;
    void navigator.clipboard?.writeText(text);
  }

  async function setStatus(status: LeadStatus) {
    const discard = ["No contactar", "No encaja", "Perdido"].includes(status);
    const nextLead = {
      ...draft,
      status,
      isInvalid: discard,
      isDisqualified: discard,
      validationStatus: discard ? "descartado" : draft.validationStatus,
      disqualifiedReason: discard ? draft.disqualifiedReason || "No cliente probable" : draft.disqualifiedReason,
      updatedAt: new Date().toISOString()
    } as Lead;
    setDraft(nextLead);
    await onSave(nextLead);
  }

  function restore() {
    void onSave({
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
    <aside className={variant === "inline" ? "lead-detail lead-detail--inline" : "lead-detail lead-detail--panel"}>
      <button className="drawer-close" type="button" onClick={onClose} aria-label="Cerrar ficha">
        x
      </button>

      <div className="lead-detail__top">
        <div className="lead-title-block">
          <span className="eyebrow">Ficha lead</span>
          <h2>{draft.name}</h2>
          <p>{draft.city} · {draft.sector}</p>
          <span className={`status-pill status-pill--${statusTone(draft.status)}`}>{draft.status}</span>
        </div>
        <ScoreRing score={draft.score} label={scoreLabel(draft.score)} />
      </div>

      <div className="detail-summary">
        <MiniStat label="Temperatura" value={scoreLabel(draft.score)} />
        <MiniStat label="Mensualidad" value={monthlyValue ? `≈ ${monthlyValue}€` : "Revisar"} />
        <MiniStat label="Ads orientativo" value={`≈ ${estimateAdBudget(draft)}€`} />
        <MiniStat label="Plan" value={plan.name} />
        <MiniStat label="Próximo paso" value={draft.nextAction || "Pendiente"} />
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
          <section className="detail-section detail-section--wide">
            <h3>Decisión rápida</h3>
            <div className="decision-grid">
              <Decision label="Demanda" value={draft.reviews ? `${draft.rating || "-"}★ · ${draft.reviews} reseñas` : "No verificado"} />
              <Decision label="Oferta" value={plan.name} />
              <Decision label="Brecha" value={!draft.website ? "Landing/SEO" : !draft.instagramUrl ? "Contenido" : "Optimizar"} />
              <Decision label="Contacto" value={draft.phone || draft.whatsappUrl ? "Fácil" : "Buscar"} />
              <Decision label="Ruta" value={draft.address ? "Visitable" : "Pendiente"} />
            </div>
            <div className="score-reasons">
              {scoreReasons.length ? scoreReasons.map((reason) => <span key={reason}>{reason}</span>) : <span>Pendiente de enriquecer.</span>}
            </div>
            <TextArea label="Próximo paso" value={draft.nextAction} onChange={(value) => update("nextAction", value)} />
          </section>
        ) : null}

        {activeTab === "Auditoría" ? (
          <section className="detail-section detail-section--wide">
            <h3>Auditoría comercial</h3>
            <div className="audit-lines">
              <AuditLine label="Google Maps" value={draft.googleMapsUrl ? "Detectado" : "Pendiente"} source="Google Places" confidence={draft.googleMapsUrl ? "Alta" : "Baja"} />
              <AuditLine label="Rating" value={draft.rating ? `${draft.rating} / 5` : "No verificado"} source="Places" confidence={draft.rating ? "Media" : "Baja"} />
              <AuditLine label="Reseñas" value={draft.reviews ? String(draft.reviews) : "No verificado"} source="Places" confidence={draft.reviews ? "Media" : "Baja"} />
              <AuditLine label="Web" value={draft.website ? "Detectada" : "No detectada"} source={draft.website ? "Lead" : "Pendiente"} confidence={draft.website ? "Media" : "Baja"} />
              <AuditLine label="Instagram" value={draft.instagramUrl ? "Detectado" : "Pendiente"} source={draft.instagramStatus || "manual"} confidence={draft.instagramUrl ? "Media" : "Baja"} />
              <AuditLine label="Facebook" value={draft.facebookUrl ? "Detectado" : "Pendiente"} source="web/manual" confidence={draft.facebookUrl ? "Media" : "Baja"} />
              <AuditLine label="Teléfono" value={draft.phone ? "Detectado" : "Pendiente"} source="Places/manual" confidence={draft.phone ? "Alta" : "Baja"} />
              <AuditLine label="WhatsApp" value={draft.whatsappUrl ? "Detectado" : "Pendiente"} source="web/manual" confidence={draft.whatsappUrl ? "Media" : "Baja"} />
              <AuditLine label="Fotos" value={draft.googlePhotos ? `${draft.googlePhotos} fotos` : "No verificado"} source="Places" confidence={draft.googlePhotos ? "Media" : "Baja"} />
              <AuditLine label="Facturación" value="No verificada" source="Provider pendiente" confidence="Baja" />
            </div>
          </section>
        ) : null}

        {activeTab === "Fuentes" ? (
          <section className="detail-section detail-section--wide">
            <h3>Fuentes y edición</h3>
            <div className="source-list">
              <SourceLine label="Google Places" value={draft.placeId || "Pendiente"} />
              <SourceLine label="Web" value={draft.website || "Pendiente de enriquecer"} />
              <SourceLine label="Instagram" value={draft.instagramUrl || "Pendiente"} />
              <SourceLine label="Facebook" value={draft.facebookUrl || "Pendiente"} />
              <SourceLine label="Última revisión" value={draft.lastEnrichedAt || draft.lastRefreshedAt || "Pendiente"} />
              <SourceLine label="Confianza" value={draft.scoreTags?.includes("No cliente") ? "Baja" : draft.enrichmentStatus || "Pendiente"} />
            </div>
            <Field label="Nombre" value={draft.name} onChange={(value) => update("name", value)} />
            <Field label="Ciudad" value={draft.city} onChange={(value) => update("city", value)} />
            <Field label="Sector" value={draft.sector} onChange={(value) => update("sector", value)} />
            <Field label="Teléfono" value={draft.phone} onChange={(value) => update("phone", value)} />
            <Field label="Web" value={draft.website} onChange={(value) => update("website", value)} />
            <Field label="Instagram" value={draft.instagramUrl} onChange={(value) => update("instagramUrl", value)} />
            <Field label="Facebook" value={draft.facebookUrl} onChange={(value) => update("facebookUrl", value)} />
            <Field label="Dirección" value={draft.address} onChange={(value) => update("address", value)} />
          </section>
        ) : null}

        {activeTab === "Propuesta" ? (
          <section className="detail-section detail-section--wide">
            <h3>Propuesta presencial</h3>
            <div className="demo-grid">
              <DemoBlock title="Problema" text={draft.problemDetected || demo.problem} />
              <DemoBlock title="Oportunidad" text={draft.opportunityDetected || demo.opportunity} />
              <DemoBlock title="Propuesta Firekworks" text={draft.recommendedService || demo.proposal} />
              <DemoBlock title="Pack" text={plan.name} />
              <DemoBlock title="Ads" text={demo.ads} />
              <DemoBlock title="Siguiente paso" text={demo.cta} />
            </div>
            <button className="button button--primary" type="button" onClick={generateDemo}>Generar propuesta</button>
          </section>
        ) : null}

        {activeTab === "Seguimiento" ? (
          <section className="detail-section detail-section--wide">
            <h3>Seguimiento</h3>
            <MessageBlock title="WhatsApp" text={draft.suggestedWhatsappMessage || messages.whatsapp} onCopy={copyText} />
            <MessageBlock title="Instagram DM" text={draft.suggestedInstagramMessage || messages.instagram} onCopy={copyText} />
            <MessageBlock title="Visita presencial" text={draft.inPersonArgument || messages.visit} onCopy={copyText} />
            <MessageBlock title="Objeciones" text={draft.probableObjection || messages.objections} onCopy={copyText} />
          </section>
        ) : null}

        {activeTab === "Acciones" ? (
          <section className="detail-section detail-section--wide">
            <h3>Acciones</h3>
            <div className="detail-actions">
              <button className="button" type="button" onClick={() => saveDraft()}>{saveStatusLabel(saveStatus)}</button>
              <button className="button button--ghost" type="button" onClick={() => onEnrich(draft)} disabled={enriching}>{enriching ? "Enriqueciendo" : "Enriquecer"}</button>
              <button className="button button--ghost" type="button" onClick={() => onFindOwner(draft)} disabled={findingOwner || !draft.placeId}>{findingOwner ? "Buscando" : "Buscar dueño"}</button>
              <button className="button button--ghost" type="button" onClick={() => update("nextFollowUpType", "ruta")}>Añadir a ruta</button>
              <button className="button button--ghost" type="button" onClick={() => setStatus("Prioritario")}>Priorizar</button>
              <button className="button button--ghost" type="button" onClick={() => setStatus("Contactado")}>Contactado</button>
              <button className="button button--ghost" type="button" onClick={() => setStatus("No contactar")}>Descartar</button>
              <button className="button button--ghost" type="button" onClick={() => onConvert(draft)} disabled={draft.status === "Ganado"}>Convertir</button>
            </div>
            <div className="quick-actions">
              <a href={draft.googleMapsUrl || searchUrls.googleMaps} target="_blank" rel="noreferrer">Maps</a>
              <a href={searchUrls.instagram} target="_blank" rel="noreferrer">Buscar IG</a>
              <a href={searchUrls.facebook} target="_blank" rel="noreferrer">Buscar FB</a>
              <a href={searchUrls.owner} target="_blank" rel="noreferrer">Dueño</a>
              {(draft.isInvalid || draft.isDisqualified || draft.status === "No contactar") ? <button type="button" onClick={restore}>Restaurar</button> : null}
            </div>

            <label>
              Estado
              <select value={draft.status} onChange={(event) => setStatus(event.target.value as LeadStatus)}>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
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
            <DateField label="Seguimiento" value={draft.nextFollowUpAt?.slice(0, 16) || ""} onChange={(value) => update("nextFollowUpAt", value)} />
            <TextArea label="Nota interna" value={draft.inPersonArgument || ""} onChange={(value) => update("inPersonArgument", value)} />

            <div className="activity-box detail-form__wide">
              <select value={activityType} onChange={(event) => setActivityType(event.target.value)}>
                {["WhatsApp", "llamada", "email", "Instagram", "visita", "reunión", "propuesta", "nota"].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <DateField label="Recordatorio" value={activityReminder} onChange={setActivityReminder} />
              <TextArea label="Resultado" value={activityResult} onChange={setActivityResult} />
              <TextArea label="Siguiente acción" value={activityNext} onChange={setActivityNext} />
              <button
                className="button"
                type="button"
                onClick={() => {
                  onAddActivity(draft, { type: activityType, result: activityResult, nextAction: activityNext, reminderAt: activityReminder });
                  setActivityResult("");
                  setActivityNext("");
                  setActivityReminder("");
                }}
              >
                Registrar actividad
              </button>
            </div>

            <Timeline activities={activities} tasks={tasks} notes={notes} />
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Decision({ label, value }: { label: string; value: string }) {
  return (
    <div className="decision-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AuditLine({ label, value, source, confidence }: { label: string; value: string; source: string; confidence: string }) {
  return (
    <div className="audit-line">
      <strong>{label}</strong>
      <span>{value}</span>
      <small>{source}</small>
      <em>{confidence}</em>
    </div>
  );
}

function SourceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="source-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DemoBlock({ title, text }: { title: string; text: string }) {
  return (
    <article className="demo-block">
      <span>{title}</span>
      <p>{text}</p>
    </article>
  );
}

function MessageBlock({ title, text, onCopy }: { title: string; text: string; onCopy: (text: string) => void }) {
  return (
    <article className="message-block">
      <header>
        <span>{title}</span>
        <button type="button" onClick={() => onCopy(text)}>Copiar</button>
      </header>
      <p>{text}</p>
    </article>
  );
}

function Timeline({ activities, tasks, notes }: { activities: LeadActivity[]; tasks: LeadTask[]; notes: LeadNote[] }) {
  return (
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

function saveStatusLabel(status: "idle" | "saving" | "saved" | "error") {
  if (status === "saving") return "Guardando...";
  if (status === "saved") return "Guardado";
  if (status === "error") return "Error";
  return "Guardar";
}

function buildDemo(lead: Lead) {
  const hasDemand = lead.reviews >= 60 || lead.rating >= 4.4;
  const problem = hasDemand
    ? `Tiene demanda visible, pero conviene convertir esa atención en contactos medibles. ${missingSignal(lead)}`
    : `Antes de vender una propuesta fuerte hay que verificar demanda, contacto y presencia digital. ${missingSignal(lead)}`;
  const opportunity = lead.phone || lead.whatsappUrl
    ? "Hay vía directa para activar WhatsApp Business, campañas Meta y seguimiento rápido."
    : "La oportunidad empieza por encontrar un canal de contacto fiable y una oferta sencilla.";
  const proposal = `${recommendServicePlan(lead).name}: contenido profesional, landing/captación local, Google Business Profile, WhatsApp Business y Meta Ads con seguimiento.`;

  return {
    problem,
    opportunity,
    proposal,
    hook: hasDemand ? "Demanda visible + brecha digital = ángulo de venta claro." : "Validar primero, proponer después.",
    landing: `Landing breve para ${lead.name}: prueba social, oferta local, WhatsApp visible, formulario y palabras clave de ${lead.city}.`,
    ads: `Campaña Meta local con creatividad audiovisual, radio cercano a ${lead.city} y objetivo WhatsApp/leads.`,
    cta: "Proponer diagnóstico presencial de 15 minutos y una demo visual antes de vender mensualidad."
  };
}

function buildMessages(lead: Lead) {
  const hook = lead.reviews >= 60
    ? `he visto que tenéis bastante movimiento en Google (${lead.reviews} reseñas)`
    : "estoy revisando negocios locales con margen para captar más clientes";
  const gap = missingSignal(lead);

  return {
    whatsapp: `Hola, soy Firekworks. ${hook}. ${gap} Si te encaja, puedo enseñarte una idea muy breve para convertir más visitas en consultas por WhatsApp.`,
    instagram: `Hola, soy Firekworks. Trabajo captación local con contenido profesional, Meta Ads, Google Business y WhatsApp. He visto una oportunidad para ${lead.name}: ${gap}`,
    visit: `Entraría con un diagnóstico corto: demanda visible, hueco digital, propuesta de contenido/ads y siguiente paso simple para captar clientes locales.`,
    objections: "Precio: empezar con plan de arranque. Tiempo: una visita mensual. Dudas: mostrar ejemplo visual antes de pedir decisión."
  };
}

function missingSignal(lead: Lead) {
  if (!lead.website) return "No he verificado una web/landing clara para convertir búsquedas en clientes.";
  if (!lead.instagramUrl) return "No he verificado un Instagram claro para reforzar confianza visual.";
  if (!lead.whatsappUrl) return "No he verificado WhatsApp como canal principal de conversión.";
  return "La mejora estaría en ordenar campaña, contenido y seguimiento.";
}
