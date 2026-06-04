import type { LeadStatus } from "@/types/lead";

export const statusColors: Record<LeadStatus, string> = {
  Descartado: "red",
  Detectado: "gray",
  Validado: "blue",
  Interesado: "yellow",
  "Visita/Reunión": "orange",
  Negociación: "lilac",
  Cliente: "green",
  Desinteresado: "muted-red"
};

export function statusTone(status: LeadStatus) {
  return statusColors[status] || "gray";
}
