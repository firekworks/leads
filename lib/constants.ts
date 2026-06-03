import type { LeadStatus, Temperature } from "@/types/lead";

export const CITIES = ["Todas", "Castalla", "Ibi", "Onil", "Tibi", "Sax", "Petrer", "Villena", "Biar"];

export const SECTORS = [
  "Todos",
  "Restaurante",
  "Bar / cafetería",
  "Clínica",
  "Dentista",
  "Estética",
  "Peluquería",
  "Gimnasio",
  "Academia",
  "Taller",
  "Inmobiliaria",
  "Comercio"
];

export const STATUSES: LeadStatus[] = [
  "Detectado",
  "Validado",
  "Prioritario",
  "Visita pendiente",
  "Visitado",
  "Interesado",
  "Diagnóstico enviado",
  "Propuesta enviada",
  "Negociación",
  "Cliente",
  "No encaja",
  "Perdido"
];

export const TEMPERATURES: Temperature[] = ["Frío", "Templado", "Caliente", "Muy caliente"];

export const CHANNEL_LABELS = {
  google: "Google",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  website: "Web"
} as const;

export const CHANNEL_SHORT = {
  google: "G",
  whatsapp: "W",
  instagram: "I",
  facebook: "F",
  website: "WEB"
} as const;
