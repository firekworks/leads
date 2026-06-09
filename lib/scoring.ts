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
    return scoreResponse({
      scoreTotal: Math.min(25, baseScore),
      demand: 0,
      paymentCapacity: 0,
      digitalGap: 0,
      fit: 0,
      visitability: 0,
      penalties: fit.classification === "duplicate" ? -25 : fit.disqualified ? -80 : -60,
      confidence: 0.95,
      explanation: [fit.reason || lead.disqualifiedReason || lead.invalidReason || "No cliente probable."],
      tags: ["No cliente", fitLabels[fit.classification]].filter(Boolean)
    });
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
  const focusCities = ["Castalla", "Ibi", "Onil", "Biar", "Tibi", "Sax", "Elda", "Petrer"];
  const highFitSectors = ["Clínicas", "Fisioterapia", "Veterinarios", "Gimnasios", "Estética", "Inmobiliarias", "Hoteles", "Turismo rural", "Restaurantes", "Academias"];
  const localCity = focusCities.includes(lead.city);
  const knownSources = [
    hasDemandSource,
    hasContactSource,
    hasDigitalSource,
    Boolean(lead.placeId || lead.googleMapsUrl),
    Boolean(lead.websiteTitle || lead.description),
    Boolean(lead.ownerName || lead.reviewOwnerCandidates?.length)
  ].filter(Boolean).length;

  const digitalWeakness =
    (!hasWeb ? 26 : 0) +
    (!hasInstagram ? 22 : 0) +
    (!hasFacebook ? 8 : 0) +
    (!hasWhatsapp ? 11 : 0) +
    (lead.contentUse === "Sin uso" ? 20 : lead.contentUse === "Flojo" ? 16 : lead.contentUse === "Pendiente" ? 10 : 0) +
    (lead.googlePhotos < 5 ? 10 : 0) +
    (lead.adsSignal ? 5 : 0);
  const scoreDigitalGap = clampScore(digitalWeakness);

  const scoreDemand = clampScore(
    Math.min(44, reviews / 3.2) +
      Math.min(28, rating ? rating * 5.6 : 0) +
      Math.min(16, lead.googlePhotos / 2.2) +
      (lead.googleMapsUrl || lead.signals.googleProfile || lead.placeId ? 12 : 0)
  );

  const scorePaymentCapacity = clampScore(
    (sectorPotential[lead.sector] || 8) * 5.2 +
      Math.min(18, lead.potential / 55) +
      Math.min(18, reviews / 16) +
      (rating >= 4.5 ? 8 : rating >= 4.1 ? 4 : 0) +
      (lead.adsSignal ? 6 : 0)
  );

  const scoreFit = clampScore(
    (highFitSectors.includes(lead.sector) ? 42 : 28) +
      (scoreDigitalGap >= 55 ? 20 : scoreDigitalGap >= 35 ? 12 : 6) +
      (reviews >= 60 ? 14 : reviews >= 20 ? 8 : 2) +
      (hasInstagram ? 2 : 8) +
      (localCity ? 10 : 3) +
      (hasWeb || hasWhatsapp ? 6 : 0)
  );

  const scoreVisitability = clampScore(
    (localCity ? 34 : lead.city === "Alcoy" ? 8 : 18) +
      (lead.address ? 24 : 0) +
      (hasPhone ? 14 : 0) +
      (hasWhatsapp ? 14 : 0) +
      (lead.googleMapsUrl || lead.placeId ? 10 : 0) +
      (lead.ownerName || lead.reviewOwnerCandidates?.length ? 4 : 0)
  );

  const scoreFacilidadContacto = scoreVisitability;
  const scoreUrgencia = clampScore(scoreDigitalGap * 0.55 + scoreDemand * 0.28 + scoreFit * 0.17);
  const scoreDinero = scorePaymentCapacity;
  const scoreProbabilidadCierre = clampScore(
    scorePaymentCapacity * 0.28 +
      scoreUrgencia * 0.28 +
      scoreVisitability * 0.22 +
      (lead.status === "Respondió" ? 18 : lead.status === "Reunión agendada" ? 26 : lead.status === "Propuesta enviada" ? 30 : 0)
  );
  const scorePotencialMensualidad = clampScore(Math.min(100, estimateRawMonthlyValue(lead) / 10));
  const scorePrioridadVisita = scoreVisitability;
  const penalty = computeCommercialPenalty(lead, fit, {
    hasAnyContact: hasPhone || hasWhatsapp || hasWeb || Boolean(lead.googleMapsUrl),
    localCity,
    pendingEnrichment
  });
  const rawTotal =
    scoreDemand * 0.25 +
    scorePaymentCapacity * 0.25 +
    scoreDigitalGap * 0.25 +
    scoreFit * 0.15 +
    scoreVisitability * 0.1 +
    penalty;
  const scoreTotal = clampScore(rawTotal);
  const commercialTemperature = pendingEnrichment ? Math.min(scoreTotal, 44) : scoreTotal;
  const confidence = Math.max(0.15, Math.min(0.96, knownSources / 6));

  if (pendingEnrichment) {
    explanation.push("Pendiente de enriquecer: faltan fuentes suficientes para valorar temperatura.");
    tags.push("Pendiente de enriquecer");
  }

  if (reviews >= 100 && rating >= 4.3) {
    explanation.push(`${rating} estrellas y ${reviews} reseñas: demanda visible.`);
    tags.push("Demanda");
  }
  if (!hasWeb) {
    explanation.push("Sin web visible: oportunidad de landing, SEO local y medición.");
    tags.push("Sin web");
  }
  if (!hasInstagram) {
    explanation.push("Instagram ausente o no detectado: hueco para contenido audiovisual.");
    tags.push("Sin IG");
  }
  if (lead.contentUse === "Sin uso" || lead.contentUse === "Flojo") {
    explanation.push(`Contenido ${lead.contentUse.toLowerCase()}: buen ángulo audiovisual.`);
    tags.push("Hueco visual");
  }
  if (hasWhatsapp || hasPhone) {
    explanation.push("Contacto directo para WhatsApp Business y seguimiento.");
    tags.push("Contacto");
  }
  if (highFitSectors.includes(lead.sector)) {
    explanation.push("Sector con encaje para captación local, Meta Ads y contenido recurrente.");
    tags.push("Ticket alto");
  }
  if (localCity) {
    explanation.push("Está en zona de visita prioritaria para Firekworks.");
    tags.push("Ruta");
  }
  if (penalty < 0) {
    explanation.push("Penalizado por baja visitabilidad, falta de datos o encaje pendiente.");
    tags.push("Penalizado");
  }
  if (explanation.length === 0) explanation.push("Lead detectado para validar demanda, brecha digital y encaje presencial.");

  return scoreResponse({
    scoreTotal: commercialTemperature,
    demand: scoreDemand,
    paymentCapacity: scorePaymentCapacity,
    digitalGap: scoreDigitalGap,
    fit: scoreFit,
    visitability: scoreVisitability,
    penalties: penalty,
    confidence,
    scoreUrgencia,
    scoreFacilidadContacto,
    scoreProbabilidadCierre,
    scorePotencialMensualidad,
    explanation: explanation.slice(0, 5),
    tags: Array.from(new Set(tags)).slice(0, 5)
  });
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

