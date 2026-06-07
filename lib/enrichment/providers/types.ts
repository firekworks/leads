import type { Lead } from "@/types/lead";

export type ProviderStatus = "connected" | "pending" | "error" | "disabled";

export type ProviderHealth = {
  id: string;
  label: string;
  status: ProviderStatus;
  lastSync: string;
  estimatedCost: string;
  note: string;
};

export type ProviderContext = {
  allowPaidRequests?: boolean;
  maxRequests?: number;
};

export type EnrichmentSource = {
  source: string;
  sourceUrl: string;
  dataType: string;
  confidence: number;
  rawPayload?: Record<string, unknown>;
};

export type EnrichmentResult = {
  leadPatch: Partial<Lead>;
  sources: EnrichmentSource[];
  provider: string;
  message: string;
};
