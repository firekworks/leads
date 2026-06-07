import type { FitClassification, Lead } from "@/types/lead";

const sectorPotential: Record<string, number> = {
  Restaurantes: 12,
  Bares: 10,
  Cafeterías: 9,
  Panaderías: 8,
  Clínicas: 13,
  Fisioterapia: 11,
  Farmacias: 9,
  Ópticas: 11,
  Veterinarios: 11,
  Gimnasios: 11,
  Estética: 10,
  Peluquerías: 8,
  Barberías: 8,
  Academias: 10,
  Autoescuelas: 9,
  "Centros infantiles": 9,
  Talleres: 8,
  Inmobiliarias: 12,
  Moda: 9,
  Zapaterías: 8,
  Deporte: 9,
  Floristerías: 8,
  Decoración: 9,
  Muebles: 10,
  Hoteles: 12,
  "Turismo rural": 8,
  Comercios: 8
};

const monthlyBaseBySector: Record<string, number> = {
  Restaurantes: 360,
  Bares: 320,
  Cafeterías: 300,
  Panaderías: 260,
  Clínicas: 680,
  Fisioterapia: 520,
  Farmacias: 380,
  Ópticas: 520,
  Veterinarios: 520,
  Gimnasios: 520,
  Estética: 420,
  Peluquerías: 280,
  Barberías: 280,
  Academias: 450,
  Autoescuelas: 360,
  "Centros infantiles": 360,
  Talleres: 360,
  Inmobiliarias: 620,
  Moda: 380,
  Zapaterías: 320,
  Deporte: 360,
  Floristerías: 300,
  Decoración: 420,
  Muebles: 520,
  Hoteles: 620,
  "Turismo rural": 420,
  Comercios: 320
};

type FitResult = {
  classification: FitClassification;
  disqualified: boolean;
  reason: string;
  tags: string[];
};

const fitLabels: Record<FitClassification, string> = {
  valid_client_candidate: "Privado",
  public_entity: "Entidad pública",
  tourism_public: "Turismo público",
  healthcare_public: "Salud pública",
  education_public: "Educación pública",
  emergency_service: "Emergencias",
  government: "Administración",
  duplicate: "Duplicado",
  low_fit: "Bajo encaje",
  unknown: "Revisar"
};

const governmentTerms = [
  "ayuntamiento",
  "ajuntament",
  "casa consistorial",
  "diputacion",
  "conselleria",
  "generalitat",
  "ministerio",
  "juzgado",
  "registro civil",
  "sepe",
  "seguridad social",
  "suma gestion",
  "mancomunidad",
  "servicio publico",
  "servicios municipales",
  "municipal",
  "oficina publica",
  "edificio publico",
  "oficina municipal"
];

const tourismPublicTerms = [
  "oficina de turismo",
  "tourist info",
  "turismo municipal",
  "informacion turistica",
  "museo municipal",
  "museo de",
  "mubio",
  "castillo de",
  "castillo",
  "monumento",
  "palacio-fortaleza",
  "palacio fortaleza",
  "casa de cultura",
  "casa cultura municipal",
  "biblioteca municipal",
  "biblioteca publica",
  "laberinto casa tapena",
  "casa tapena",
  "centro cultural",
  "espacio cultural municipal"
];

const healthcarePublicTerms = [
  "centro de salud",
  "consultorio publico",
  "consultorio medico auxiliar",
  "consultorio medico",
  "hospital publico",
  "ambulatorio",
  "centro sanitario integrado"
];

const educationPublicTerms = [
  "colegio publico",
  "instituto publico",
  "centro publico",
  "ies ",
  "ceip ",
  "escuela infantil municipal",
  "escuela municipal"
];

