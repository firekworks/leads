"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ContentUse, FollowersBucket, Lead, LeadActivity, LeadNote, LeadStatus, LeadTask } from "@/types/lead";
import { googleSearchUrls } from "@/lib/leads-repository";
import { estimateAdBudget, estimateMonthlyValue, recommendServicePlan, scoreLabel, scoreTone } from "@/lib/scoring";
import { statusTone } from "@/lib/status";

type LeadDetailProps = {
  lead: Lead;
  statuses: LeadStatus[];
  variant?: "inline" | "panel";
  accessToken?: string;
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
const tabs = ["Resumen", "Acción", "Historial"] as const;
type DetailTab = (typeof tabs)[number];

export function LeadDetail({
  lead,
  statuses,
  variant = "panel",
  accessToken,
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
  const [activityType, setActivityType] = useState("visita");
  const [activityResult, setActivityResult] = useState("");
  const [activityNext, setActivityNext] = useState("");
  const [activityReminder, setActivityReminder] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [proposalStatus, setProposalStatus] = useState("");
  const [visitStatus, setVisitStatus] = useState("");
  const dirtyRef = useRef(false);
  const searchUrls = useMemo(() => googleSearchUrls(draft), [draft]);
  const plan = recommendServicePlan(draft);
  const monthlyValue = estimateMonthlyValue(draft);
  const adBudget = estimateAdBudget(draft);
  const pitch = buildPitch(draft);
  const visitScript = buildVisitScript(draft);
  const phoneHref = draft.phone ? `tel:${draft.phone.replace(/[^\d+]/g, "")}` : "";
  const whatsappHref = draft.whatsappUrl || (draft.phone ? `https://wa.me/${draft.phone.replace(/[^\d]/g, "")}` : "");

  useEffect(() => {
    dirtyRef.current = false;
    setDraft(lead);
    setActiveTab("Resumen");
    setSaveStatus("idle");
    setProposalStatus("");
    setVisitStatus("");
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
    } catch {
      setSaveStatus("error");
      if (!options?.silent) setSaveStatus("error");
    }
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

  async function moveToNextStage() {
    const next: Partial<Record<LeadStatus, LeadStatus>> = {
      Detectado: "Validado",
      Validado: "Prioritario",
      Prioritario: "Contactado",
      Contactado: "Respondió",
      Respondió: "Reunión agendada",
      "Reunión agendada": "Diagnóstico hecho",
      "Diagnóstico hecho": "Propuesta enviada",
      "Propuesta enviada": "Negociación",
      Negociación: "Ganado"
    };
    await setStatus(next[draft.status] || draft.status);
  }

  async function generateProposal() {
    setProposalStatus("Generando");
    try {
      const response = await fetch(`/api/leads/${draft.id}/generate-proposal`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({})
      });
      const payload = (await response.json()) as { lead?: Lead; error?: string };
      if (!response.ok || !payload.lead) throw new Error(payload.error || "No se pudo generar");
      setDraft(payload.lead);
      await onSave(payload.lead);
      setProposalStatus("Propuesta guardada");
    } catch (error) {
      const localLead = applyLocalProposal(draft);
      setDraft(localLead);
      await onSave(localLead);
      setProposalStatus(error instanceof Error ? `Local: ${error.message}` : "Generada en local");
    }
  }

  async function generateVisitScript() {
    setVisitStatus("Preparando");
    try {
      const response = await fetch(`/api/leads/${draft.id}/generate-visit-script`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({})
      });
      const payload = (await response.json()) as { lead?: Lead; error?: string };
      if (!response.ok || !payload.lead) throw new Error(payload.error || "No se pudo preparar");
      setDraft(payload.lead);
      await onSave(payload.lead);
      setVisitStatus("Argumento guardado");
    } catch {
      const nextLead = { ...draft, inPersonArgument: visitScript.argument, updatedAt: new Date().toISOString() };
      setDraft(nextLead);
      await onSave(nextLead);
      setVisitStatus("Argumento local guardado");
    }
  }

  function copyText(text: string) {
    if (!text) return;
    void navigator.clipboard?.writeText(text);
  }

  return (
    <aside className={variant === "inline" ? "lead-detail lead-detail--inline" : "lead-detail lead-detail--panel"}>
      <button className="drawer-close" type="button" onClick={onClose} aria-label="Cerrar ficha">
        x
      </button>

      <div className="lead-detail__top lead-detail__top--simple">
        <div className="lead-title-block">
          <span className="eyebrow">Ficha comercial</span>
          <h2>{draft.name}</h2>
          <p>{draft.city || "Sin ciudad"} · {draft.sector || "Sin sector"}</p>
          <div className="stage-row">
            <span className={`status-pill status-pill--${statusTone(draft.status)}`}>{shortStatus(draft.status)}</span>
            <span className={`temperature-dot temperature-dot--${scoreTone(draft.score)}`}>{scoreLabel(draft.score)} · {draft.score}</span>
          </div>
        </div>
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

      <div className="detail-form detail-form--single">
        {activeTab === "Resumen" ? (
          <section className="detail-section detail-section--wide">
            <div className="detail-summary detail-summary--decision">
              <MiniStat label="Temperatura" value={`${scoreLabel(draft.score)} · ${draft.score}`} />
              <MiniStat label="Google" value={demandText(draft)} />
              <MiniStat label="Potencial" value={monthlyValue ? `≈ ${monthlyValue}€/mes` : "Validar"} />
              <MiniStat label="Validación" value={draft.validationStatus || "Pendiente"} />
            </div>

            <div className="contact-grid">
              <DataItem tone="google" label="Google Maps" value={draft.googleMapsUrl ? "Abrir ficha" : "Pendiente"} href={draft.googleMapsUrl || searchUrls.googleMaps} />
              <DataItem tone="whatsapp" label="WhatsApp" value={draft.whatsappUrl || draft.phone || "No detectado"} href={whatsappHref} />
              <DataItem tone="instagram" label="Instagram" value={draft.instagramUrl ? "Abrir perfil" : "Pendiente"} href={draft.instagramUrl || searchUrls.instagram} />
              <DataItem tone="facebook" label="Facebook" value={draft.facebookUrl ? "Abrir página" : "Pendiente"} href={draft.facebookUrl || searchUrls.facebook} />
              <DataItem tone="web" label="Web" value={draft.website || "No detectada"} href={draft.website} />
              <DataItem tone="neutral" label="Teléfono" value={draft.phone || "Pendiente"} href={phoneHref} />
              <DataItem tone="neutral" label="Dirección" value={draft.address || "Pendiente"} />
              <DataItem tone="neutral" label="Dueño/contacto" value={draft.ownerName || "Pendiente"} />
            </div>

            <div className="score-factor-grid">
              <ScoreFactor label="Demanda" score={draft.scoreDemand ?? draft.scoreDemandaVisible ?? 0} text={demandText(draft)} />
              <ScoreFactor label="Brecha digital" score={draft.scoreDigitalGap ?? draft.scorePresenciaDigital ?? 0} text={gapText(draft)} />
              <ScoreFactor label="Contacto" score={draft.scoreVisitability ?? draft.scoreFacilidadContacto ?? 0} text={contactText(draft)} />
              <ScoreFactor label="Encaje" score={draft.scoreFit ?? 0} text={fitText(draft)} />
            </div>

            <div className="score-reasons">
              {(draft.scoreExplanation?.length ? draft.scoreExplanation : [pitch.reason]).slice(0, 4).map((reason) => (
                <span key={reason}>{reason}</span>
              ))}
            </div>

            <details className="edit-accordion">
              <summary>Editar datos clave</summary>
              <div className="edit-grid">
                <Field label="Nombre" value={draft.name} onChange={(value) => update("name", value)} />
                <Field label="Sector" value={draft.sector} onChange={(value) => update("sector", value)} />
                <Field label="Ciudad" value={draft.city} onChange={(value) => update("city", value)} />
                <Field label="Dirección" value={draft.address} onChange={(value) => update("address", value)} />
                <Field label="Teléfono" value={draft.phone} onChange={(value) => update("phone", value)} />
                <Field label="Web" value={draft.website} onChange={(value) => update("website", value)} />
                <Field label="Instagram" value={draft.instagramUrl} onChange={(value) => update("instagramUrl", value)} />
                <Field label="Facebook" value={draft.facebookUrl} onChange={(value) => update("facebookUrl", value)} />
                <Field label="WhatsApp" value={draft.whatsappUrl} onChange={(value) => update("whatsappUrl", value)} />
                <Field label="Dueño/contacto" value={draft.ownerName} onChange={(value) => update("ownerName", value)} />
                <SelectField label="Seguidores IG" value={draft.followersBucket} options={followersBuckets} onChange={(value) => update("followersBucket", value as FollowersBucket)} />
                <SelectField label="Contenido" value={draft.contentUse} options={contentUses} onChange={(value) => update("contentUse", value as ContentUse)} />
              </div>
            </details>
          </section>
        ) : null}

        {activeTab === "Acción" ? (
          <section className="detail-section detail-section--wide">
            <div className="action-grid">
              <SelectField label="Estado comercial" value={draft.status} options={statuses} onChange={(value) => setStatus(value as LeadStatus)} />
              <Field label="Responsable" value={draft.assignedTo || ""} onChange={(value) => update("assignedTo", value)} />
              <DateField label="Fecha próxima acción" value={draft.nextFollowUpAt?.slice(0, 16) || ""} onChange={(value) => update("nextFollowUpAt", value)} />
              <Field label="Próxima acción" value={draft.nextAction || ""} onChange={(value) => update("nextAction", value)} />
              <TextArea label="Nota comercial breve" value={draft.pain || ""} onChange={(value) => update("pain", value)} />
              <TextArea label="Objeción principal" value={draft.probableObjection || ""} onChange={(value) => update("probableObjection", value)} />
            </div>

            <MessageBlock title="Qué decirle al entrar" text={draft.inPersonArgument || pitch.thirtySeconds} onCopy={copyText} />
            <TextArea label="Argumento presencial" value={draft.inPersonArgument || pitch.thirtySeconds} onChange={(value) => update("inPersonArgument", value)} />

            <div className="detail-actions detail-actions--primary">
              <a className="button button--ghost" href={phoneHref || undefined} aria-disabled={!phoneHref}>Llamar</a>
              <a className="button button--ghost" href={whatsappHref || undefined} target="_blank" rel="noreferrer" aria-disabled={!whatsappHref}>WhatsApp</a>
              <a className="button button--ghost" href={draft.googleMapsUrl || searchUrls.googleMaps} target="_blank" rel="noreferrer">Abrir Maps</a>
              <a className="button button--ghost" href={draft.website || undefined} target="_blank" rel="noreferrer" aria-disabled={!draft.website}>Abrir web</a>
              <a className="button button--ghost" href={draft.instagramUrl || searchUrls.instagram} target="_blank" rel="noreferrer">Instagram</a>
              <a className="button button--ghost" href={draft.facebookUrl || searchUrls.facebook} target="_blank" rel="noreferrer">Facebook</a>
              <button className="button button--ghost" type="button" onClick={() => onFindOwner(draft)} disabled={findingOwner || !draft.placeId}>
                {findingOwner ? "Buscando" : "Buscar dueño"}
              </button>
              <button className="button button--ghost" type="button" onClick={() => onEnrich(draft)} disabled={enriching}>
                {enriching ? "Completando" : "Completar ficha"}
              </button>
              <button className="button" type="button" onClick={moveToNextStage}>Avanzar etapa</button>
              <button className="button button--ghost" type="button" onClick={() => setStatus("No contactar")}>Descartar</button>
            </div>

            <div className="proposal-strip">
              <DemoBlock title="Oferta recomendada" text={draft.recommendedOffer || plan.name} />
              <DemoBlock title="Inversión ads" text={`≈ ${adBudget}€/mes`} />
              <DemoBlock title="Servicio" text={draft.recommendedService || plan.focus} />
            </div>

            <div className="detail-actions">
              <button className="button button--ghost" type="button" onClick={generateVisitScript}>Preparar argumento</button>
              <button className="button button--ghost" type="button" onClick={generateProposal}>Generar propuesta</button>
              <button className="button button--ghost" type="button" onClick={() => onConvert(draft)} disabled={draft.status === "Ganado"}>Convertir en cliente</button>
              <button className="button button--ghost" type="button" onClick={() => saveDraft()}>{saveStatusLabel(saveStatus)}</button>
            </div>
            {proposalStatus || visitStatus ? <span className="inline-status">{proposalStatus || visitStatus}</span> : null}
          </section>
        ) : null}

        {activeTab === "Historial" ? (
          <section className="detail-section detail-section--wide">
            <div className="activity-box detail-form__wide">
              <select value={activityType} onChange={(event) => setActivityType(event.target.value)}>
                {["visita", "WhatsApp", "llamada", "Instagram", "reunión", "propuesta", "nota"].map((item) => (
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
                Registrar
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

function DataItem({ label, value, href, tone }: { label: string; value: string; href?: string; tone: "google" | "whatsapp" | "instagram" | "facebook" | "web" | "neutral" }) {
  const content = (
    <>
      <span className={`data-item__icon data-item__icon--${tone}`} aria-hidden="true" />
      <span>
        <small>{label}</small>
        <strong>{value || "Pendiente"}</strong>
      </span>
    </>
  );

  if (href) {
    return (
      <a className="data-item" href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>
        {content}
      </a>
    );
  }

  return <div className="data-item">{content}</div>;
}

function ScoreFactor({ label, score, text }: { label: string; score: number; text: string }) {
  return (
    <article className="score-factor">
      <span>{label}</span>
      <strong>{score || "-"}</strong>
      <p>{text}</p>
    </article>
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
      {tasks.slice(0, 4).map((task) => (
        <article key={task.id}>
          <strong>{task.title}</strong>
          <span>{task.dueAt ? formatDate(task.dueAt) : "Sin fecha"} · {task.status}</span>
        </article>
      ))}
      {activities.slice(0, 10).map((activity) => (
        <article key={activity.id}>
          <strong>{activity.type}</strong>
          <span>{formatDate(activity.occurredAt || activity.createdAt)} · {activity.result || activity.nextAction || "Actividad registrada"}</span>
        </article>
      ))}
      {notes.slice(0, 4).map((note) => (
        <article key={note.id}>
          <strong>Nota</strong>
          <span>{formatDate(note.createdAt)} · {note.note}</span>
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

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
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
  if (status === "saving") return "Guardando";
  if (status === "saved") return "Guardado";
  if (status === "error") return "Error";
  return "Guardar";
}

function applyLocalProposal(lead: Lead): Lead {
  const pitch = buildPitch(lead);
  const plan = recommendServicePlan(lead);
  return {
    ...lead,
    problemDetected: lead.problemDetected || pitch.problem,
    opportunityDetected: lead.opportunityDetected || pitch.opportunity,
    salesHook: lead.salesHook || pitch.hook,
    recommendedService: lead.recommendedService || plan.focus,
    recommendedOffer: lead.recommendedOffer || plan.name,
    probableObjection: lead.probableObjection || pitch.objection,
    inPersonArgument: lead.inPersonArgument || pitch.thirtySeconds,
    nextAction: lead.nextAction || pitch.nextStep,
    updatedAt: new Date().toISOString()
  };
}

function buildPitch(lead: Lead) {
  const plan = recommendServicePlan(lead);
  const gap = gapText(lead);
  const demand = demandText(lead);
  const problem = lead.reviews >= 60
    ? `Tiene demanda local, pero no está claro que esa atención se convierta en consultas medibles. ${gap}`
    : `Conviene validar la demanda y ordenar la captación antes de vender una mensualidad grande. ${gap}`;
  const opportunity = `Firekworks puede unir contenido profesional, Meta Ads, Google Business Profile, WhatsApp Business y una landing local para captar clientes en ${lead.city}.`;
  const hook = `${demand}. ${gap}. La propuesta entra por captación local con contenido audiovisual propio.`;

  return {
    problem,
    opportunity,
    hook,
    reason: `${lead.score} puntos por demanda, brecha digital, encaje Firekworks y facilidad de visita.`,
    thirtySeconds: `He visto ${lead.name} y creo que hay una oportunidad sencilla: convertir más búsquedas y visitas locales en consultas por WhatsApp con contenido profesional, Google Business bien trabajado y una campaña Meta Ads pequeña pero medible. Os enseñaría una demo visual y, si encaja, empezamos con ${plan.name}.`,
    objection: "Si la objeción es precio, empezar con una visita y un plan de arranque. Si es tiempo, grabar todo en una sesión mensual. Si es duda, enseñar demo antes de pedir decisión.",
    nextStep: "Proponer visita presencial de 15 minutos y preparar una demo visual."
  };
}

function buildVisitScript(lead: Lead) {
  const pitch = buildPitch(lead);
  return {
    argument: `Entrar con enfoque de captación local: ${demandText(lead)}. ${gapText(lead)}. Ofrecer una demo visual con fotos/vídeo, Google Business, WhatsApp y Meta Ads medibles.`,
    opening: `Hola, soy Firekworks. Estoy revisando comercios de ${lead.city} con margen para captar más clientes localmente. En vuestro caso he visto: ${demandText(lead)} y ${gapText(lead).toLowerCase()}.`,
    questions: [
      "¿De dónde os llegan ahora la mayoría de clientes nuevos?",
      "¿Usáis WhatsApp Business con respuestas, catálogo o etiquetas?",
      "¿Tenéis Google Business Profile actualizado con fotos y reseñas recientes?",
      "¿Qué servicio o producto os interesa vender más este mes?",
      "Si una campaña trae consultas, ¿quién las responde y cuándo?"
    ].join("\n"),
    close: "Si te parece, preparo una demo visual de cómo quedaría una campaña local con vídeos/fotos reales del negocio y te digo qué inversión mínima tendría sentido en Meta Ads.",
    objections: pitch.objection
  };
}

function demandText(lead: Lead) {
  if (lead.reviews && lead.rating) return `${lead.rating}★ · ${lead.reviews} reseñas`;
  if (lead.reviews) return `${lead.reviews} reseñas`;
  return "Demanda pendiente";
}

function gapText(lead: Lead) {
  if (!lead.website) return "Sin web/landing clara";
  if (!lead.instagramUrl) return "Instagram pendiente";
  if (!lead.whatsappUrl && !lead.phone) return "Contacto poco claro";
  if (lead.contentUse === "Sin uso" || lead.contentUse === "Flojo") return `Contenido ${lead.contentUse.toLowerCase()}`;
  return "Optimización de captación";
}

function contactText(lead: Lead) {
  if (lead.whatsappUrl) return "WhatsApp visible";
  if (lead.phone) return "Teléfono visible";
  if (lead.website) return "Contacto desde web";
  return "Pendiente de validar";
}

function fitText(lead: Lead) {
  const plan = recommendServicePlan(lead);
  return `${plan.visits} · ${plan.content}`;
}

function shortStatus(status: LeadStatus) {
  const labels: Partial<Record<LeadStatus, string>> = {
    "Reunión agendada": "Reunión",
    "Diagnóstico hecho": "Visitado",
    "Propuesta enviada": "Propuesta",
    Ganado: "Cliente"
  };
  return labels[status] || status;
}

function formatDate(value: string) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}
