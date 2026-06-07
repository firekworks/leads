import type { ProviderHealth } from "./types";

export function statsConnectorHealth(): ProviderHealth {
  return {
    id: "stats_connector",
    label: "Stats connector",
    status: "pending",
    lastSync: "Futuro",
    estimatedCost: "0€",
    note: "Preparado para enlazar lead ganado con Firekworks Stats sin tocar el repo Stats."
  };
}
