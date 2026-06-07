import type { ProviderHealth } from "./types";

export function businessDataHealth(): ProviderHealth {
  const provider = process.env.BUSINESS_DATA_PROVIDER || "none";
  const connected =
    provider === "informa" ? Boolean(process.env.INFORMA_API_KEY) :
    provider === "axesor" ? Boolean(process.env.AXESOR_API_KEY) :
    provider === "iberinform" ? Boolean(process.env.IBERINFORM_API_KEY) :
    provider === "opencorporates" ? Boolean(process.env.OPENCORPORATES_API_KEY) :
    false;

  return {
    id: "business_data",
    label: "Business Data Provider",
    status: provider === "none" ? "disabled" : connected ? "connected" : "pending",
    lastSync: "Pendiente",
    estimatedCost: provider === "none" ? "0€" : "Según proveedor",
    note: provider === "none" ? "Facturación no verificada." : `Proveedor configurado: ${provider}.`
  };
}
