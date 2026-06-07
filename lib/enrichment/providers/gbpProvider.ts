import type { ProviderHealth } from "./types";

export function gbpHealth(): ProviderHealth {
  const connected = Boolean(
    process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID &&
    process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET &&
    process.env.GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN
  );
  return {
    id: "google_business_profile",
    label: "Google Business Profile",
    status: connected ? "connected" : "pending",
    lastSync: "Solo clientes autorizados",
    estimatedCost: "0€",
    note: "GBP API solo para fichas propias o clientes autorizados; leads usan Places."
  };
}
