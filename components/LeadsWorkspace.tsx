"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { Background } from "@/components/Background";
import { Filters } from "@/components/Filters";
import { LeadCard } from "@/components/LeadCard";
import { LeadDetail } from "@/components/LeadDetail";
import { MapWorkspace } from "@/components/MapWorkspace";
import { PipelineBoard } from "@/components/PipelineBoard";
import { RoutePlanner } from "@/components/RoutePlanner";
import { useInternalAuth } from "@/components/AuthGate";
import { estimateMonthlyValue } from "@/lib/scoring";
import {
  createBlankLead,
  exportLeadsToCsv,
  loadLeads,
  persistLead,
  type LeadsSource
} from "@/lib/leads-repository";
import { leads as seedLeads, statuses } from "@/lib/mock-leads";
import type { ContentUse, FollowersBucket, Lead, LeadActivity, LeadNote, LeadStatus, LeadTask, RouteStop } from "@/types/lead";

type LeadsWorkspaceProps = {
  initialView: "opportunities" | "pipeline";
};

type OpportunityMode = "list" | "map" | "route";

type EnrichResponse = Partial<Pick<Lead, "description" | "instagramUrl" | "facebookUrl" | "whatsappUrl" | "logoUrl" | "websiteTitle">> & {
  error?: string;
};

const followersBuckets: FollowersBucket[] = ["Pendiente", "Sin cuenta", "< 1.000", "1.000 - 5.000", "+5.000"];
const contentUses: ContentUse[] = ["Pendiente", "Sin uso", "Flojo", "Activo", "Muy trabajado"];
const targetCities = ["Castalla", "Ibi", "Onil", "Biar", "Tibi", "Sax", "Elda", "Petrer", "Villena"];
const PAGE_SIZE = 25;
const quickViews = [
  { id: "top", label: "Top oportunidades", icon: "star" },
  { id: "hot", label: "Muy calientes", icon: "flame" },
  { id: "pendingVisit", label: "Listos visita", icon: "route" },
  { id: "noInstagram", label: "Sin IG", icon: "instagram" },
  { id: "noWeb", label: "Sin web", icon: "web" },
  { id: "discard", label: "Revisar descartes", icon: "ban" }
] as const;

const opportunityModes: Array<{ id: OpportunityMode; label: string; icon: string }> = [
  { id: "list", label: "Lista", icon: "store" },
  { id: "map", label: "Mapa", icon: "map" },
  { id: "route", label: "Ruta", icon: "route" }
];

