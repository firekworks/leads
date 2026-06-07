import type { Lead } from "@/types/lead";
import type { ProviderContext, ProviderHealth } from "./types";

export const GOOGLE_PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.businessStatus"
].join(",");

export function googlePlacesHealth(): ProviderHealth {
  const connected = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  return {
    id: "google_places",
    label: "Google Places",
    status: connected ? "connected" : "pending",
    lastSync: "Manual",
    estimatedCost: connected ? "Según escaneo" : "0€",
    note: connected ? "FieldMask limitado; no usa wildcard." : "Falta GOOGLE_PLACES_API_KEY."
  };
}

export async function scanGooglePlacesFallback(params: {
  city: string;
  sector: string;
  existingLeads: Lead[];
  context?: ProviderContext;
}) {
  if (!params.context?.allowPaidRequests) {
    return {
      provider: "existing_leads",
      leads: filterExistingLeads(params.existingLeads, params.city, params.sector),
      message: "No se han hecho peticiones pagadas. Usando leads existentes como radar seguro.",
      estimatedCost: "0€"
    };
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return {
      provider: "existing_leads",
      leads: filterExistingLeads(params.existingLeads, params.city, params.sector),
      message: "Falta GOOGLE_PLACES_API_KEY. Usando leads existentes.",
      estimatedCost: "0€"
    };
  }

  return {
    provider: "google_places_ready",
    leads: filterExistingLeads(params.existingLeads, params.city, params.sector),
    message: "Google Places está preparado, pero este endpoint mantiene allowPaidRequests=false por defecto.",
    estimatedCost: "Controlado por maxRequests"
  };
}

function filterExistingLeads(leads: Lead[], city: string, sector: string) {
  const sectorToken = normalize(sector).split(" ")[0];
  return leads
    .filter((lead) => !lead.isInvalid && !lead.isDisqualified && lead.status !== "No contactar")
    .filter((lead) => !city || lead.city === city || normalize(lead.sector).includes(sectorToken))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
