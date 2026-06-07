import type { ProviderHealth } from "./types";

export function instagramResolverHealth(): ProviderHealth {
  const connected = Boolean(process.env.SEARCH_PROVIDER && process.env.SEARCH_PROVIDER !== "none");
  return {
    id: "instagram_resolver",
    label: "Instagram Resolver",
    status: connected ? "connected" : "pending",
    lastSync: "Manual",
    estimatedCost: connected ? "Búsqueda web" : "0€",
    note: "Solo busca URL probable. No scrapea Instagram ni lee seguidores."
  };
}