function scoreResponse({
  scoreTotal,
  demand,
  paymentCapacity,
  digitalGap,
  fit,
  visitability,
  penalties,
  confidence,
  scoreUrgencia,
  scoreFacilidadContacto,
  scoreProbabilidadCierre,
  scorePotencialMensualidad,
  explanation,
  tags
}: {
  scoreTotal: number;
  demand: number;
  paymentCapacity: number;
  digitalGap: number;
  fit: number;
  visitability: number;
  penalties: number;
  confidence: number;
  scoreUrgencia?: number;
  scoreFacilidadContacto?: number;
  scoreProbabilidadCierre?: number;
  scorePotencialMensualidad?: number;
  explanation: string[];
  tags: string[];
}) {
  const updatedAt = new Date().toISOString();
  const urgency = scoreUrgencia ?? clampScore(digitalGap * 0.55 + demand * 0.25 + fit * 0.2);
  const contactability = scoreFacilidadContacto ?? visitability;
  const closeProbability = scoreProbabilidadCierre ?? clampScore(paymentCapacity * 0.3 + urgency * 0.3 + visitability * 0.2);
  const monthlyPotential = scorePotencialMensualidad ?? paymentCapacity;

  return {
    scoreTotal: clampScore(scoreTotal),
    scoreDemand: clampScore(demand),
    scorePaymentCapacity: clampScore(paymentCapacity),
    scoreDigitalGap: clampScore(digitalGap),
    scoreFit: clampScore(fit),
    scoreVisitability: clampScore(visitability),
    scorePenalties: penalties,
    scoreConfidence: Number(confidence.toFixed(2)),
    scoreUpdatedAt: updatedAt,
    scoreDemandaVisible: clampScore(demand),
    scorePresenciaDigital: clampScore(digitalGap),
    scoreUrgencia: urgency,
    scoreDinero: clampScore(paymentCapacity),
    scoreFacilidadContacto: contactability,
    scoreProbabilidadCierre: closeProbability,
    scorePotencialMensualidad: monthlyPotential,
    scorePrioridadVisita: clampScore(visitability),
    scoreExplanation: explanation,
    scoreTags: Array.from(new Set(tags)).filter(Boolean)
  };
}

function computeCommercialPenalty(
  lead: Omit<Lead, "score"> | Lead,
  fit: FitResult,
  flags: { hasAnyContact: boolean; localCity: boolean; pendingEnrichment: boolean }
) {
  let penalty = 0;
  const text = normalizeForFit([lead.name, lead.sector, lead.websiteTitle, lead.description].join(" "));
  const nationalChainTerms = ["mcdonald", "burger king", "mercadona", "carrefour", "lidl", "aldi", "dia ", "consum", "repsol", "cepsa", "bp "];

  if (fit.classification === "unknown") penalty -= 8;
  if (!flags.localCity) penalty -= 10;
  if (!lead.address) penalty -= 6;
  if (!flags.hasAnyContact) penalty -= 12;
  if (flags.pendingEnrichment) penalty -= 10;
  if (matchesAny(text, nationalChainTerms)) penalty -= 25;

  return Math.max(-60, penalty);
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
  if (score >= 65) return "Caliente";
  if (score >= 45) return "Revisar";
  return "Frío";
}

export function scoreTone(score: number) {
  if (score >= 80) return "priority";
  if (score >= 65) return "hot";
  if (score >= 45) return "warm";
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
  const scoreMultiplier = score >= 80 ? 1.18 : score >= 65 ? 0.78 : score >= 45 ? 0.38 : 0.12;
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
    lead.score >= 80 ? 0.16 : lead.score >= 65 ? 0.075 : lead.score >= 45 ? 0.03 : 0.01;
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
      focus: "Meta Ads, reels, carrusels, Google Business, WhatsApp y reseñas"
    };
  }

  if (monthlyValue >= 450 || lead.score >= 65) {
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
  if (lead.score >= 65) return 220;
  if (lead.score >= 45) return 120;
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
    reasons.push("Contacto directo");
  }

  if (["Castalla", "Ibi", "Onil", "Biar", "Tibi"].includes(lead.city)) {
    reasons.push("Ruta Foia");
  }

  return reasons.slice(0, 4);
}
