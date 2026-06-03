"use client";

import { useEffect, useMemo, useState } from "react";
import { CHANNEL_LABELS, CHANNEL_SHORT, CITIES, SECTORS, STATUSES, TEMPERATURES } from "@/lib/constants";
import { buildDiagnosis, computeLeadScore, inferChannelsFromPlace, recommendedActionFor, temperatureFromScore } from "@/lib/scoring";
import { seedLeads } from "@/lib/seed-data";
import type { Channel, ChannelHealth, Filters, Lead, LeadStatus, PlaceImportResult, Temperature } from "@/types/lead";

const STORAGE_KEY = "firekworks-leads-v3";
const CHANNELS: Channel[] = ["google", "whatsapp", "instagram", "facebook", "website"];

const statusTone: Record<LeadStatus, string> = {
  Detectado: "tone-slate",
  Validado: "tone-blue",
  Prioritario: "tone-aqua",
  "Visita pendiente": "tone-yellow",
  Visitado: "tone-orange",
  Interesado: "tone-green",
  "Diagnóstico enviado": "tone-cyan",
  "Propuesta enviada": "tone-purple",
  Negociación: "tone-pink",
  Cliente: "tone-client",
  "No encaja": "tone-muted",
  Perdido: "tone-red"
};

const channelTone: Record<Channel, string> = {
  google: "channel-google",
  whatsapp: "channel-whatsapp",
  instagram: "channel-instagram",
  facebook: "channel-facebook",
  website: "channel-website"
};