export function LeadsWorkspace({ initialView }: LeadsWorkspaceProps) {
  const { accessToken, profile } = useInternalAuth();
  const [leadItems, setLeadItems] = useState<Lead[]>(seedLeads);
  const [mode, setMode] = useState<OpportunityMode>("list");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [sector, setSector] = useState("");
  const [status, setStatus] = useState("");
  const [followersBucket, setFollowersBucket] = useState("");
  const [contentUse, setContentUse] = useState("");
  const [withoutInstagram, setWithoutInstagram] = useState(false);
  const [withoutFacebook, setWithoutFacebook] = useState(false);
  const [withoutWeb, setWithoutWeb] = useState(false);
  const [withoutWhatsapp, setWithoutWhatsapp] = useState(false);
  const [withoutPhone, setWithoutPhone] = useState(false);
  const [contactEasyOnly, setContactEasyOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [visibleLeadCount, setVisibleLeadCount] = useState(PAGE_SIZE);
  const [dataSource, setDataSource] = useState<LeadsSource>("localStorage");
  const [syncMessage, setSyncMessage] = useState("Cargando");
  const [enrichingId, setEnrichingId] = useState("");
  const [findingOwnerId, setFindingOwnerId] = useState("");
  const [lastMove, setLastMove] = useState<{ lead: Lead; previousStatus: LeadStatus } | null>(null);
  const [leadCrm, setLeadCrm] = useState<{ activities: LeadActivity[]; tasks: LeadTask[]; notes: LeadNote[] }>({
    activities: [],
    tasks: [],
    notes: []
  });

  useEffect(() => {
    let active = true;
    loadLeads(accessToken).then((result) => {
      if (!active) return;
      setLeadItems(result.leads);
      setDataSource(result.source);
      setSyncMessage(result.source === "supabase" ? "Guardado" : result.error || "Local");
    });
    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (initialView !== "opportunities") return;
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    if (requestedMode === "map" || requestedMode === "route" || requestedMode === "list") {
      setMode(requestedMode);
    }
    const quick = params.get("quick");
    if (quick) handleQuickView(quick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialView]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedId("");
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const input = document.querySelector<HTMLInputElement>(".search-field input");
        input?.focus();
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const cities = useMemo(() => uniqueOptions([...targetCities, ...leadItems.map((lead) => lead.city)]), [leadItems]);
  const sectors = useMemo(() => uniqueOptions(leadItems.map((lead) => lead.sector)), [leadItems]);
  const selectedLead = leadItems.find((lead) => lead.id === selectedId) || null;

  useEffect(() => {
    if (!selectedLead?.id) return;
    let active = true;

    fetch(`/api/leads/${selectedLead.id}/crm`, {
      headers: { authorization: `Bearer ${accessToken}` }
    })
      .then(async (response) => {
        const payload = (await response.json()) as { activities?: LeadActivity[]; tasks?: LeadTask[]; notes?: LeadNote[] };
        if (!response.ok) throw new Error("No se pudo cargar actividad");
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setLeadCrm({
          activities: payload.activities || [],
          tasks: payload.tasks || [],
          notes: payload.notes || []
        });
      })
      .catch(() => active && setLeadCrm({ activities: [], tasks: [], notes: [] }));

    return () => {
      active = false;
    };
  }, [accessToken, selectedLead?.id]);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return leadItems
      .filter((lead) => {
        const discarded = isDiscarded(lead);
        const matchesQuery = normalizedQuery
          ? [lead.name, lead.city, lead.sector, lead.ownerName, lead.websiteTitle, lead.nextAction, lead.pain, lead.diagnosis]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery)
          : true;

        return (
          (status ? true : !discarded) &&
          matchesQuery &&
          (!city || lead.city === city) &&
          (!sector || lead.sector === sector) &&
          (!status || lead.status === status) &&
          (!followersBucket || lead.followersBucket === followersBucket) &&
          (!contentUse || lead.contentUse === contentUse) &&
          (!withoutInstagram || !lead.instagramUrl) &&
          (!withoutFacebook || !lead.facebookUrl) &&
          (!withoutWeb || !lead.website) &&
          (!withoutWhatsapp || !lead.whatsappUrl) &&
          (!withoutPhone || !lead.phone) &&
          (!contactEasyOnly || Boolean(lead.phone || lead.whatsappUrl)) &&
          (!minScore || lead.score >= minScore)
        );
      })
      .sort(sortOpportunityLeads);
  }, [
    city,
    contentUse,
    followersBucket,
    leadItems,
    minScore,
    query,
    sector,
    status,
    withoutFacebook,
    withoutInstagram,
    withoutPhone,
    contactEasyOnly,
    withoutWhatsapp,
    withoutWeb
  ]);

  useEffect(() => {
    setVisibleLeadCount(PAGE_SIZE);
  }, [city, contentUse, followersBucket, minScore, query, sector, status, withoutFacebook, withoutInstagram, withoutPhone, contactEasyOnly, withoutWhatsapp, withoutWeb]);

  const visibleLeads = filteredLeads.slice(0, visibleLeadCount);
  const routeStops = useMemo<RouteStop[]>(
    () =>
      filteredLeads
        .filter((lead) => !isDiscarded(lead) && (!lead.city || targetCities.includes(lead.city)))
        .map((lead, index) => ({
          ...lead,
          visitOrder: index + 1,
          routeReason: lead.score >= 80 ? "Alta prioridad" : "Visita corta"
        })),
    [filteredLeads]
  );

  const dashboard = useMemo(() => {
    const active = leadItems.filter((lead) => !isDiscarded(lead));
    const hot = active.filter((lead) => lead.score >= 80);
    const pendingVisit = active.filter((lead) => ["Detectado", "Validado", "Prioritario"].includes(lead.status)).length;
    const monthlyPotential = active
      .filter((lead) => lead.score >= 70)
      .reduce((sum, lead) => sum + estimateMonthlyValue(lead), 0);

    return {
      total: active.length,
      hot: hot.length,
      pendingVisit,
      monthlyPotential
    };
  }, [leadItems]);

  const pipelineLeads = useMemo(
    () =>
      leadItems
        .filter((lead) => (!city || lead.city === city) && (!sector || lead.sector === sector))
        .sort(sortOpportunityLeads),
    [city, leadItems, sector]
  );

  function clearFilters() {
    setQuery("");
    setCity("");
    setSector("");
    setStatus("");
    setFollowersBucket("");
    setContentUse("");
    setWithoutInstagram(false);
    setWithoutFacebook(false);
    setWithoutWeb(false);
    setWithoutWhatsapp(false);
    setWithoutPhone(false);
    setContactEasyOnly(false);
    setMinScore(0);
  }

  function handleQuickView(view: string) {
    clearFilters();
    if (view === "hot") setMinScore(80);
    if (view === "noInstagram") setWithoutInstagram(true);
    if (view === "noWeb") setWithoutWeb(true);
    if (view === "pendingVisit") setStatus("Prioritario");
    if (view === "discard") setStatus("No contactar");
  }

  function changeMode(nextMode: OpportunityMode) {
    setMode(nextMode);
    const url = nextMode === "list" ? "/opportunities" : `/opportunities?mode=${nextMode}`;
    window.history.replaceState(null, "", url);
  }

  function handleSelect(lead: Lead) {
    setSelectedId((current) => (current === lead.id ? "" : lead.id));
  }

  async function handleSaveLead(lead: Lead) {
    const result = await persistLead(lead, accessToken);
    setLeadItems(result.leads);
    setDataSource(result.source);
    setSyncMessage(result.source === "supabase" ? "Guardado" : "Guardado local");
    setSelectedId(result.lead.id);
  }

  async function handleStatusChange(lead: Lead, nextStatus: LeadStatus) {
    const discard = ["No contactar", "No encaja", "Perdido"].includes(nextStatus);
    setLastMove({ lead, previousStatus: lead.status });
    await handleSaveLead({
      ...lead,
      status: nextStatus,
      isInvalid: discard,
      isDisqualified: discard,
      validationStatus: discard ? "descartado" : "revisar",
      manualOverride: !discard && (lead.isInvalid || lead.isDisqualified) ? true : lead.manualOverride,
      updatedAt: new Date().toISOString()
    });
  }

  async function handleAdvanceLead(lead: Lead) {
    await handleStatusChange(lead, nextStatus(lead.status));
  }

  async function undoLastMove() {
    if (!lastMove) return;
    await handleSaveLead({
      ...lastMove.lead,
      status: lastMove.previousStatus,
      isInvalid: false,
      isDisqualified: false,
      validationStatus: "revisar",
      manualOverride: true,
      updatedAt: new Date().toISOString()
    });
    setLastMove(null);
    setSyncMessage("Deshecho");
  }

  async function handleNewLead() {
    const lead = createBlankLead();
    const result = await persistLead(lead, accessToken);
    setLeadItems(result.leads);
    setSelectedId(result.lead.id);
    setDataSource(result.source);
    setSyncMessage(result.source === "supabase" ? "Lead creado" : "Lead local");
  }

  async function handleEnrich(lead: Lead) {
    setEnrichingId(lead.id);
    try {
      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ lead })
      });
      const enriched = (await response.json()) as EnrichResponse;
      const nextLead = {
        ...lead,
        description: enriched.description || lead.description,
        instagramUrl: enriched.instagramUrl || lead.instagramUrl,
        facebookUrl: enriched.facebookUrl || lead.facebookUrl,
        whatsappUrl: enriched.whatsappUrl || lead.whatsappUrl,
        logoUrl: enriched.logoUrl || lead.logoUrl,
        websiteTitle: enriched.websiteTitle || lead.websiteTitle,
        lastRefreshedAt: new Date().toISOString()
      };
      await handleSaveLead(nextLead);
      setSyncMessage(enriched.error ? `Parcial: ${enriched.error}` : "Ficha completada");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "No se pudo completar");
    } finally {
      setEnrichingId("");
    }
  }

  async function handleFindOwner(lead: Lead) {
    if (!lead.placeId) return;
    setFindingOwnerId(lead.id);
    try {
      const response = await fetch("/api/places/owner", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ placeId: lead.placeId, allowPaidRequests: false })
      });
      const payload = (await response.json()) as { candidates?: string[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudieron revisar reseñas");
      const candidates = payload.candidates || [];
      await handleSaveLead({
        ...lead,
        ownerName: lead.ownerName || candidates[0] || "",
        reviewOwnerCandidates: candidates,
        lastRefreshedAt: new Date().toISOString()
      });
      setSyncMessage(candidates.length ? "Dueño guardado" : "Sin dueño claro");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "No se pudo buscar dueño");
    } finally {
      setFindingOwnerId("");
    }
  }

  async function handleAddActivity(lead: Lead, activity: { type: string; result: string; nextAction: string; reminderAt: string }) {
    const response = await fetch(`/api/leads/${lead.id}/crm`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ activity })
    });
    const payload = (await response.json()) as { activities?: LeadActivity[]; tasks?: LeadTask[]; notes?: LeadNote[]; error?: string };
    if (!response.ok) {
      setSyncMessage(payload.error || "No se pudo registrar");
      return;
    }
    setLeadCrm({ activities: payload.activities || [], tasks: payload.tasks || [], notes: payload.notes || [] });
    if (activity.nextAction || activity.reminderAt) {
      await handleSaveLead({
        ...lead,
        nextAction: activity.nextAction,
        nextFollowUpAt: activity.reminderAt,
        nextFollowUpType: activity.type,
        updatedAt: new Date().toISOString()
      });
    }
    setSyncMessage("Actividad registrada");
  }

  async function handleConvertLead(lead: Lead) {
    const response = await fetch(`/api/leads/${lead.id}/convert`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({})
    });
    const payload = (await response.json()) as { lead?: Lead; error?: string };
    if (!response.ok || !payload.lead) {
      setSyncMessage(payload.error || "No se pudo convertir");
      return;
    }
    const result = await persistLead(payload.lead, accessToken);
    setLeadItems(result.leads);
    setSelectedId(payload.lead.id);
    setSyncMessage("Cliente creado");
  }

  async function handleRouteVisited(stops: RouteStop[]) {
    for (const stop of stops) {
      await handleSaveLead({
        ...stop,
        status: stop.status === "Detectado" || stop.status === "Validado" ? "Contactado" : stop.status,
        lastContact: "Visitado",
        nextAction: "Seguimiento",
        nextFollowUpAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    setSyncMessage(`${stops.length} visitados`);
  }

  async function handleSaveRoute(stops: RouteStop[]) {
    if (!stops.length) return;
    try {
      const response = await fetch("/api/routes/create", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          city: stops[0]?.city || "",
          leadIds: stops.map((stop) => stop.id),
          name: `Ruta ${new Date().toLocaleDateString("es-ES")} · ${stops[0]?.city || "Foia"}`
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar ruta");
      setSyncMessage("Ruta guardada");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "No se pudo guardar ruta");
    }
  }

  async function handleCreateRouteCalendar(stops: RouteStop[]) {
    if (!stops.length) return;
    try {
      const routeResponse = await fetch("/api/routes/create", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          city: stops[0]?.city || "",
          leadIds: stops.map((stop) => stop.id),
          name: `Ruta ${new Date().toLocaleDateString("es-ES")} · calendario`
        })
      });
      const routePayload = (await routeResponse.json()) as { route?: { id?: string }; error?: string };
      if (!routeResponse.ok || !routePayload.route?.id) throw new Error(routePayload.error || "No se pudo crear ruta");

      const calendarResponse = await fetch(`/api/routes/${routePayload.route.id}/calendar`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ date: new Date().toISOString() })
      });
      const calendarPayload = (await calendarResponse.json()) as { message?: string; error?: string };
      if (!calendarResponse.ok) throw new Error(calendarPayload.error || "No se pudo crear evento");
      setSyncMessage(calendarPayload.message || "Evento preparado");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "No se pudo crear calendario");
    }
  }

  function renderDetail(lead: Lead, variant: "inline" | "panel" = "inline") {
    return (
      <LeadDetail
        lead={lead}
        statuses={statuses}
        variant={variant}
        accessToken={accessToken}
        onSave={handleSaveLead}
        onEnrich={handleEnrich}
        onFindOwner={handleFindOwner}
        onAddActivity={handleAddActivity}
        onConvert={handleConvertLead}
        onClose={() => setSelectedId("")}
        activities={selectedId === lead.id ? leadCrm.activities : []}
        tasks={selectedId === lead.id ? leadCrm.tasks : []}
        notes={selectedId === lead.id ? leadCrm.notes : []}
        enriching={enrichingId === lead.id}
        findingOwner={findingOwnerId === lead.id}
      />
    );
  }

  function renderFilters() {
    return (
      <Filters
        cities={cities}
        sectors={sectors}
        statuses={statuses}
        followersBuckets={followersBuckets}
        contentUses={contentUses}
        query={query}
        city={city}
        sector={sector}
        status={status}
        followersBucket={followersBucket}
        contentUse={contentUse}
        withoutInstagram={withoutInstagram}
        withoutFacebook={withoutFacebook}
        withoutWeb={withoutWeb}
        withoutWhatsapp={withoutWhatsapp}
        withoutPhone={withoutPhone}
        contactEasyOnly={contactEasyOnly}
        minScore={minScore}
        savedViews={quickViews}
        onQuery={setQuery}
        onCity={setCity}
        onSector={setSector}
        onStatus={setStatus}
        onFollowersBucket={setFollowersBucket}
        onContentUse={setContentUse}
        onWithoutInstagram={setWithoutInstagram}
        onWithoutFacebook={setWithoutFacebook}
        onWithoutWeb={setWithoutWeb}
        onWithoutWhatsapp={setWithoutWhatsapp}
        onWithoutPhone={setWithoutPhone}
        onContactEasyOnly={setContactEasyOnly}
        onMinScore={setMinScore}
        onSavedView={handleQuickView}
      />
    );
  }

  const isPipeline = initialView === "pipeline";

  return (
    <main className="app">
      <Background />
      <AppShell currentView={isPipeline ? "pipeline" : "opportunities"} userLabel={`${profile.role} · ${profile.email}`} sourceLabel={dataSource === "supabase" ? "Activo" : syncMessage}>
        <header className="workspace-header workspace-header--compact">
          <div>
            <p className="eyebrow">Firekworks Leads</p>
            <h1>{isPipeline ? "Pipeline comercial" : "Oportunidades locales"}</h1>
            <p className="workspace-subtitle">
              {isPipeline
                ? "Avanza comercios por fase sin perder la próxima acción."
                : "Prioriza comercios por temperatura, brecha digital y facilidad de contacto."}
            </p>
          </div>
          <div className="header-actions">
            <span className={`source-pill source-pill--${dataSource}`}>{syncMessage}</span>
            {lastMove ? (
              <button className="button button--ghost" type="button" onClick={undoLastMove}>Deshacer</button>
            ) : null}
            <button className="button button--ghost" type="button" onClick={() => exportLeadsToCsv(filteredLeads)}>CSV</button>
            <button className="button" type="button" onClick={handleNewLead}>
              <span className="css-icon css-icon--plus" />
              Nuevo lead
            </button>
          </div>
        </header>

        {!isPipeline ? (
          <>
            <section className="kpi-grid" aria-label="Resumen comercial">
              <KpiCard label="Total leads" value={dashboard.total} />
              <KpiCard label="Muy calientes" value={dashboard.hot} tone="hot" />
              <KpiCard label="Pendientes visita" value={dashboard.pendingVisit} />
              <KpiCard label="Potencial mensual" value={`${dashboard.monthlyPotential.toLocaleString("es-ES")}€`} tone="money" />
            </section>

            {renderFilters()}

            <div className="mode-switch" role="tablist" aria-label="Vista de oportunidades">
              {opportunityModes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={mode === item.id ? "mode-switch__item mode-switch__item--active" : "mode-switch__item"}
                  onClick={() => changeMode(item.id)}
                >
                  <span className={`css-icon css-icon--${item.icon}`} aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.section key={mode} className="queue-layout queue-layout--with-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <div className="queue-primary">
                  {mode === "list" ? (
                    <div className="lead-list lead-list--queue">
                      {filteredLeads.length ? (
                        <>
                          <div className="list-status">
                            <span>Top {visibleLeads.length} de {filteredLeads.length} oportunidades</span>
                            {visibleLeads.length < filteredLeads.length ? (
                              <button type="button" onClick={() => setVisibleLeadCount((current) => current + PAGE_SIZE)}>Ver 25 más</button>
                            ) : null}
                          </div>
                          {visibleLeads.map((lead) => (
                            <LeadCard key={lead.id} lead={lead} active={lead.id === selectedId} onSelect={handleSelect} onAdvance={handleAdvanceLead} />
                          ))}
                        </>
                      ) : (
                        <div className="empty-panel">
                          <strong>Sin resultados</strong>
                          <span>Ajusta filtros o revisa comercios pendientes.</span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {mode === "map" ? (
                    <MapWorkspace leads={filteredLeads} selectedId={selectedId} onSelect={handleSelect} />
                  ) : null}

                  {mode === "route" ? (
                    <RoutePlanner
                      stops={routeStops}
                      onSelect={handleSelect}
                      onMarkVisited={handleRouteVisited}
                      onSaveRoute={handleSaveRoute}
                      onCreateCalendar={handleCreateRouteCalendar}
                    />
                  ) : null}
                </div>

                <aside className="queue-detail-panel">
                  {selectedLead ? renderDetail(selectedLead, "panel") : (
                    <div className="empty-panel empty-panel--sticky">
                      <strong>{mode === "route" ? "Construye una ruta" : "Selecciona un comercio"}</strong>
                      <span>Verás motivo comercial, brecha digital, siguiente acción e historial.</span>
                    </div>
                  )}
                </aside>
              </motion.section>
            </AnimatePresence>
          </>
        ) : (
          <>
            <section className="pipeline-filters" aria-label="Filtros del pipeline">
              <select value={city} onChange={(event) => setCity(event.target.value)} aria-label="Ciudad pipeline">
                <option value="">Todas las ciudades</option>
                {cities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={sector} onChange={(event) => setSector(event.target.value)} aria-label="Sector pipeline">
                <option value="">Todos los sectores</option>
                {sectors.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <button className="button button--ghost" type="button" onClick={() => { setCity(""); setSector(""); }}>
                Limpiar
              </button>
            </section>

            <motion.section key="pipeline" className="queue-layout queue-layout--with-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="queue-primary">
                <PipelineBoard
                  leads={pipelineLeads}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  onStatusChange={handleStatusChange}
                />
              </div>
              <aside className="queue-detail-panel">
                {selectedLead ? renderDetail(selectedLead, "panel") : (
                  <div className="empty-panel empty-panel--sticky">
                    <strong>Selecciona una tarjeta</strong>
                    <span>Mueve etapas y abre la ficha sin perder el tablero.</span>
                  </div>
                )}
              </aside>
            </motion.section>
          </>
        )}
      </AppShell>
    </main>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: number | string; tone?: "hot" | "money" }) {
  return (
    <article className={tone ? `kpi-card kpi-card--${tone}` : "kpi-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}

function isDiscarded(lead: Lead) {
  return lead.isInvalid || Boolean(lead.isDisqualified) || ["No contactar", "No encaja", "Perdido"].includes(lead.status);
}

function sortOpportunityLeads(a: Lead, b: Lead) {
  return b.score - a.score || b.reviews - a.reviews || a.name.localeCompare(b.name, "es");
}

function nextStatus(status: LeadStatus): LeadStatus {
  const next: Partial<Record<LeadStatus, LeadStatus>> = {
    Detectado: "Validado",
    Validado: "Prioritario",
    Prioritario: "Contactado",
    Contactado: "Respondió",
    Respondió: "Reunión agendada",
    "Reunión agendada": "Diagnóstico hecho",
    "Diagnóstico hecho": "Propuesta enviada",
    "Propuesta enviada": "Negociación",
    Negociación: "Ganado",
    Perdido: "No contactar",
    "No encaja": "No contactar"
  };
  return next[status] || status;
}
