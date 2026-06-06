"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { Background } from "@/components/Background";
import { Filters } from "@/components/Filters";
import { LeadCard } from "@/components/LeadCard";
import { LeadDetail } from "@/components/LeadDetail";
import { PipelineBoard } from "@/components/PipelineBoard";
import { PulseDashboard } from "@/components/PulseDashboard";
import { RoutePlanner } from "@/components/RoutePlanner";
import { useInternalAuth } from "@/components/AuthGate";
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
  initialView: "pulse" | "leads" | "pipeline" | "route";
};

type EnrichResponse = Partial<Pick<Lead, "description" | "instagramUrl" | "facebookUrl" | "whatsappUrl" | "logoUrl" | "websiteTitle">> & {
  error?: string;
};

const followersBuckets: FollowersBucket[] = ["Pendiente", "Sin cuenta", "< 1.000", "1.000 - 5.000", "+5.000"];
const contentUses: ContentUse[] = ["Pendiente", "Sin uso", "Flojo", "Activo", "Muy trabajado"];
const targetCities = ["Castalla", "Ibi", "Onil", "Alcoy", "Biar", "Tibi", "Elda", "Petrer", "Villena", "Alicante", "Valencia"];
const PAGE_SIZE = 70;
const quickViews = [
  { id: "all", label: "Todo", icon: "store" },
  { id: "hot", label: "Calientes", icon: "flame" },
  { id: "noInstagram", label: "Sin IG", icon: "instagram" },
  { id: "noWeb", label: "Sin web", icon: "web" },
  { id: "contactEasy", label: "Contacto fácil", icon: "phone" },
  { id: "discard", label: "Revisar descarte", icon: "ban" }
] as const;

export function LeadsWorkspace({ initialView }: LeadsWorkspaceProps) {
  const { accessToken, profile } = useInternalAuth();
  const [leadItems, setLeadItems] = useState<Lead[]>(seedLeads);
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
    if (initialView !== "leads") return;
    const quick = new URLSearchParams(window.location.search).get("quick");
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
    return leadItems.filter((lead) => {
      const discarded = isDiscarded(lead);
      const matchesQuery = normalizedQuery
        ? [lead.name, lead.city, lead.sector, lead.ownerName, lead.websiteTitle, lead.nextAction]
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
    });
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
      leadItems
        .filter((lead) => !isDiscarded(lead) && targetCities.includes(lead.city))
        .slice()
        .sort((a, b) => b.score - a.score)
        .map((lead, index) => ({
          ...lead,
          visitOrder: index + 1,
          routeReason: lead.score >= 80 ? "Alta prioridad" : "Visita corta"
        })),
    [leadItems]
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
    if (view === "hot") setMinScore(70);
    if (view === "noInstagram") setWithoutInstagram(true);
    if (view === "noWeb") setWithoutWeb(true);
    if (view === "contactEasy") setContactEasyOnly(true);
    if (view === "discard") setStatus("No contactar");
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
      setSyncMessage(enriched.error ? `Parcial: ${enriched.error}` : "Enriquecido");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "No se pudo enriquecer");
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
        body: JSON.stringify({ placeId: lead.placeId, allowPaidRequests: true })
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

  function renderDetail(lead: Lead) {
    return (
      <LeadDetail
        lead={lead}
        statuses={statuses}
        variant="inline"
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

  return (
    <main className="app">
      <Background />
      <AppShell currentView={initialView} userLabel={`${profile.role} · ${profile.email}`} sourceLabel={dataSource === "supabase" ? "Activo" : syncMessage}>
        <header className="workspace-header workspace-header--compact">
          <div>
            <p className="eyebrow">Firekworks Leads</p>
            <h1>{viewTitle(initialView)}</h1>
            <p className="workspace-subtitle">{viewSubtitle(initialView)}</p>
          </div>
          <div className="header-actions">
            <span className={`source-pill source-pill--${dataSource}`}>{syncMessage}</span>
            {lastMove ? (
              <button className="button button--ghost" type="button" onClick={undoLastMove}>Deshacer</button>
            ) : null}
            {initialView === "leads" ? (
              <>
                <button className="button button--ghost" type="button" onClick={() => exportLeadsToCsv(filteredLeads)}>CSV</button>
                <button className="button" type="button" onClick={handleNewLead}>
                  <span className="css-icon css-icon--plus" />
                  Nuevo
                </button>
              </>
            ) : null}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {initialView === "pulse" ? (
            <motion.section key="pulse" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <PulseDashboard leads={leadItems} onSelect={handleSelect} />
              {selectedLead ? <div className="pulse-inline-detail">{renderDetail(selectedLead)}</div> : null}
            </motion.section>
          ) : null}

          {initialView === "leads" ? (
            <motion.section key="leads" className="queue-layout" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
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

              <div className="lead-list lead-list--queue">
                {filteredLeads.length ? (
                  <>
                    <div className="list-status">
                      <span>{visibleLeads.length} de {filteredLeads.length}</span>
                      {visibleLeads.length < filteredLeads.length ? (
                        <button type="button" onClick={() => setVisibleLeadCount((current) => current + PAGE_SIZE)}>Ver más</button>
                      ) : null}
                    </div>
                    {visibleLeads.map((lead) => (
                      <div className="lead-row-shell" key={lead.id}>
                        <LeadCard lead={lead} active={lead.id === selectedId} onSelect={handleSelect} />
                        {lead.id === selectedId ? renderDetail(lead) : null}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="empty-panel">
                    <strong>Sin resultados</strong>
                    <span>Ajusta filtros o ejecuta Scan.</span>
                  </div>
                )}
              </div>
            </motion.section>
          ) : null}

          {initialView === "pipeline" ? (
            <motion.section key="pipeline" className="board-view" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <PipelineBoard
                leads={leadItems}
                selectedId={selectedId}
                onSelect={handleSelect}
                onStatusChange={handleStatusChange}
              />
              {selectedLead ? <div className="pipeline-inline-detail">{renderDetail(selectedLead)}</div> : null}
            </motion.section>
          ) : null}

          {initialView === "route" ? (
            <motion.section key="route" className="route-view" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <RoutePlanner stops={routeStops} onSelect={handleSelect} onMarkVisited={handleRouteVisited} />
              {selectedLead ? <div className="route-inline-detail">{renderDetail(selectedLead)}</div> : null}
            </motion.section>
          ) : null}
        </AnimatePresence>
      </AppShell>
    </main>
  );
}

function viewTitle(view: LeadsWorkspaceProps["initialView"]) {
  if (view === "pulse") return "Pulse";
  if (view === "pipeline") return "Pipeline";
  if (view === "route") return "Ruta";
  return "Leads";
}

function viewSubtitle(view: LeadsWorkspaceProps["initialView"]) {
  if (view === "pulse") return "Prioridad comercial de hoy.";
  if (view === "pipeline") return "Avanza leads por fase.";
  if (view === "route") return "Planifica visitas por ciudad.";
  return "Busca, valida y prioriza comercios locales.";
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}

function isDiscarded(lead: Lead) {
  return lead.isInvalid || Boolean(lead.isDisqualified) || ["No contactar", "No encaja", "Perdido"].includes(lead.status);
}