const defaultFilters: Filters = {
  query: "",
  city: "Todas",
  sector: "Todos",
  status: "Todos",
  temperature: "Todas",
  minScore: 0,
  channelIssue: "Todos"
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function uid() {
  return `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeLead(lead: Lead): Lead {
  const score = computeLeadScore(lead);
  return {
    ...lead,
    score,
    temperature: temperatureFromScore(score),
    diagnosis: buildDiagnosis(lead),
    recommendedAction: recommendedActionFor(lead),
    updatedAt: new Date().toISOString()
  };
}

function makeLeadFromPlace(place: PlaceImportResult): Lead {
  const channels = inferChannelsFromPlace({
    phone: place.phone,
    website: place.website,
    rating: place.rating,
    reviews: place.reviews,
    photos: place.photos
  });
  const base: Lead = {
    id: place.googlePlaceId || uid(),
    name: place.name,
    sector: place.sector || "Comercio",
    city: place.city,
    address: place.address,
    phone: place.phone,
    website: place.website,
    googleMapsUrl: place.googleMapsUrl,
    googlePlaceId: place.googlePlaceId,
    rating: place.rating,
    reviews: place.reviews,
    photos: place.photos,
    channels,
    status: "Detectado",
    temperature: "Frío",
    score: 0,
    monthlyPotential: place.sector.toLowerCase().includes("restaurant") ? 690 : 490,
    pain: "Pendiente de revisar presencia digital y oportunidad real.",
    diagnosis: "",
    recommendedAction: "",
    nextAction: "Revisar Instagram, Facebook y WhatsApp antes de visitar",
    nextActionDate: today(),
    notes: "Importado desde Google Places. Revisar manualmente Instagram/Facebook.",
    lastContact: "",
    lastChecked: today(),
    source: "google",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return normalizeLead(base);
}

function matchesChannelIssue(lead: Lead, issue: string) {
  if (issue === "Todos") return true;
  const channel = issue as Channel;
  return lead.channels[channel] === "none" || lead.channels[channel] === "weak";
}

function applyFilters(leads: Lead[], filters: Filters) {
  const query = filters.query.trim().toLowerCase();
  return leads.filter((lead) => {
    const text = [lead.name, lead.sector, lead.city, lead.address, lead.phone, lead.notes].join(" ").toLowerCase();
    return (
      (!query || text.includes(query)) &&
      (filters.city === "Todas" || lead.city === filters.city) &&
      (filters.sector === "Todos" || lead.sector === filters.sector) &&
      (filters.status === "Todos" || lead.status === filters.status) &&
      (filters.temperature === "Todas" || lead.temperature === filters.temperature) &&
      lead.score >= filters.minScore &&
      matchesChannelIssue(lead, filters.channelIssue)
    );
  });
}

function nextStatus(current: LeadStatus, direction: 1 | -1) {
  const index = STATUSES.indexOf(current);
  const nextIndex = Math.max(0, Math.min(STATUSES.length - 1, index + direction));
  return STATUSES[nextIndex];
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function IconLogo({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden="true">
      <path d="M256 58L70 246H442L256 58Z" />
      <rect x="168" y="293" width="176" height="56" rx="2" />
      <rect x="168" y="392" width="176" height="88" rx="2" />
    </svg>
  );
}

function ChannelBadge({ channel, health }: { channel: Channel; health: ChannelHealth }) {
  return (
    <span className={`channel-badge ${channelTone[channel]} health-${health}`} title={`${CHANNEL_LABELS[channel]}: ${health}`}>
      <b>{CHANNEL_SHORT[channel]}</b>
      <small>{health === "strong" ? "bien" : health === "ok" ? "ok" : health === "weak" ? "flojo" : "no"}</small>
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const deg = Math.round((score / 100) * 360);
  return (
    <div className="score-ring" style={{ background: `conic-gradient(var(--aqua) ${deg}deg, rgba(255,255,255,.08) ${deg}deg)` }}>
      <span>{score}</span>
    </div>
  );
}

function LeadCard({ lead, selected, onOpen, onMove }: { lead: Lead; selected: boolean; onOpen: (lead: Lead) => void; onMove: (id: string, direction: 1 | -1) => void }) {
  return (
    <article className={`lead-card ${selected ? "is-selected" : ""}`} onClick={() => onOpen(lead)}>
      <div className="lead-top">
        <ScoreRing score={lead.score} />
        <div>
          <h3>{lead.name}</h3>
          <p>{lead.sector} · {lead.city}</p>
        </div>
      </div>
      <div className="channel-row">
        {CHANNELS.map((channel) => (
          <ChannelBadge key={channel} channel={channel} health={lead.channels[channel]} />
        ))}
      </div>
      <div className="lead-meta">
        <span className={`pill ${statusTone[lead.status]}`}>{lead.status}</span>
        <span className="pill ghost">{lead.temperature}</span>
      </div>
      <p className="diagnosis-line">{lead.diagnosis}</p>
      <div className="card-actions" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => onMove(lead.id, -1)}>←</button>
        <button type="button" onClick={() => onMove(lead.id, 1)}>Avanzar</button>
      </div>
    </article>
  );
}

function FiltersBar({ filters, setFilters, total, filtered }: { filters: Filters; setFilters: (filters: Filters) => void; total: number; filtered: number }) {
  return (
    <section className="filters-panel">
      <div className="search-box">
        <span>Buscar</span>
        <input value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} placeholder="nombre, ciudad, sector, nota..." />
      </div>
      <div className="filter-grid">
        <label>
          Ciudad
          <select value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })}>
            {CITIES.map((city) => <option key={city}>{city}</option>)}
          </select>
        </label>
        <label>
          Sector
          <select value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })}>
            {SECTORS.map((sector) => <option key={sector}>{sector}</option>)}
          </select>
        </label>
        <label>
          Estado
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option>Todos</option>
            {STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          Temperatura
          <select value={filters.temperature} onChange={(e) => setFilters({ ...filters, temperature: e.target.value })}>
            <option>Todas</option>
            {TEMPERATURES.map((temperature) => <option key={temperature}>{temperature}</option>)}
          </select>
        </label>
        <label>
          Fallo visible
          <select value={filters.channelIssue} onChange={(e) => setFilters({ ...filters, channelIssue: e.target.value })}>
            <option>Todos</option>
            <option value="google">Google flojo</option>
            <option value="whatsapp">WhatsApp flojo</option>
            <option value="instagram">Instagram flojo</option>
            <option value="facebook">Facebook flojo</option>
            <option value="website">Web floja</option>
          </select>
        </label>
        <label>
          Score mínimo
          <input type="range" min="0" max="100" value={filters.minScore} onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })} />
          <b>{filters.minScore}</b>
        </label>
      </div>
      <div className="filter-footer">
        <span>{filtered} de {total} leads</span>
        <button type="button" onClick={() => setFilters(defaultFilters)}>Limpiar filtros</button>
      </div>
    </section>
  );
}

function DetailPanel({ lead, onClose, onChange, onDelete }: { lead: Lead | null; onClose: () => void; onChange: (lead: Lead) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState<Lead | null>(lead);

  useEffect(() => setDraft(lead), [lead]);

  if (!draft) return null;

  const updateChannel = (channel: Channel, value: ChannelHealth) => {
    const updated = normalizeLead({ ...draft, channels: { ...draft.channels, [channel]: value } });
    setDraft(updated);
    onChange(updated);
  };

  const updateField = <K extends keyof Lead>(field: K, value: Lead[K]) => {
    const updated = normalizeLead({ ...draft, [field]: value });
    setDraft(updated);
    onChange(updated);
  };

  return (
    <aside className="detail-panel">
      <div className="detail-head">
        <div>
          <p className="eyebrow">Ficha del lead</p>
          <h2>{draft.name}</h2>
          <span>{draft.sector} · {draft.city}</span>
        </div>
        <button className="icon-button" type="button" onClick={onClose}>×</button>
      </div>

      <div className="detail-score">
        <ScoreRing score={draft.score} />
        <div>
          <b>{draft.temperature}</b>
          <p>{money(draft.monthlyPotential)} potencial mensual estimado</p>
        </div>
      </div>

      <div className="form-grid compact">
        <label>Estado
          <select value={draft.status} onChange={(e) => updateField("status", e.target.value as LeadStatus)}>
            {STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>Ciudad
          <input value={draft.city} onChange={(e) => updateField("city", e.target.value)} />
        </label>
        <label>Sector
          <input value={draft.sector} onChange={(e) => updateField("sector", e.target.value)} />
        </label>
        <label>Teléfono
          <input value={draft.phone} onChange={(e) => updateField("phone", e.target.value)} />
        </label>
        <label>Web
          <input value={draft.website} onChange={(e) => updateField("website", e.target.value)} />
        </label>
        <label>Próxima acción
          <input value={draft.nextAction} onChange={(e) => updateField("nextAction", e.target.value)} />
        </label>
      </div>

      <div className="channel-editor">
        {CHANNELS.map((channel) => (
          <label key={channel} className={channelTone[channel]}>
            {CHANNEL_LABELS[channel]}
            <select value={draft.channels[channel]} onChange={(e) => updateChannel(channel, e.target.value as ChannelHealth)}>
              <option value="none">No tiene</option>
              <option value="weak">Flojo</option>
              <option value="ok">Correcto</option>
              <option value="strong">Fuerte</option>
            </select>
          </label>
        ))}
      </div>

      <div className="insight-box">
        <span>Diagnóstico</span>
        <p>{draft.diagnosis}</p>
      </div>
      <div className="insight-box">
        <span>Acción recomendada</span>
        <p>{draft.recommendedAction}</p>
      </div>

      <label className="notes-box">
        Notas internas
        <textarea value={draft.notes} onChange={(e) => updateField("notes", e.target.value)} />
      </label>

      <div className="detail-actions">
        <button type="button" onClick={() => updateField("lastChecked", today())}>Marcar revisado hoy</button>
        <a href={draft.googleMapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(`${draft.name} ${draft.city}`)}`} target="_blank" rel="noreferrer">Abrir Maps</a>
        <button type="button" className="danger" onClick={() => onDelete(draft.id)}>Eliminar</button>
      </div>
    </aside>
  );
}

