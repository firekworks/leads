"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { Background } from "@/components/Background";
import { Filters } from "@/components/Filters";
import { LeadCard } from "@/components/LeadCard";
import { LeadDetail } from "@/components/LeadDetail";
import { PipelineBoard } from "@/components/PipelineBoard";
import { RoutePlanner } from "@/components/RoutePlanner";
import {
  createBlankLead,
  exportLeadsToCsv,
  loadLeads,
  persistLead,
  type LeadsSource
} from "@/lib/leads-repository";
import { estimateMonthlyValue } from "@/lib/scoring";
import { leads as seedLeads, statuses } from "@/lib/mock-leads";
import type { ContentUse, FollowersBucket, Lead, LeadStatus, RouteStop } from "@/types/lead";

type LeadsWorkspaceProps = {
  initialView: "radar" | "pipeline" | "ruta";
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

type EnrichResponse = Partial<
  Pick<
    Lead,
    "description" | "instagramUrl" | "facebookUrl" | "whatsappUrl" | "logoUrl" | "websiteTitle"
  >
> & {
  error?: string;
};

export function LeadsWorkspace({ initialView }: LeadsWorkspaceProps) {
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
  const [minScore, setMinScore] = useState(0);
  const [selectedId, setSelectedId] = useState(seedLeads[0]?.id || "");
  const [dataSource, setDataSource] = useState<LeadsSource>("localStorage");
  const [syncMessage, setSyncMessage] = useState("Cargando datos");
  const [enrichingId, setEnrichingId] = useState("");
  const [findingOwnerId, setFindingOwnerId] = useState("");
  const [importingPlaces, setImportingPlaces] = useState(false);
  const [placesMessage, setPlacesMessage] = useState("Foia preparada: Castalla, Ibi, Onil, Biar y Tibi");

  useEffect(() => {
    let active = true;

    loadLeads().then((result) => {
      if (!active) return;
      setLeadItems(result.leads);
      setDataSource(result.source);
      setSyncMessage(
        result.source === "supabase"
          ? "Supabase activo"
          : result.error
            ? `Fallback local: ${result.error}`
            : "Fallback local activo"
      );
      setSelectedId((current) => current || result.leads[0]?.id || "");
    });

    return () => {
      active = false;
    };
  }, []);

  const cities = useMemo(() => uniqueOptions(leadItems.map((lead) => lead.city)), [leadItems]);
  const sectors = useMemo(() => uniqueOptions(leadItems.map((lead) => lead.sector)), [leadItems]);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return leadItems.filter((lead) => {
      const matchesQuery = normalizedQuery
        ? [
            lead.name,
            lead.city,
            lead.sector,
            lead.pain,
            lead.diagnosis,
            lead.nextAction,
            lead.description,
            lead.ownerName,
            lead.websiteTitle
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        : true;

      return (
        matchesQuery &&
        (!city || lead.city === city) &&
        (!sector || lead.sector === sector) &&
        (!status || lead.status === status) &&
        (!followersBucket || lead.followersBucket === followersBucket) &&
        (!contentUse || lead.contentUse === contentUse) &&
        (!withoutInstagram || !lead.instagramUrl) &&
        (!withoutFacebook || !lead.facebookUrl) &&
        (!withoutWeb || !lead.website) &&
        (!lead.isInvalid || status === "Descartado") &&
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
    withoutWeb
  ]);

  const selectedLead =
    filteredLeads.find((lead) => lead.id === selectedId) || filteredLeads[0] || leadItems[0];

  const routeStops = useMemo<RouteStop[]>(
    () =>
      leadItems
        .filter(
          (lead) =>
            !lead.isInvalid &&
            !["Cliente", "Descartado", "Desinteresado"].includes(lead.status) &&
            ["Castalla", "Ibi", "Onil", "Biar", "Tibi"].includes(lead.city)
        )
        .slice()
        .sort((a, b) => b.score - a.score)
        .map((lead, index) => ({
          ...lead,
          visitOrder: index + 1,
          routeReason:
            lead.score >= 80
              ? "Alta demanda + hueco digital claro"
              : "Buena oportunidad para visita corta"
        })),
    [leadItems]
  );

  function handleSelect(lead: Lead) {
    setSelectedId(lead.id);
  }

  async function handleSaveLead(lead: Lead) {
    const result = await persistLead(lead);
    setLeadItems(result.leads);
    setDataSource(result.source);
    setSyncMessage(result.source === "supabase" ? "Guardado en Supabase" : "Guardado en localStorage");
    setSelectedId(result.lead.id);
  }

  async function handleStatusChange(lead: Lead, nextStatus: LeadStatus) {
    await handleSaveLead({ ...lead, status: nextStatus, updatedAt: new Date().toISOString() });
  }

  async function handleNewLead() {
    const lead = createBlankLead();
    const result = await persistLead(lead);
    setLeadItems(result.leads);
    setSelectedId(lead.id);
    setDataSource(result.source);
    setSyncMessage(result.source === "supabase" ? "Lead creado en Supabase" : "Lead creado localmente");
  }

  async function handleEnrich(lead: Lead) {
    setEnrichingId(lead.id);

    try {
      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
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
      setSyncMessage(enriched.error ? `Enriquecimiento parcial: ${enriched.error}` : "Web/redes enriquecidas");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "No se pudo enriquecer el lead");
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ placeId: lead.placeId, allowPaidRequests: true })
      });
      const payload = (await response.json()) as { candidates?: string[]; error?: string };

      if (!response.ok) throw new Error(payload.error || "No se pudieron revisar reseñas");

      const candidates = payload.candidates || [];
      const nextLead = {
        ...lead,
        ownerName: lead.ownerName || candidates[0] || "",
        reviewOwnerCandidates: candidates,
        lastRefreshedAt: new Date().toISOString()
      };
      await handleSaveLead(nextLead);
      setSyncMessage(candidates.length ? "Candidatos de dueño guardados" : "Sin dueño claro en reseñas");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "No se pudieron revisar reseñas");
    } finally {
      setFindingOwnerId("");
    }
  }

  async function handlePlacesImport(mode: "preview" | "import") {
    setImportingPlaces(true);

    try {
      const response = await fetch("/api/places/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          city: city || "Castalla",
          sector: sector || "Restaurantes",
          mode,
          allowPaidRequests: mode === "import",
          maxRequests: 1,
          pageSize: 10
        })
      });
      const payload = (await response.json()) as {
        mode?: string;
        imported?: number;
        leads?: Lead[];
        message?: string;
        error?: string;
      };

      if (!response.ok) throw new Error(payload.error || "No se pudo preparar la importación");

      if (payload.leads?.length) {
        setLeadItems(payload.leads);
        setSelectedId((current) => current || payload.leads?.[0]?.id || "");
        setDataSource("supabase");
      }

      setPlacesMessage(
        payload.imported
          ? `${payload.imported} comercios importados con 1 petición Places`
          : payload.message || "Plan de importación listo sin consumir Places"
      );
    } catch (error) {
      setPlacesMessage(error instanceof Error ? error.message : "No se pudo preparar la importación");
    } finally {
      setImportingPlaces(false);
    }
  }

  const hotLeads = leadItems.filter((lead) => lead.score >= 80).length;
  const openPipeline = leadItems.filter(
    (lead) => !lead.isInvalid && !["Cliente", "Descartado", "Desinteresado"].includes(lead.status)
  ).length;
  const monthlyEstimate = leadItems.reduce((total, lead) => total + estimateMonthlyValue(lead), 0);
  const missingInstagram = leadItems.filter((lead) => !lead.instagramUrl && !lead.isInvalid).length;

  return (
    <main className="app">
      <Background />
      <AppShell currentView={initialView}>
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Radar comercial Firekworks</p>
            <h1>{initialView === "radar" ? "Radar de comercios" : viewTitle(initialView)}</h1>
            <p className="workspace-subtitle">Prioridad, temperatura, hueco visual y siguiente acción en una sola vista.</p>
          </div>
          <div className="header-actions">
            <span className={`source-pill source-pill--${dataSource}`}>{syncMessage}</span>
            <button className="button button--ghost" type="button" onClick={() => exportLeadsToCsv(filteredLeads)}>
              Exportar CSV
            </button>
            <button className="button" type="button" onClick={handleNewLead}>
              <span className="css-icon css-icon--plus" />
              Nuevo lead
            </button>
          </div>
        </header>

        <section className="stat-strip" aria-label="Resumen">
          <article>
            <span>Leads activos</span>
            <strong>{openPipeline}</strong>
          </article>
          <article>
            <span>Muy calientes</span>
            <strong>{hotLeads}</strong>
          </article>
          <article>
            <span>Sin Instagram</span>
            <strong>{missingInstagram}</strong>
          </article>
          <article>
            <span>Estimación mensual</span>
            <strong>≈ {monthlyEstimate}€</strong>
          </article>
        </section>

        <AnimatePresence mode="wait">
          {initialView === "radar" ? (
            <motion.section
              key="radar"
              className="radar-layout"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <div className="radar-main">
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
                  minScore={minScore}
                  onQuery={setQuery}
                  onCity={setCity}
                  onSector={setSector}
                  onStatus={setStatus}
                  onFollowersBucket={setFollowersBucket}
                  onContentUse={setContentUse}
                  onWithoutInstagram={setWithoutInstagram}
                  onWithoutFacebook={setWithoutFacebook}
                  onWithoutWeb={setWithoutWeb}
                  onMinScore={setMinScore}
                />

                <div className="import-strip">
                  <div>
                    <strong>Importación Foia</strong>
                    <span>{placesMessage}</span>
                  </div>
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={() => handlePlacesImport("preview")}
                    disabled={importingPlaces}
                  >
                    Plan sin coste
                  </button>
                  <button
                    className="button button--quiet"
                    type="button"
                    onClick={() => handlePlacesImport("import")}
                    disabled={importingPlaces}
                  >
                    Importar 1 búsqueda
                  </button>
                </div>

                <div className="lead-list">
                  {filteredLeads.length ? (
                    filteredLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        active={lead.id === selectedLead?.id}
                        onSelect={handleSelect}
                      />
                    ))
                  ) : (
                    <div className="empty-panel">
                      <strong>No hay leads con esos filtros</strong>
                      <span>Prueba otra ciudad, sector, señal o score.</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedLead ? (
                <LeadDetail
                  lead={selectedLead}
                  statuses={statuses}
                  onSave={handleSaveLead}
                  onEnrich={handleEnrich}
                  onFindOwner={handleFindOwner}
                  enriching={enrichingId === selectedLead.id}
                  findingOwner={findingOwnerId === selectedLead.id}
                />
              ) : null}
            </motion.section>
          ) : null}

          {initialView === "pipeline" ? (
            <motion.section
              key="pipeline"
              className="board-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <div className="view-intro">
                <span>Estados comerciales</span>
                <p>De descartado a cliente, con señales sociales y siguiente movimiento.</p>
              </div>
              <div className="pipeline-layout">
                <PipelineBoard
                  leads={leadItems}
                  statuses={statuses}
                  selectedId={selectedLead?.id || ""}
                  onSelect={handleSelect}
                  onStatusChange={handleStatusChange}
                />
                {selectedLead ? (
                  <LeadDetail
                    lead={selectedLead}
                    statuses={statuses}
                    onSave={handleSaveLead}
                    onEnrich={handleEnrich}
                    onFindOwner={handleFindOwner}
                    enriching={enrichingId === selectedLead.id}
                    findingOwner={findingOwnerId === selectedLead.id}
                  />
                ) : null}
              </div>
            </motion.section>
          ) : null}

          {initialView === "ruta" ? (
            <motion.section
              key="ruta"
              className="route-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <div className="view-intro">
                <span>Ruta presencial</span>
                <p>Orden pensado para salir por Castalla, Ibi y Onil con foco.</p>
              </div>
              <div className="route-layout">
                <RoutePlanner stops={routeStops} onSelect={handleSelect} />
                {selectedLead ? (
                  <LeadDetail
                    lead={selectedLead}
                    statuses={statuses}
                    onSave={handleSaveLead}
                    onEnrich={handleEnrich}
                    onFindOwner={handleFindOwner}
                    enriching={enrichingId === selectedLead.id}
                    findingOwner={findingOwnerId === selectedLead.id}
                  />
                ) : null}
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </AppShell>
    </main>
  );
}

function viewTitle(view: LeadsWorkspaceProps["initialView"]) {
  if (view === "pipeline") return "Pipeline comercial";
  if (view === "ruta") return "Ruta de visitas";
  return "Oportunidades locales";
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}
