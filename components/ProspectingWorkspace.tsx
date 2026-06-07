"use client";

import { useMemo, useState } from "react";
import type { Lead, LeadStatus } from "@/types/lead";
import { estimateMonthlyValue, scoreLabel, scoreTone } from "@/lib/scoring";

type ProspectingWorkspaceProps = {
  leads: Lead[];
  selectedLead: Lead | null;
  accessToken?: string;
  onSelect: (lead: Lead) => void;
  onSaveLead: (lead: Lead) => void | Promise<void>;
};

type ScanResponse = {
  leads?: Lead[];
  provider?: string;
  message?: string;
  estimatedCost?: string;
};

const steps = ["Zona", "Nicho", "Mapa", "Score", "Lead", "Auditoría", "Demo", "Mensaje", "Ruta", "Pipeline", "Cierre"];

const zones = [
  "Castalla",
  "Ibi",
  "Onil",
  "Alcoy",
  "Elda",
  "Petrer",
  "Villena",
  "Alicante",
  "San Vicente",
  "Valencia",
  "Madrid",
  "Barcelona"
];

const sectors = [
  { name: "Restaurantes", icon: "RS", text: "Reservas y ticket" },
  { name: "Bares y cafeterías", icon: "BC", text: "Tráfico diario" },
  { name: "Clínicas dentales", icon: "CD", text: "Alto margen" },
  { name: "Estética", icon: "ES", text: "Visual y recurrente" },
  { name: "Gimnasios", icon: "GY", text: "Captación local" },
  { name: "Inmobiliarias", icon: "IN", text: "Ticket alto" },
  { name: "Hoteles", icon: "HT", text: "Demanda turística" },
  { name: "Talleres", icon: "TA", text: "Confianza local" },
  { name: "Academias", icon: "AC", text: "Temporadas" },
  { name: "Tiendas de moda", icon: "MO", text: "Contenido visual" },
  { name: "Comercios premium", icon: "PR", text: "Marca y margen" },
  { name: "Peluquerías premium", icon: "PE", text: "Antes/después" }
];

const scanMessages = [
  "Detectando negocios reales",
  "Filtrando entidades públicas",
  "Leyendo reseñas y contacto",
  "Calculando temperatura comercial",
  "Preparando mapa"
];

