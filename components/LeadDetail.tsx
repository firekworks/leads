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
const tabs = ["Resumen", "Diagnóstico", "Propuesta", "Visita", "Historial"] as const;
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
  const hasProposalData = Boolean(draft.problemDetected || draft.opportunityDetected || draft.recommendedService || draft.recommendedOffer);

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
      setVisitStatus("Guion guardado");
    } catch {
      const nextLead = { ...draft, inPersonArgument: visitScript.argument, updatedAt: new Date().toISOString() };
      setDraft(nextLead);
      await onSave(nextLead);
      setVisitStatus("Guion local guardado");
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

      <div className="lead-detail__top">
        <div className="lead-title-block">
          <span className="eyebrow">Ficha comercial</span>
          <h2>{draft.name}</h2>
          <p>{draft.city} · {draft.sector}</p>
          <div className="stage-row">
            <span className={`status-pill status-pill--${statusTone(draft.status)}`}>{draft.status}</span>
            <button type="button" onClick={moveToNextStage}>Avanzar</button>
          </div>
        </div>
        <ScoreRing score={draft.score} label={scoreLabel(draft.score)} />
      </div>

      <div className="detail-actions detail-actions--primary">
        <button className="button button--primary" type="button" onClick={() => onEnrich(draft)} disabled={enriching}>
          {enriching ? "Enriqueciendo" : "Enriquecer"}
        </button>
        <button className="button button--ghost" type="button" onClick={() => update("nextFollowUpType", "ruta")}>
          Añadir ruta
        </button>
        <a className="button button--ghost" href={draft.googleMapsUrl || searchUrls.googleMaps} target="_blank" rel="noreferrer">
          Maps
        </a>
        <button className="button button--ghost" type="button" onClick={() => saveDraft()}>
          {saveStatusLabel(saveStatus)}
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
          <section className="detail-section detail-section--wide">
            <div className="detail-summary detail-summary--decision">
              <MiniStat label="Temperatura" value={scoreLabel(draft.score)} />
              <MiniStat label="Mensualidad" value={monthlyValue ? `≈ ${monthlyValue}€` : "Validar"} />
              <MiniStat label="Ads" value={`≈ ${adBudget}€`} />
              <MiniStat label="Siguiente" value={draft.nextAction || "Definir visita"} />
            </div>

            <div className="score-factor-grid">
              <ScoreFactor label="Demanda" score={draft.scoreDemand ?? draft.scoreDemandaVisible ?? 0} text={demandText(draft)} />
              <ScoreFactor label="Brecha digital" score={draft.scoreDigitalGap ?? draft.scorePresenciaDigital ?? 0} text={gapText(draft)} />
              <ScoreFactor label="Pago" score={draft.scorePaymentCapacity ?? draft.scoreDinero ?? 0} text={paymentText(draft)} />
              <ScoreFactor label="Encaje" score={draft.scoreFit ?? 0} text={fitText(draft)} />
            </div>

            <div className="score-reasons">
              {(draft.scoreExplanation?.length ? draft.scoreExplanation : [pitch.reason]).slice(0, 4).map((reason) => (
                <span key={reason}>{reason}</span>
              ))}
            </div>

            <TextArea label="Próximo paso" value={draft.nextAction} onChange={(value) => update("nextAction", value)} />

            <details className="edit-accordion">
              <summary>Editar datos</summary>
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
                <SelectField label="Estado" value={draft.status} options={statuses} onChange={(value) => setStatus(value as LeadStatus)} />
                <SelectField label="Seguidores IG" value={draft.followersBucket} options={followersBuckets} onChange={(value) => update("followersBucket", value as FollowersBucket)} />
                <SelectField label="Contenido" value={draft.contentUse} options={contentUses} onChange={(value) => update("contentUse", value as ContentUse)} />
                <DateField label="Seguimiento" value={draft.nextFollowUpAt?.slice(0, 16) || ""} onChange={(value) => update("nextFollowUpAt", value)} />
              </div>
            </details>
          </section>
        ) : null}

        {activeTab === "Diagnóstico" ? (
          <section className="detail-section detail-section--wide">
            <div className="diagnostic-stack">
              <DiagnosticCard title="Presencia local" value={demandText(draft)} source={draft.placeId ? "Google Places" : "Pendiente"} />
              <DiagnosticCard title="Presencia digital" value={gapText(draft)} source={draft.website || draft.instagramUrl ? "Web/redes" : "Manual"} />
              <DiagnosticCard title="Capacidad de pago" value={paymentText(draft)} source="Inferido" />
              <DiagnosticCard title="Dolor probable" value={draft.problemDetected || pitch.problem} source={hasProposalData ? "Verificado/interno" : "Inferido"} />
            </div>
            <details className="source-accordion">
              <summary>Ver fuentes</summary>
              <div className="source-list source-list--compact">
                <SourceLine label="Google Places" value={draft.placeId || "Pendiente"} />
                <SourceLine label="Web" value={draft.website || "Sin web"} />
                <SourceLine label="Instagram" value={draft.instagramUrl || "Pendiente manual"} />
                <SourceLine label="Facebook" value={draft.facebookUrl || "Pendiente manual"} />
                <SourceLine label="Meta Ads" value={draft.adsSignal || "No verificado"} />
                <SourceLine label="Última revisión" value={draft.lastEnrichedAt || draft.lastRefreshedAt || "Pendiente"} />
              </div>
            </details>
            <div className="quick-actions">
              <a href={searchUrls.instagram} target="_blank" rel="noreferrer">Buscar Instagram</a>
              <a href={searchUrls.facebook} target="_blank" rel="noreferrer">Buscar Facebook</a>
              <a href={searchUrls.owner} target="_blank" rel="noreferrer">Buscar dueño</a>
              <button type="button" onClick={() => onFindOwner(draft)} disabled={findingOwner || !draft.placeId}>
                {findingOwner ? "Buscando" : "Reseñas"}
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "Propuesta" ? (
          <section className="detail-section detail-section--wide">
            {!hasProposalData ? (
              <div className="proposal-state">
                <strong>Faltan datos para afinar</strong>
                <span>Puede generarse una propuesta base, pero será mejor tras enriquecer web, redes y Google.</span>
                <div className="detail-empty-actions">
                  <button className="button button--ghost" type="button" onClick={() => onEnrich(draft)}>Enriquecer Google/web</button>
                  <a className="button button--ghost" href={searchUrls.instagram} target="_blank" rel="noreferrer">Añadir Instagram</a>
                </div>
              </div>
            ) : null}

            <div className="demo-grid">
              <DemoBlock title="Dolor" text={draft.problemDetected || pitch.problem} />
              <DemoBlock title="Oportunidad" text={draft.opportunityDetected || pitch.opportunity} />
              <DemoBlock title="Pack" text={draft.recommendedOffer || plan.name} />
              <DemoBlock title="Precio" text={monthlyValue ? `Desde ${monthlyValue}€/mes + ads ${adBudget}€ aprox.` : "Validar en visita"} />
              <DemoBlock title="Demo" text={draft.salesHook || pitch.hook} />
              <DemoBlock title="Siguiente paso" text={draft.nextAction || pitch.nextStep} />
            </div>

            <MessageBlock title="Pitch 30s" text={draft.inPersonArgument || pitch.thirtySeconds} onCopy={copyText} />
            <MessageBlock title="Objeción probable" text={draft.probableObjection || pitch.objection} onCopy={copyText} />
            <button className="button button--primary" type="button" onClick={generateProposal}>
              Generar propuesta
            </button>
            {proposalStatus ? <span className="inline-status">{proposalStatus}</span> : null}
          </section>
        ) : null}

        {activeTab === "Visita" ? (
          <section className="detail-section detail-section--wide">
            <div className="copy-grid">
              <MessageBlock title="Apertura" text={visitScript.opening} onCopy={copyText} />
              <MessageBlock title="Preguntas" text={visitScript.questions} onCopy={copyText} />
              <MessageBlock title="Cierre suave" text={visitScript.close} onCopy={copyText} />
              <MessageBlock title="Objeciones" text={visitScript.objections} onCopy={copyText} />
            </div>
            <button className="button button--primary" type="button" onClick={generateVisitScript}>
              Preparar guion
            </button>
            {visitStatus ? <span className="inline-status">{visitStatus}</span> : null}
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
            <div className="detail-actions">
              <button className="button button--ghost" type="button" onClick={() => setStatus("No contactar")}>No contactar</button>
              <button className="button button--ghost" type="button" onClick={() => setStatus("Perdido")}>Perdido</button>
              <button className="button button--ghost" type="button" onClick={() => onConvert(draft)} disabled={draft.status === "Ganado"}>Convertir en cliente</button>
            </div>
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

function ScoreFactor({ label, score, text }: { label: string; score: number; text: string }) {
  return (
    <article className="score-factor">
      <span>{label}</span>
      <strong>{score || "-"}</strong>
      <p>{text}</p>
    </article>
  );
}

function DiagnosticCard({ title, value, source }: { title: string; value: string; source: string }) {
  return (
    <article className="diagnostic-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <em>{source}</em>
    </article>
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
      {activities.slice(0, 8).map((activity) => (
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
    opening: `Hola, soy Firekworks. Estoy revisando comercios de ${lead.city} con margen para captar más clientes localmente. En vuestro caso he visto: ${demandText(lead)} y ${gapText(lead).toLowerCase()}.`,
    questions: [
      "¿De dónde os llegan ahora la mayoría de clientes nuevos?",
      "¿Usáis WhatsApp Business con respuestas, catálogo o etiquetas?",
      "¿Tenéis Google Business Profile actualizado con fotos y reseñas recientes?",
      "¿Qué servicio o producto os interesa vender más este mes?",
      "Si una campaña trae consultas, ¿quién las responde y cuándo?"
    ].join("\n"),
    close: "Si te parece, preparo una demo visual de cómo quedaría una campaña local con vídeos/fotos reales del negocio y te digo qué inversión mínima tendría sentido en Meta Ads.",
    objections: pitch.objection,
    argument: pitch.thirtySeconds
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
  if (!lead.whatsappUrl) return "WhatsApp no verificado";
  if (lead.contentUse === "Sin uso" || lead.contentUse === "Flojo") return `Contenido ${lead.contentUse.toLowerCase()}`;
  return "Optimización de captación";
}

function paymentText(lead: Lead) {
  const monthly = estimateMonthlyValue(lead);
  if (monthly) return `Potencial ${monthly}€/mes`;
  if (lead.reviews >= 80) return "Negocio activo";
  return "Validar ticket";
}

function fitText(lead: Lead) {
  const plan = recommendServicePlan(lead);
  return `${plan.visits} · ${plan.content}`;
}
