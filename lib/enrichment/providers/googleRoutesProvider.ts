import type { ProviderHealth } from "./types";

export function googleRoutesHealth(): ProviderHealth {
  const connected = Boolean(process.env.GOOGLE_ROUTES_API_KEY);
  return {
    id: "google_routes",
    label: "Google Routes",
    status: connected ? "connected" : "pending",
    lastSync: "Manual",
    estimatedCost: connected ? "Según rutas calculadas" : "0€",
    note: connected
      ? "Listo para calcular rutas optimizadas cuando se confirme el uso."
      : "Falta GOOGLE_ROUTES_API_KEY; se usa URL gratuita de Google Maps."
  };
}
