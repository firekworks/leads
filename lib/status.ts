import type { LeadStatus } from "@/types/lead";

export const statusColors: Record<LeadStatus, string> = {
  Detectado: "gray",
  Validado: "blue",
  Prioritario: "red",
  Contactado: "yellow",
  Respondió: "orange",
  "Reunión agendada": "lilac",
  "Diagnóstico hecho": "blue",
  "Propuesta enviada": "yellow",
  Negociación: "lilac",
  Ganado: "green",
  Perdido: "muted-red",
  "No encaja": "muted-red",
  "No contactar": "red"
};

export function statusTone(status: LeadStatus) {
  return statusColors[status] || "gray";
}
