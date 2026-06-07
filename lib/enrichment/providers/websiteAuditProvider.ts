import type { Lead } from "@/types/lead";
import type { EnrichmentResult, ProviderHealth } from "./types";

export function websiteAuditHealth(): ProviderHealth {
  const connected = Boolean(process.env.FIRECRAWL_API_KEY || process.env.APIFY_TOKEN);
  return {
    id: "website_audit",
    label: "Website Crawler",
    status: connected ? "connected" : "pending",
    lastSync: "Endpoint /api/enrich",
    estimatedCost: connected ? "Según proveedor" : "0€",
    note: connected ? "Preparado para auditoría web avanzada." : "Fallback HTML básico; sin Firecrawl/Apify."
  };
}

export async function auditWebsite(lead: Lead): Promise<EnrichmentResult> {
  const website = normalizeWebsiteUrl(lead.website);
  if (!website) {
    return { provider: "website_audit", message: "Sin web para auditar.", leadPatch: {}, sources: [] };
  }

  try {
    const response = await fetch(website, {
      headers: { "user-agent": "Firekworks Leads website audit/1.0" },
      signal: AbortSignal.timeout(8000)
    });
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!response.ok || !contentType.includes("text/html")) {
      return { provider: "website_audit", message: "La web no devolvió HTML auditable.", leadPatch: {}, sources: [] };
    }

    const html = await response.text();
    const title = cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    const description = cleanText((html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] || ""));
    return {
      provider: "website_audit",
      message: "Auditoría HTML básica completada.",
      leadPatch: {
        websiteTitle: title || lead.websiteTitle,
        description: description || lead.description,
        lastEnrichedAt: new Date().toISOString(),
        enrichmentStatus: "parcial"
      },
      sources: [{
        source: "website_html",
        sourceUrl: website,
        dataType: "title_description",
        confidence: 0.65
      }]
    };
  } catch {
    return { provider: "website_audit", message: "No se pudo auditar la web.", leadPatch: {}, sources: [] };
  }
}

function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`).toString();
  } catch {
    return "";
  }
}

function cleanText(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