function Dashboard({ leads, filtered }: { leads: Lead[]; filtered: Lead[] }) {
  const hot = leads.filter((lead) => lead.temperature === "Caliente" || lead.temperature === "Muy caliente").length;
  const pending = leads.filter((lead) => ["Prioritario", "Visita pendiente", "Interesado"].includes(lead.status)).length;
  const potential = leads.reduce((sum, lead) => sum + lead.monthlyPotential, 0);
  const visiblePotential = filtered.reduce((sum, lead) => sum + lead.monthlyPotential, 0);
  return (
    <section className="stats-grid">
      <div className="stat-card"><span>Total leads</span><b>{leads.length}</b><small>{filtered.length} visibles</small></div>
      <div className="stat-card"><span>Calientes</span><b>{hot}</b><small>priorizar visitas</small></div>
      <div className="stat-card"><span>En movimiento</span><b>{pending}</b><small>seguimiento activo</small></div>
      <div className="stat-card"><span>Potencial</span><b>{money(visiblePotential || potential)}</b><small>mensual filtrado</small></div>
    </section>
  );
}

function RadarView({ leads, selectedId, onOpen, onMove }: { leads: Lead[]; selectedId?: string; onOpen: (lead: Lead) => void; onMove: (id: string, direction: 1 | -1) => void }) {
  if (!leads.length) return <EmptyState text="No hay leads con estos filtros." />;
  return (
    <section className="radar-grid">
      {leads.map((lead) => (
        <LeadCard key={lead.id} lead={lead} selected={lead.id === selectedId} onOpen={onOpen} onMove={onMove} />
      ))}
    </section>
  );
}

