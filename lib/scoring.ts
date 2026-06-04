import type { Lead } from "@/types/lead";

const sectorPotential: Record<string, number> = {
  Restaurantes: 12,
  Clínicas: 13,
  Gimnasios: 11,
  Estética: 10,
  Peluquerías: 8,
  Academias: 10,
  Talleres: 8,
  Inmobiliarias: 12
};

export function computeScore(lead: Omit<Lead, "score"> | Lead) {
  const commercialPotential = Math.min(
    30,
    Math.round((sectorPotential[lead.sector] || 8) + Math.min(lead.potential / 55, 18))
  );

  const demandVisible = Math.min(
    25,
    Math.round(
      Math.min((lead.rating / 5) * 8, 8) +
        Math.min(lead.reviews / 28, 11) +
        Math.min(lead.googlePhotos / 3, 6)
    )
  );

  const contentGap =
    lead.contentUse === "Sin redes"
      ? 6
      : lead.contentUse === "Abandonado"
        ? 5
        : lead.contentUse === "Básico"
          ? 4
          : lead.contentUse === "Pendiente"
            ? 3
            : 0;

  const digitalGap = Math.min(
    20,
    (!lead.signals.web ? 5 : 0) +
      (!lead.signals.instagram ? 4 : 0) +
      (!lead.signals.facebook ? 2 : 0) +
      (!lead.signals.whatsapp ? 4 : 0) +
      (!lead.signals.photos || lead.googlePhotos < 5 ? 2 : 0) +
      contentGap
  );

  const contactEase = Math.min(
    15,
    (lead.phone ? 4 : 0) +
      (lead.whatsappUrl || lead.signals.whatsapp ? 4 : 0) +
      (lead.website ? 3 : 0) +
      (lead.googleMapsUrl ? 2 : 0) +
      (lead.address ? 2 : 0)
  );

  const nearbyCities = ["Castalla", "Onil", "Ibi", "Elda", "Sax", "Petrer", "Alcoi"];
  const inRoute = nearbyCities.includes(lead.city) ? 6 : 3;
  const presencialOpportunity = Math.min(10, inRoute + (lead.address ? 2 : 0) + (lead.rating >= 4.5 ? 2 : 0));

  return Math.min(
    100,
    commercialPotential + demandVisible + digitalGap + contactEase + presencialOpportunity
  );
}

export function scoreLabel(score: number) {
  if (score >= 80) return "Muy caliente";
  if (score >= 60) return "Caliente";
  if (score >= 40) return "Templado";
  return "Frío";
}

export function scoreTone(score: number) {
  if (score >= 80) return "hot";
  if (score >= 60) return "warm";
  if (score >= 40) return "medium";
  return "low";
}