const emergencyTerms = ["policia", "policia local", "guardia civil", "bomberos", "proteccion civil"];
const publicFacilityTerms = [
  "ciudad deportiva municipal",
  "polideportivo municipal",
  "pabellon municipal",
  "piscina municipal",
  "campo municipal",
  "instalacion deportiva municipal",
  "instalaciones deportivas municipales",
  "centro social municipal",
  "cementerio municipal",
  "mercado municipal"
];
const closedTerms = ["cerrado permanentemente", "cerrado temporalmente", "permanently closed", "temporarily closed", "sitio cerrado"];
const nonProfitTerms = ["asociacion", "asociación", "sin animo de lucro", "sin ánimo de lucro", "ong", "fundacion", "fundación", "caritas", "cruz roja"];
const lowFitTerms = ["banco", "cajero", "eurocaja", "sabadell", "caixabank", "bbva", "santander"];

export function computeScore(lead: Omit<Lead, "score"> | Lead) {
  return computeScoreBreakdown(lead).scoreTotal;
}

export function computeScoreBreakdown(lead: Omit<Lead, "score"> | Lead) {
  const fit = classifyLeadFit(lead);
  const forcedDiscard =
    !lead.manualOverride &&
    (fit.disqualified ||
      Boolean(lead.isInvalid) ||
      Boolean(lead.isDisqualified) ||
      ["No contactar", "No encaja", "Perdido"].includes(String(lead.status)));

  if (forcedDiscard) {
    const baseScore = fit.classification === "duplicate" ? 10 : fit.classification === "low_fit" ? 22 : 18;
    return {
      scoreTotal: Math.min(25, baseScore),
      scoreDemandaVisible: 0,
      scorePresenciaDigital: 0,
      scoreUrgencia: 0,
      scoreDinero: 0,
      scoreFacilidadContacto: 0,
      scoreProbabilidadCierre: 0,
      scorePotencialMensualidad: 0,
      scorePrioridadVisita: 0,
      scoreExplanation: [fit.reason || lead.disqualifiedReason || lead.invalidReason || "No cliente probable."],
      scoreTags: ["No cliente", fitLabels[fit.classification]].filter(Boolean)
    };
  }

  const hasWeb = Boolean(lead.website || lead.signals.web);
  const hasInstagram = Boolean(lead.instagramUrl || lead.signals.instagram);
  const hasFacebook = Boolean(lead.facebookUrl || lead.signals.facebook);
  const hasWhatsapp = Boolean(lead.whatsappUrl || lead.signals.whatsapp);
  const hasPhone = Boolean(lead.phone);
  const reviews = Number(lead.reviews || 0);
  const rating = Number(lead.rating || 0);
  const hasDemandSource = reviews > 0 || rating > 0 || lead.googlePhotos > 0;
  const hasContactSource = hasPhone || hasWhatsapp || hasWeb || Boolean(lead.googleMapsUrl || lead.address);
  const hasDigitalSource = hasWeb || hasInstagram || hasFacebook || hasWhatsapp || lead.contentUse !== "Pendiente";
  const pendingEnrichment = !hasDemandSource && !hasContactSource && !hasDigitalSource && lead.enrichmentStatus !== "completo";
  const explanation: string[] = [];
  const tags: string[] = [fitLabels[fit.classification]];

  const digitalWeakness =
    (!hasWeb ? 28 : 0) +
    (!hasInstagram ? 20 : 0) +
    (!hasFacebook ? 10 : 0) +
    (!hasWhatsapp ? 10 : 0) +
    (lead.contentUse === "Sin uso" ? 18 : lead.contentUse === "Flojo" ? 14 : lead.contentUse === "Pendiente" ? 9 : 0) +
    (lead.googlePhotos < 5 ? 8 : 0);
  const scorePresenciaDigital = clampScore(digitalWeakness);

  const scoreDemandaVisible = clampScore(
    Math.min(45, reviews / 3.5) +
      Math.min(30, rating ? rating * 6 : 0) +
      Math.min(15, lead.googlePhotos / 2) +
      (lead.googleMapsUrl || lead.signals.googleProfile ? 10 : 0)
  );
  const demand = Math.min(40, reviews / 7) + Math.min(20, rating * 4);
  const urgencyGap =
    scorePresenciaDigital * 0.55 +
    (reviews >= 100 && rating >= 4.3 ? 24 : reviews >= 35 ? 12 : 0) +
    (lead.adsSignal ? 10 : 0);
  const scoreUrgencia = clampScore(urgencyGap);

  const scoreDinero = clampScore((sectorPotential[lead.sector] || 8) * 5 + Math.min(24, lead.potential / 45) + demand * 0.25);
  const scoreFacilidadContacto = clampScore(
    (hasPhone ? 32 : 0) + (hasWhatsapp ? 34 : 0) + (hasWeb ? 14 : 0) + (lead.googleMapsUrl ? 12 : 0) + (lead.address ? 8 : 0)
  );
  const scoreProbabilidadCierre = clampScore(
    scoreDinero * 0.28 +
      scoreUrgencia * 0.28 +
      scoreFacilidadContacto * 0.22 +
      (lead.status === "Respondió" ? 18 : lead.status === "Reunión agendada" ? 26 : lead.status === "Propuesta enviada" ? 30 : 0)
  );
  const scorePotencialMensualidad = clampScore(Math.min(100, estimateRawMonthlyValue(lead) / 10));
  const scorePrioridadVisita = clampScore(
    (["Castalla", "Ibi", "Onil", "Biar", "Tibi"].includes(lead.city) ? 30 : 0) +
      scoreUrgencia * 0.24 +
      scoreDinero * 0.24 +
      (lead.address ? 12 : 0) +
      (rating >= 4.5 ? 10 : 0)
  );
  const scoreTotal = clampScore(
    (pendingEnrichment ? Math.min(scoreDemandaVisible, 20) : scoreDemandaVisible) * 0.25 +
      scoreDinero * 0.25 +
      scorePresenciaDigital * 0.2 +
      scoreFacilidadContacto * 0.15 +
      scorePrioridadVisita * 0.15
  );
  const commercialTemperature = pendingEnrichment ? Math.min(scoreTotal, 39) : scoreTotal;

  if (pendingEnrichment) {
    explanation.push("Pendiente de enriquecer: faltan fuentes suficientes para valorar temperatura comercial.");
    tags.push("Pendiente de enriquecer");
  }

  if (reviews >= 100 && rating >= 4.3) {
    explanation.push(`${rating} estrellas y ${reviews} reseñas: demanda visible.`);
    tags.push("Demanda");
  }
  if (!hasWeb) {
    explanation.push("Sin web visible: oportunidad de landing y SEO local.");
    tags.push("Sin web");
  }
  if (!hasInstagram) {
    explanation.push("Instagram ausente o no detectado: hueco de contenido.");
    tags.push("Sin IG");
  }
  if (lead.contentUse === "Sin uso" || lead.contentUse === "Flojo") {
    explanation.push(`Contenido ${lead.contentUse.toLowerCase()}: buen ángulo audiovisual.`);
    tags.push("Hueco visual");
  }
  if (hasWhatsapp || hasPhone) {
    explanation.push("Contacto fácil para WhatsApp Business y seguimiento.");
    tags.push("Contacto");
  }
  if (["Clínicas", "Fisioterapia", "Inmobiliarias", "Hoteles", "Turismo rural", "Veterinarios"].includes(lead.sector)) {
    explanation.push("Sector con margen para mensualidad y campañas locales.");
    tags.push("Ticket alto");
  }
  if (explanation.length === 0) explanation.push("Lead detectado para validación manual de presencia digital y encaje comercial.");

  return {
    scoreTotal: commercialTemperature,
    scoreDemandaVisible,
    scorePresenciaDigital,
    scoreUrgencia,
    scoreDinero,
    scoreFacilidadContacto,
    scoreProbabilidadCierre,
    scorePotencialMensualidad,
    scorePrioridadVisita,
    scoreExplanation: explanation.slice(0, 5),
    scoreTags: Array.from(new Set(tags)).slice(0, 5)
  };
}