function PipelineView({ leads, selectedId, onOpen, onMove }: { leads: Lead[]; selectedId?: string; onOpen: (lead: Lead) => void; onMove: (id: string, direction: 1 | -1) => void }) {
  return (
    <section className="pipeline-board">
      {STATUSES.map((status) => {
        const stageLeads = leads.filter((lead) => lead.status === status);
        return (
          <div key={status} className={`pipeline-column ${statusTone[status]}`}>
            <header>
              <span>{status}</span>
              <b>{stageLeads.length}</b>
            </header>
            <div className="pipeline-list">
              {stageLeads.length ? stageLeads.map((lead) => (
                <button key={lead.id} type="button" className={`pipeline-card ${lead.id === selectedId ? "is-selected" : ""}`} onClick={() => onOpen(lead)}>
                  <strong>{lead.name}</strong>
                  <span>{lead.city} · {lead.score}</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => onMove(lead.id, -1)}>←</button>
                    <button type="button" onClick={() => onMove(lead.id, 1)}>→</button>
                  </div>
                </button>
              )) : <small className="column-empty">Sin leads</small>}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function ImportView({ onImport }: { onImport: (places: PlaceImportResult[]) => void }) {
  const [city, setCity] = useState("Castalla");
  const [sector, setSector] = useState("Restaurante");
  const [limit, setLimit] = useState(12);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function importPlaces() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, sector, limit })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se ha podido importar.");
      onImport(data.places || []);
      setMessage(`Importados/actualizados ${data.places?.length || 0} negocios.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="import-card">
      <div>
        <p className="eyebrow">Importar desde Google Places</p>
        <h2>Trae comercios reales por tandas.</h2>
        <p>Busca por ciudad y sector. Instagram y Facebook se revisan manualmente porque Google no los devuelve de forma fiable.</p>
      </div>
      <div className="form-grid import-grid">
        <label>Ciudad
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {CITIES.filter((item) => item !== "Todas").map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>Sector
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            {SECTORS.filter((item) => item !== "Todos").map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>Límite
          <input type="number" min="1" max="20" value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
        </label>
      </div>
      <button className="primary-button" type="button" onClick={importPlaces} disabled={loading}>{loading ? "Importando..." : "Importar negocios"}</button>
      {message && <p className="system-message">{message}</p>}
      <div className="import-note">
        Variable necesaria en Netlify: <b>GOOGLE_PLACES_API_KEY</b>
      </div>
    </section>
  );
}

function AddManualForm({ onAdd }: { onAdd: (lead: Lead) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("Castalla");
  const [sector, setSector] = useState("Restaurante");

  function addLead() {
    if (!name.trim()) return;
    const base: Lead = {
      id: uid(),
      name: name.trim(),
      sector,
      city,
      address: city,
      phone: "",
      website: "",
      googleMapsUrl: "",
      rating: 0,
      reviews: 0,
      photos: 0,
      channels: { google: "weak", whatsapp: "none", instagram: "none", facebook: "none", website: "none" },
      status: "Detectado",
      temperature: "Frío",
      score: 0,
      monthlyPotential: 490,
      pain: "Pendiente de diagnosticar.",
      diagnosis: "",
      recommendedAction: "",
      nextAction: "Revisar presencia digital",
      nextActionDate: today(),
      notes: "Lead creado manualmente.",
      lastContact: "",
      lastChecked: today(),
      source: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onAdd(normalizeLead(base));
    setName("");
    setOpen(false);
  }

  return (
    <div className="manual-add">
      <button type="button" onClick={() => setOpen(!open)}>{open ? "Cerrar" : "+ Añadir lead"}</button>
      {open && (
        <div className="manual-form">
          <input placeholder="Nombre del negocio" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {CITIES.filter((item) => item !== "Todas").map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            {SECTORS.filter((item) => item !== "Todos").map((item) => <option key={item}>{item}</option>)}
          </select>
          <button type="button" onClick={addLead}>Guardar</button>
        </div>
      )}
    </div>
  );
}

export default function FirekworksLeads() {
  const [leads, setLeads] = useState<Lead[]>(seedLeads);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [view, setView] = useState<"radar" | "pipeline" | "importar">("radar");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedId) || null, [leads, selectedId]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Lead[];
        if (Array.isArray(parsed)) setLeads(parsed);
      } catch {
        setLeads(seedLeads);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads]);

  const filteredLeads = useMemo(() => applyFilters(leads, filters).sort((a, b) => b.score - a.score), [leads, filters]);

  function updateLead(next: Lead) {
    setLeads((current) => current.map((lead) => (lead.id === next.id ? next : lead)));
  }

  function deleteLead(id: string) {
    setLeads((current) => current.filter((lead) => lead.id !== id));
    setSelectedId(null);
  }

  function moveStatus(id: string, direction: 1 | -1) {
    setLeads((current) => current.map((lead) => {
      if (lead.id !== id) return lead;
      const updated: Lead = { ...lead, status: nextStatus(lead.status, direction), updatedAt: new Date().toISOString() };
      return updated;
    }));
  }

  function importPlaces(places: PlaceImportResult[]) {
    const imported = places.map(makeLeadFromPlace);
    setLeads((current) => {
      const map = new Map<string, Lead>();
      current.forEach((lead) => map.set(lead.googlePlaceId || lead.id, lead));
      imported.forEach((lead) => {
        const key = lead.googlePlaceId || lead.id;
        const existing = map.get(key);
        map.set(key, existing ? normalizeLead({ ...existing, ...lead, status: existing.status, notes: existing.notes, lastContact: existing.lastContact }) : lead);
      });
      return Array.from(map.values());
    });
  }

  function resetDemo() {
    if (window.confirm("Esto sustituye los datos locales por la demo inicial. ¿Seguro?")) {
      setLeads(seedLeads);
      setSelectedId(null);
    }
  }

  return (
    <main className="app-shell">
      <div className="noise" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Firekworks Leads">
          <IconLogo className="brand-icon" />
          <span>Firekworks Leads</span>
        </a>
        <nav className="nav-tabs">
          <button className={view === "radar" ? "active" : ""} type="button" onClick={() => setView("radar")}>Radar</button>
          <button className={view === "pipeline" ? "active" : ""} type="button" onClick={() => setView("pipeline")}>Pipeline</button>
          <button className={view === "importar" ? "active" : ""} type="button" onClick={() => setView("importar")}>Importar</button>
        </nav>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">CRM de prospección local</p>
          <h1>Menos lista. Más radar.</h1>
          <p>Detecta comercios, prioriza oportunidades y decide dónde presentarte esta semana.</p>
        </div>
        <div className="hero-mark">
          <IconLogo className="hero-logo" />
        </div>
      </section>

      <Dashboard leads={leads} filtered={filteredLeads} />

      <FiltersBar filters={filters} setFilters={setFilters} total={leads.length} filtered={filteredLeads.length} />

      <div className="toolbar">
        <div>
          <b>{view === "radar" ? "Radar comercial" : view === "pipeline" ? "Pipeline" : "Importación"}</b>
          <span>Filtros compartidos entre vistas.</span>
        </div>
        <div className="toolbar-actions">
          <AddManualForm onAdd={(lead) => setLeads((current) => [lead, ...current])} />
          <button type="button" onClick={resetDemo}>Reset demo</button>
        </div>
      </div>

      {view === "radar" && <RadarView leads={filteredLeads} selectedId={selectedId || undefined} onOpen={(lead) => setSelectedId(lead.id)} onMove={moveStatus} />}
      {view === "pipeline" && <PipelineView leads={filteredLeads} selectedId={selectedId || undefined} onOpen={(lead) => setSelectedId(lead.id)} onMove={moveStatus} />}
      {view === "importar" && <ImportView onImport={importPlaces} />}

      <DetailPanel lead={selectedLead} onClose={() => setSelectedId(null)} onChange={updateLead} onDelete={deleteLead} />
    </main>
  );
}
