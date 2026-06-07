import type { ProviderHealth } from "./types";

export function metaAdsSignalHealth(): ProviderHealth {
  const connected = Boolean(process.env.META_APP_ID && process.env.META_ACCESS_TOKEN);
  return {
    id: "meta_ads_signal",
    label: "Meta Ads Signal",
    status: connected ? "connected" : "pending",
    lastSync: "Pendiente",
    estimatedCost: "0€",
    note: "Solo señales legales; no se afirma inversión si no hay fuente."
  };
}