export function ProspectingWorkspace({ leads, selectedLead, accessToken, onSelect, onSaveLead }: ProspectingWorkspaceProps) {
  const [zone, setZone] = useState("Castalla");
  const [sector, setSector] = useState("Restaurantes");
  const [scanning, setScanning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [scanNote, setScanNote] = useState("");
  const [results, setResults] = useState<Lead[]>([]);
  const hasMapsKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  const fallbackResults = useMemo(() => prospectingFallback(leads, zone, sector), [leads, sector, zone]);
  const visibleResults = (results.length ? results : hasRun ? fallbackResults : []).slice(0, 50);
  const hot = visibleResults.filter((lead) => lead.score >= 60);
  const noWeb = visibleResults.filter((lead) => !lead.website);
  const noInstagram = visibleResults.filter((lead) => !lead.instagramUrl);
  const withPhone = visibleResults.filter((lead) => lead.phone || lead.whatsappUrl);
  const highPriority = visibleResults.filter((lead) => lead.score >= 80);
  const activeStep = !hasRun ? 1 : selectedLead ? 5 : 4;

  async function runScan() {
    setScanning(true);
    setHasRun(true);
    setScanNote("");
    setResults([]);

    try {
      const response = await fetch("/api/prospecting/scan", {
        method: "POST",
        headers: { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ city: zone, sector, radius: 5000, allowPaidRequests: false })
      });
      const payload = (await response.json()) as ScanResponse;
      if (!response.ok) throw new Error(payload.message || "No se pudo escanear");
      setResults(payload.leads?.length ? payload.leads : fallbackResults);
      setScanNote(payload.message || "Resultados generados desde leads existentes.");
    } catch (error) {
      setResults(fallbackResults);
      setScanNote(error instanceof Error ? error.message : "Fallback con leads existentes.");
    } finally {
      window.setTimeout(() => setScanning(false), 700);
    }
  }

  async function quickStatus(nextStatus: LeadStatus) {
    if (!selectedLead) return;
    await onSaveLead({ ...selectedLead, status: nextStatus, updatedAt: new Date().toISOString() });
  }

  async function addRoute() {
    if (!selectedLead) return;
    await onSaveLead({
      ...selectedLead,
      nextFollowUpType: "ruta",
      nextAction: selectedLead.nextAction || "Visita presencial con diagnóstico visual",
      updatedAt: new Date().toISOString()
    });
  }

  return (
    <section className="prospecting">
      <Stepper activeStep={activeStep} />

      {!hasRun ? (
        <article className="prospecting-wizard glass-panel">
          <div className="prospecting-wizard__intro">
            <span className="eyebrow">FIREKWORKS LEADS</span>
            <h2>Prospección local</h2>
            <p>Encuentra comercios con potencial real y prepara la venta en minutos.</p>
          </div>

          <div className="prospecting-selectors">
            <label>
              Zona
              <select value={zone} onChange={(event) => setZone(event.target.value)}>
                {zones.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Nicho
              <select value={sector} onChange={(event) => setSector(event.target.value)}>
                {sectors.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
              </select>
            </label>
          </div>

          <div className="sector-grid">
            {sectors.map((item) => (
              <button
                key={item.name}
                type="button"
                className={sector === item.name ? "sector-card sector-card--active" : "sector-card"}
                onClick={() => setSector(item.name)}
              >
                <span>{item.icon}</span>
                <strong>{item.name}</strong>
                <small>{item.text}</small>
              </button>
            ))}
          </div>

          <button className="button button--primary prospecting-cta" type="button" onClick={runScan}>
            Generar mapa de leads
          </button>
        </article>
      ) : null}

      {scanning ? (
        <article className="prospecting-scan glass-panel" aria-live="polite">
          <div className="scan-orb" aria-hidden="true" />
          <span className="eyebrow">Escaneando Google Places…</span>
          <h2>Preparando radar comercial</h2>
          <div className="scan-lines">
            {scanMessages.map((message) => <span key={message}>{message}</span>)}
          </div>
          <p>No se muestra progreso porcentual porque depende del provider conectado.</p>
        </article>
      ) : null}

      {hasRun && !scanning ? (
        <div className="prospecting-results">
          <div className="prospecting-metrics" aria-label="Resumen de prospección">
            <Metric label="Total negocios" value={visibleResults.length} />
            <Metric label="Calientes" value={hot.length} tone="hot" />
            <Metric label="Sin web" value={noWeb.length} />
            <Metric label="Sin Instagram" value={noInstagram.length} />
            <Metric label="Con teléfono" value={withPhone.length} />
            <Metric label="Alta prioridad" value={highPriority.length} tone="accent" />
          </div>

          <div className="prospecting-main">
            <section className="prospecting-map glass-panel" aria-label="Mapa de leads">
              <header>
                <span>{hasMapsKey ? "Mapa conectado" : "Mapa real pendiente de conectar"}</span>
                <strong>{zone}</strong>
              </header>
              <div className="map-canvas">
                {visibleResults.map((lead, index) => (
                  <button
                    key={lead.id}
                    className={`map-pin map-pin--${scoreTone(lead.score)} ${selectedLead?.id === lead.id ? "map-pin--active" : ""}`}
                    type="button"
                    style={{ left: `${12 + ((index * 23) % 76)}%`, top: `${16 + ((index * 37) % 68)}%` }}
                    title={`${lead.name} · ${lead.city} · ${lead.score}`}
                    onClick={() => onSelect(lead)}
                  >
                    {lead.score}
                  </button>
                ))}
              </div>
              <p>{scanNote || "Resultados ordenados por temperatura comercial."}</p>
            </section>

            <section className="prospecting-list glass-panel">
              <header>
                <span>Temperatura comercial</span>
                <strong>{sector}</strong>
              </header>
              <div className="prospecting-leads">
                {visibleResults.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    className={selectedLead?.id === lead.id ? "prospecting-lead prospecting-lead--active" : "prospecting-lead"}
                    onClick={() => onSelect(lead)}
                  >
                    <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>
                      <strong>{lead.score}</strong>
                    </span>
                    <span>
                      <strong>{lead.name}</strong>
                      <small>{lead.city} · {lead.sector}</small>
                    </span>
                    <em>{scoreLabel(lead.score)}</em>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {selectedLead ? (
            <aside className="prospecting-audit glass-panel">
              <div>
                <span className="eyebrow">Lead seleccionado</span>
                <h3>{selectedLead.name}</h3>
                <p>{selectedLead.city} · {selectedLead.sector}</p>
              </div>
              <div className="audit-score">
                <strong>{selectedLead.score}</strong>
                <span>{scoreLabel(selectedLead.score)}</span>
              </div>
              <div className="audit-grid">
                <Audit label="Demanda" value={selectedLead.reviews ? `${selectedLead.reviews} reseñas` : "No verificado"} />
                <Audit label="Mensualidad" value={estimateMonthlyValue(selectedLead) ? `≈ ${estimateMonthlyValue(selectedLead)}€/mes` : "Pendiente"} />
                <Audit label="Brecha" value={!selectedLead.website ? "Sin web" : !selectedLead.instagramUrl ? "IG pendiente" : "Menor"} />
                <Audit label="Contacto" value={selectedLead.phone || selectedLead.whatsappUrl ? "Disponible" : "Pendiente"} />
                <Audit label="Ruta" value={selectedLead.address ? "Visitable" : "Sin dirección"} />
              </div>
              <div className="audit-reasons">
                {(selectedLead.scoreExplanation || []).slice(0, 3).map((item) => <span key={item}>{item}</span>)}
                {!selectedLead.scoreExplanation?.length ? <span>Pendiente de enriquecer antes de una propuesta precisa.</span> : null}
              </div>
              <div className="prospecting-actions">
                <button className="button button--primary" type="button" onClick={() => quickStatus("Prioritario")}>Priorizar</button>
                <button className="button button--ghost" type="button" onClick={addRoute}>Añadir a ruta</button>
                <button className="button button--ghost" type="button" onClick={() => quickStatus("Contactado")}>Mover a pipeline</button>
              </div>
            </aside>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Stepper({ activeStep }: { activeStep: number }) {
  return (
    <ol className="prospecting-stepper" aria-label="Flujo de prospección">
      {steps.map((step, index) => {
        const number = index + 1;
        return (
          <li key={step} className={number < activeStep ? "is-done" : number === activeStep ? "is-active" : ""}>
            <span>{number < activeStep ? "OK" : number}</span>
            <strong>{step}</strong>
          </li>
        );
      })}
    </ol>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: "hot" | "accent" }) {
  return (
    <div className={tone ? `metric-card metric-card--${tone}` : "metric-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Audit({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function prospectingFallback(leads: Lead[], zone: string, sector: string) {
  const normalizedSector = normalize(sector);
  const exact = leads.filter((lead) => lead.city === zone && normalize(lead.sector).includes(normalizedSector.split(" ")[0]));
  const city = leads.filter((lead) => lead.city === zone);
  const sectorOnly = leads.filter((lead) => normalize(lead.sector).includes(normalizedSector.split(" ")[0]));
  return Array.from(new Map([...exact, ...city, ...sectorOnly, ...leads].map((lead) => [lead.id, lead])).values())
    .filter((lead) => !lead.isInvalid && !lead.isDisqualified && lead.status !== "No contactar")
    .sort((a, b) => b.score - a.score);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