export function classifyLeadFit(lead: Omit<Lead, "score"> | Lead): FitResult {
  const haystack = normalizeForFit(
    [
      lead.name,
      lead.sector,
      lead.description,
      lead.websiteTitle,
      lead.address,
      lead.disqualifiedReason,
      lead.invalidReason
    ].join(" ")
  );

  if (lead.manualOverride) {
    return {
      classification: "valid_client_candidate",
      disqualified: false,
      reason: "Restaurado manualmente para revisión comercial.",
      tags: ["Privado", "Manual"]
    };
  }

  if (lead.validationStatus === "duplicado" || lead.disqualifiedCategory === "duplicate") {
    return {
      classification: "duplicate",
      disqualified: true,
      reason: "Duplicado pendiente de fusionar.",
      tags: ["Duplicado"]
    };
  }

  if (matchesAny(haystack, closedTerms)) {
    return disqualifiedFit("low_fit", "Sitio cerrado: no cliente probable.");
  }
  if (matchesAny(haystack, emergencyTerms)) {
    return disqualifiedFit("emergency_service", "Servicio de emergencia: no cliente probable.");
  }
  if (matchesAny(haystack, governmentTerms)) {
    return disqualifiedFit("government", "Administración pública: no cliente probable.");
  }
  if (matchesAny(haystack, publicFacilityTerms)) {
    return disqualifiedFit("public_entity", "Instalación pública: no cliente probable.");
  }
  if (matchesAny(haystack, tourismPublicTerms)) {
    return disqualifiedFit("tourism_public", "Turismo o espacio público: no cliente probable.");
  }
  if (matchesAny(haystack, healthcarePublicTerms)) {
    return disqualifiedFit("healthcare_public", "Servicio sanitario público: no cliente probable.");
  }
  if (matchesAny(haystack, educationPublicTerms)) {
    return disqualifiedFit("education_public", "Centro educativo público: no cliente probable.");
  }
  if (matchesAny(haystack, nonProfitTerms)) {
    return disqualifiedFit("low_fit", "Asociación o entidad sin ánimo comercial evidente.");
  }
  if (matchesAny(haystack, lowFitTerms)) {
    return {
      classification: "low_fit",
      disqualified: false,
      reason: "Bajo encaje con servicios audiovisuales y captación local.",
      tags: ["Bajo encaje"]
    };
  }

  const privateSector = [
    "restaurantes",
    "bares",
    "cafeterias",
    "clinicas",
    "fisioterapia",
    "veterinarios",
    "gimnasios",
    "estetica",
    "peluquerias",
    "barberias",
    "academias",
    "autoescuelas",
    "talleres",
    "inmobiliarias",
    "moda",
    "zapaterias",
    "deporte",
    "floristerias",
    "decoracion",
    "muebles",
    "hoteles",
    "turismo rural",
    "comercios"
  ].some((sector) => haystack.includes(sector));

  return {
    classification: privateSector ? "valid_client_candidate" : "unknown",
    disqualified: false,
    reason: privateSector ? "Comercio privado con encaje comercial." : "Pendiente de validar encaje.",
    tags: [privateSector ? "Privado" : "Revisar"]
  };
}

