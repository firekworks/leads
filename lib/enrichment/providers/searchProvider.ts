import type { Lead } from "@/types/lead";
import type { EnrichmentResult, ProviderHealth } from "./types";

export function searchProviderHealth(): ProviderHealth {
  const provider = process.env.SEARCH_PROVIDER || "none";
  const connected =
    provider === "tavily" ? Boolean(process.env.TAVILY_API_KEY) :
    provider === "serpapi" ? Boolean(process.env.SERPAPI_API_KEY) :
    provider === "brave" ? Boolean(process.env.BRAVE_SEARCH_API_KEY) :
    provider === "bing" ? Boolean(process.env.BING_SEARCH_API_KEY) :
    provider === "google_cse" ? Boolean(process.env.GOOGLE_CUSTOM_SEARCH_KEY && process.env.GOOGLE_CUSTOM_SEARCH_CX) :
    false;

  return {
    id: "search",
    label: "Search Provider",
    status: provider === "none" ? "disabled" : connected ? "connected" : "pending",
    lastSync: "Manual",
    estimatedCost: provider === "none" ? "0€" : "Según proveedor",
    note: provider === "none" ? "Búsqueda externa desactivada." : `Proveedor configurado: ${provider}.`
  };
}

export function manualSearchLinks(lead: Pick<Lead, "name" | "city">): EnrichmentResult {
  const query = `${lead.name} ${lead.city}`.trim();
  return {
    provider: "manual_search",
    message: "Búsquedas manuales preparadas; no se ha scrapeado ninguna red social.",
    leadPatch: {},
    sources: [
      {
        source: "google_search_manual",
        sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(`${query} instagram`)}`,
        dataType: "instagram_search",
        confidence: 0.2
      },
      {
        source: "google_search_manual",
        sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(`${query} facebook`)}`,
        dataType: "facebook_search",
        confidence: 0.2
      },
      {
        source: "google_search_manual",
        sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(`${query} dueño gerente`)}`,
        dataType: "owner_search",
        confidence: 0.2
      }
    ]
  };
}
