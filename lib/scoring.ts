import type { ChannelHealth, ChannelState, Lead, Temperature } from "@/types/lead";

const sectorWeight: Record<string, number> = {
  Restaurante: 20,
  "Bar / cafetería": 19,
  Clínica: 19,
  Dentista: 19,
  Estética: 18,
  Peluquería: 17,
  Gimnasio: 18,
  Academia: 16,
  Taller: 15,
  Inmobiliaria: 17,
  Comercio: 14
};

function weaknessScore(value: ChannelHealth) {
  if (value === "none") return 5;
  if (value === "weak") return 4;
  if (value === "ok") return 2;
  return 0;
}

export function computeLeadScore(input: Pick<Lead, "sector" | "rating" | "reviews" | "phone" | "website" | "channels" | "monthlyPotential">) {
  const sector = sectorWeight[input.sector] ?? 12;
  const digitalGap = Math.min(
    25,
    weaknessScore(input.channels.website) * 2.1 +
      weaknessScore(input.channels.instagram) * 1.7 +
      weaknessScore(input.channels.facebook) * 1.1 +
      weaknessScore(input.channels.google) * 1.7 +
      weaknessScore(input.channels.whatsapp) * 1.4
  );
  const demand = Math.min(20, Math.round((input.rating >= 4 ? 6 : 2) + Math.min(14, input.reviews / 18)));
  const contact = Math.min(15, (input.phone ? 8 : 0) + (input.website ? 4 : 0) + (input.channels.whatsapp !== "none" ? 3 : 0));
  const money = Math.min(10, Math.round((input.monthlyPotential || 350) / 90));
  const urgency = Math.min(10, Math.round(digitalGap / 3));
  return Math.max(1, Math.min(100, Math.round(sector + digitalGap + demand + contact + money + urgency)));
}

export function temperatureFromScore(score: number): Temperature {
  if (score >= 82) return "Muy caliente";
  if (score >= 66) return "Caliente";
  if (score >= 48) return "Templado";
  return "Frío";
}

export function priorityFromScore(score: number) {
  if (score >= 82) return "Alta prioridad";
  if (score >= 66) return "Buena oportunidad";
  if (score >= 48) return "Revisar";
  return "Baja prioridad";
}

export function inferChannelsFromPlace(place: { phone?: string; website?: string; rating?: number; reviews?: number; photos?: number }): ChannelState {
  return {
    google: place.rating && place.reviews ? (place.reviews > 120 && place.photos && place.photos > 4 ? "strong" : "ok") : "weak",
    whatsapp: place.phone ? "ok" : "none",
    instagram: "none",
    facebook: "none",
    website: place.website ? "ok" : "none"
  };
}

export function buildDiagnosis(lead: Pick<Lead, "sector" | "channels" | "reviews" | "rating">) {
  const missing = [];
  if (lead.channels.website === "none" || lead.channels.website === "weak") missing.push("web/landing");
  if (lead.channels.whatsapp === "none" || lead.channels.whatsapp === "weak") missing.push("WhatsApp claro");
  if (lead.channels.instagram === "none" || lead.channels.instagram === "weak") missing.push("contenido social");
  if (lead.channels.google === "weak") missing.push("Google Business");
  const base = missing.length ? `Falta reforzar ${missing.slice(0, 2).join(" y ")}.` : "Tiene presencia, pero se puede ordenar mejor la conversión.";
  const demand = lead.reviews > 60 ? "Ya hay demanda visible; toca convertir mejor esa atención." : "Primero conviene hacer que el negocio parezca más claro y confiable.";
  return `${base} ${demand}`;
}

export function recommendedActionFor(lead: Pick<Lead, "sector" | "channels">) {
  if (lead.channels.google === "weak") return "Optimizar Google Business + fotos + camino a WhatsApp";
  if (lead.channels.website === "none") return "Landing simple + WhatsApp + campaña local";
  if (lead.channels.instagram === "none" || lead.channels.instagram === "weak") return "Contenido base + Meta Ads + prueba de mensajes";
  if (lead.channels.whatsapp === "none") return "WhatsApp visible + CTA + seguimiento comercial";
  return "Campaña mensual de captación local";
}
