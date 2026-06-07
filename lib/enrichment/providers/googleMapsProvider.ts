import type { Lead } from "@/types/lead";
import type { ProviderHealth } from "./types";

export function googleMapsHealth(): ProviderHealth {
  const connected = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  return {
    id: "google_maps",
    label: "Google Maps",
    status: connected ? "connected" : "pending",
    lastSync: "Cliente",
    estimatedCost: connected ? "Carga de mapa" : "0€",
    note: connected ? "Listo para mapa real y marcadores." : "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY."
  };
}

export function buildGoogleMapsRouteUrl(leads: Pick<Lead, "name" | "address" | "city" | "latitude" | "longitude">[]) {
  const route = leads.slice(0, 10);
  if (!route.length) return "";
  const [origin, ...rest] = route;
  const destination = rest.at(-1) || origin;
  const waypoints = rest.slice(0, -1).map(stopQuery).join("|");
  const params = new URLSearchParams({
    api: "1",
    origin: stopQuery(origin),
    destination: stopQuery(destination),
    travelmode: "driving"
  });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function stopQuery(lead: Pick<Lead, "name" | "address" | "city" | "latitude" | "longitude">) {
  if (typeof lead.latitude === "number" && typeof lead.longitude === "number") {
    return `${lead.latitude},${lead.longitude}`;
  }
  return `${lead.name} ${lead.address} ${lead.city} España`.trim();
}