function disqualifiedFit(classification: FitClassification, reason: string): FitResult {
  return {
    classification,
    disqualified: true,
    reason,
    tags: ["No cliente", fitLabels[classification]]
  };
}

function matchesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function normalizeForFit(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function computeLegacyScore(lead: Omit<Lead, "score"> | Lead) {
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
    lead.contentUse === "Sin uso"
      ? 6
      : lead.contentUse === "Flojo"
        ? 5
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

  const nearbyCities = ["Castalla", "Onil", "Ibi", "Biar", "Tibi"];
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
  if (score >= 80) return "priority";
  if (score >= 60) return "hot";
  if (score >= 40) return "warm";
  if (score >= 20) return "cold";
  return "reject";
}

export function estimateMonthlyValue(lead: Lead) {
  if (["Perdido", "No encaja", "No contactar"].includes(lead.status) || lead.isInvalid || lead.isDisqualified) {
    return 0;
  }

  return estimateRawMonthlyValue(lead);
}

function estimateRawMonthlyValue(lead: Omit<Lead, "score"> | Lead) {
  const base = monthlyBaseBySector[lead.sector] || 340;
  const score = "score" in lead ? lead.score : computeLegacyScore(lead);
  const scoreMultiplier = score >= 80 ? 1.25 : score >= 60 ? 0.85 : score >= 40 ? 0.45 : 0.18;
  const visualOpportunity =
    lead.contentUse === "Sin uso"
      ? 1.14
      : lead.contentUse === "Flojo"
        ? 1.08
        : lead.contentUse === "Pendiente"
          ? 1.02
          : lead.contentUse === "Muy trabajado"
            ? 0.78
            : 0.9;
  const demandMultiplier = lead.reviews >= 150 ? 1.12 : lead.reviews >= 50 ? 1 : 0.82;

  return Math.round((base * scoreMultiplier * visualOpportunity * demandMultiplier) / 25) * 25;
}

export function estimateWeightedMonthlyValue(lead: Lead) {
  const monthlyValue = estimateMonthlyValue(lead);
  if (!monthlyValue) return 0;

  const scoreProbability =
    lead.score >= 80 ? 0.18 : lead.score >= 60 ? 0.08 : lead.score >= 40 ? 0.035 : 0.012;
  const stageMultiplier: Record<string, number> = {
    Detectado: 0.65,
    Validado: 0.9,
    Prioritario: 1,
    Contactado: 1.05,
    Respondió: 1.15,
    "Reunión agendada": 1.35,
    "Diagnóstico hecho": 1.45,
    "Propuesta enviada": 1.6,
    Negociación: 1.7
  };
  const probability = scoreProbability * (stageMultiplier[lead.status] || 1);

  return Math.round((monthlyValue * probability) / 25) * 25;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function recommendServicePlan(lead: Lead) {
  const monthlyValue = estimateMonthlyValue(lead);
  const adBudget = estimateAdBudget(lead);

  if (monthlyValue >= 850 || lead.score >= 80) {
    return {
      name: "Dominio local",
      visits: "2 visitas/mes",
      content: "8-10 piezas",
      ads: adBudget,
      focus: "Meta Ads, reels, Google Business, WhatsApp y reseñas"
    };
  }

  if (monthlyValue >= 450 || lead.score >= 60) {
    return {
      name: "Crecimiento",
      visits: "1 visita/mes",
      content: "4-6 piezas",
      ads: adBudget,
      focus: "Contenido profesional, campañas locales y captación por WhatsApp"
    };
  }

  return {
    name: "Arranque",
    visits: "1 visita puntual",
    content: "2-3 piezas",
    ads: adBudget,
    focus: "Google Business, WhatsApp y primera campaña local"
  };
}

export function estimateAdBudget(lead: Lead) {
  const premiumSector = ["Clínicas", "Inmobiliarias", "Hoteles"].includes(lead.sector);
  if (lead.score >= 80) return premiumSector ? 500 : 350;
  if (lead.score >= 60) return 220;
  if (lead.score >= 40) return 120;
  return 80;
}

export function explainPotential(lead: Lead) {
  const reasons: string[] = [];

  if (lead.reviews >= 120 || lead.rating >= 4.5) {
    reasons.push("Demanda local");
  }

  if (
    ["Clínicas", "Fisioterapia", "Inmobiliarias", "Hoteles", "Turismo rural", "Gimnasios", "Estética"].includes(
      lead.sector
    )
  ) {
    reasons.push("Ticket alto");
  }

  if (lead.contentUse === "Sin uso" || lead.contentUse === "Flojo" || lead.contentUse === "Pendiente") {
    reasons.push("Hueco visual");
  }

  if (!lead.signals.instagram || !lead.signals.facebook || !lead.signals.web) {
    reasons.push("Captación digital");
  }

  if (lead.phone || lead.whatsappUrl || lead.googleMapsUrl) {
    reasons.push("Contacto fácil");
  }

  if (["Castalla", "Ibi", "Onil", "Biar", "Tibi"].includes(lead.city)) {
    reasons.push("Ruta Foia");
  }

  return reasons.slice(0, 4);
}
