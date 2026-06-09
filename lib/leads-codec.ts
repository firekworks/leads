import { leads as seedLeads } from "@/lib/mock-leads";
import { classifyLeadFit, computeScoreBreakdown } from "@/lib/scoring";
import type {
  ContentUse,
  EnrichmentStatus,
  FitClassification,
  FollowersBucket,
  InstagramStatus,
  Lead,
  LeadSignals,
  LeadSource,
  LeadStatus,
  ValidationStatus
} from "@/types/lead";

export type LeadRow = {
  id: string;
  user_id?: string | null;
  name: string;
  sector: string;
  city: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  owner_name: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_url: string | null;
  logo_url: string | null;
  followers_bucket: FollowersBucket | null;
  content_use: ContentUse | null;
  website_title: string | null;
  google_maps_url: string | null;
  rating: number | null;
  reviews: number | null;
  google_photos: number | null;
  place_id: string | null;
  source: LeadSource | null;
  is_invalid: boolean | null;
  invalid_reason: string | null;
  is_disqualified?: boolean | null;
  disqualified_reason?: string | null;
  disqualified_category?: string | null;
  fit_classification?: FitClassification | null;
  manual_override?: boolean | null;
  validation_status?: ValidationStatus | null;
  instagram_status?: InstagramStatus | null;
  enrichment_status?: EnrichmentStatus | null;
  last_enriched_at?: string | null;
  last_seen_at: string | null;
  last_refreshed_at: string | null;
  review_owner_candidates: string[] | null;
  owner_user_id?: string | null;
  assigned_to?: string | null;
  client_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  next_follow_up_at?: string | null;
  next_follow_up_type?: string | null;
  status: LeadStatus | null;
  priority: Lead["priority"] | null;
  potential: number | null;
  last_contact: string | null;
  next_action: string | null;
  pain: string | null;
  diagnosis: string | null;
  problem_detected?: string | null;
  opportunity_detected?: string | null;
  sales_hook?: string | null;
  recommended_service?: string | null;
  probable_objection?: string | null;
  suggested_whatsapp_message?: string | null;
  suggested_instagram_message?: string | null;
  in_person_argument?: string | null;
  recommended_offer?: string | null;
  score: number | null;
  score_total?: number | null;
  score_demand?: number | null;
  score_payment_capacity?: number | null;
  score_digital_gap?: number | null;
  score_fit?: number | null;
  score_visitability?: number | null;
  score_penalties?: number | null;
  score_confidence?: number | null;
  score_updated_at?: string | null;
  score_presencia_digital?: number | null;
  score_urgencia?: number | null;
  score_dinero?: number | null;
  score_facilidad_contacto?: number | null;
  score_probabilidad_cierre?: number | null;
  score_potencial_mensualidad?: number | null;
  score_prioridad_visita?: number | null;
  score_explanation?: unknown;
  score_tags?: unknown;
  signals: LeadSignals | null;
  ads_signal?: string | null;
  data_quality?: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

export function normalizeLeads(rows: LeadRow[]) {
  return rows.map(fromLeadRow).map(withScore).sort(sortLeads);
}

export function normalizeLocal(leads: Lead[]) {
  return leads.map((lead) => {
    const legacy = lead as Lead & {
      instagram?: string;
      facebook?: string;
      contentUse?: string;
      placeId?: string;
      source?: LeadSource;
      isInvalid?: boolean;
      reviewOwnerCandidates?: string[];
    };
    const instagramUrl = lead.instagramUrl || normalizeSocialUrl(legacy.instagram || "", "instagram");
    const facebookUrl = lead.facebookUrl || normalizeSocialUrl(legacy.facebook || "", "facebook");
    const normalized = {
      ...lead,
      status: normalizeStatus(String(lead.status)),
      description: lead.description || "",
      ownerName: lead.ownerName || "",
      instagramUrl,
      facebookUrl,
      whatsappUrl: lead.whatsappUrl || "",
      logoUrl: lead.logoUrl || "",
      followersBucket: lead.followersBucket || "Pendiente",
      contentUse: normalizeContentUse(legacy.contentUse || lead.contentUse),
      websiteTitle: lead.websiteTitle || "",
      placeId: legacy.placeId || "",
      source: legacy.source || "manual",
      isInvalid: Boolean(legacy.isInvalid),
      invalidReason: lead.invalidReason || "",
      isDisqualified: lead.isDisqualified ?? Boolean(legacy.isInvalid),
      disqualifiedReason: lead.disqualifiedReason || lead.invalidReason || "",
      disqualifiedCategory: lead.disqualifiedCategory || "",
      fitClassification: lead.fitClassification || "unknown",
      manualOverride: Boolean(lead.manualOverride),
      validationStatus: lead.validationStatus || (legacy.isInvalid ? "descartado" : "pendiente"),
      instagramStatus: lead.instagramStatus || (instagramUrl ? "encontrado" : "pendiente"),
      enrichmentStatus: lead.enrichmentStatus || (lead.lastRefreshedAt ? "parcial" : "pendiente"),
      lastEnrichedAt: lead.lastEnrichedAt || lead.lastRefreshedAt || "",
      lastSeenAt: lead.lastSeenAt || lead.updatedAt || new Date().toISOString(),
      lastRefreshedAt: lead.lastRefreshedAt || "",
      reviewOwnerCandidates: legacy.reviewOwnerCandidates || [],
      ownerUserId: lead.ownerUserId || "",
      assignedTo: lead.assignedTo || "",
      clientId: lead.clientId || "",
      latitude: lead.latitude ?? null,
      longitude: lead.longitude ?? null,
      nextFollowUpAt: lead.nextFollowUpAt || "",
      nextFollowUpType: lead.nextFollowUpType || "",
      problemDetected: lead.problemDetected || lead.pain || "",
      opportunityDetected: lead.opportunityDetected || lead.diagnosis || "",
      salesHook: lead.salesHook || "",
      recommendedService: lead.recommendedService || "",
      probableObjection: lead.probableObjection || "",
      suggestedWhatsappMessage: lead.suggestedWhatsappMessage || "",
      suggestedInstagramMessage: lead.suggestedInstagramMessage || "",
      inPersonArgument: lead.inPersonArgument || "",
      recommendedOffer: lead.recommendedOffer || "",
      scoreTotal: lead.scoreTotal || lead.score || 0,
      scoreDemand: lead.scoreDemand || lead.scoreDemandaVisible || 0,
      scorePaymentCapacity: lead.scorePaymentCapacity || lead.scoreDinero || 0,
      scoreDigitalGap: lead.scoreDigitalGap || lead.scorePresenciaDigital || 0,
      scoreFit: lead.scoreFit || 0,
      scoreVisitability: lead.scoreVisitability || lead.scorePrioridadVisita || 0,
      scorePenalties: lead.scorePenalties || 0,
      scoreConfidence: lead.scoreConfidence || 0,
      scoreUpdatedAt: lead.scoreUpdatedAt || "",
      scorePresenciaDigital: lead.scorePresenciaDigital || 0,
      scoreUrgencia: lead.scoreUrgencia || 0,
      scoreDinero: lead.scoreDinero || 0,
      scoreFacilidadContacto: lead.scoreFacilidadContacto || 0,
      scoreProbabilidadCierre: lead.scoreProbabilidadCierre || 0,
      scorePotencialMensualidad: lead.scorePotencialMensualidad || 0,
      scorePrioridadVisita: lead.scorePrioridadVisita || 0,
      scoreExplanation: lead.scoreExplanation || [],
      scoreTags: lead.scoreTags || [],
      adsSignal: lead.adsSignal || "",
      dataQuality: lead.dataQuality || {},
      signals: inferSignals({
        ...lead,
        instagram_url: instagramUrl,
        facebook_url: facebookUrl,
        whatsapp_url: lead.whatsappUrl,
        google_maps_url: lead.googleMapsUrl,
        google_photos: lead.googlePhotos
      } as Partial<LeadRow>)
    } as Lead;

    return withScore(normalized);
  }).sort(sortLeads);
}

export function fromLeadRow(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector,
    city: row.city,
    address: row.address || "",
    phone: row.phone || "",
    website: row.website || "",
    description: row.description || "",
    ownerName: row.owner_name || "",
    instagramUrl: row.instagram_url || "",
    facebookUrl: row.facebook_url || "",
    whatsappUrl: row.whatsapp_url || "",
    logoUrl: row.logo_url || "",
    followersBucket: row.followers_bucket || "Pendiente",
    contentUse: normalizeContentUse(row.content_use || "Pendiente"),
    websiteTitle: row.website_title || "",
    googleMapsUrl: row.google_maps_url || "",
    rating: Number(row.rating || 0),
    reviews: Number(row.reviews || 0),
    googlePhotos: Number(row.google_photos || 0),
    placeId: row.place_id || "",
    source: row.source || "manual",
    isInvalid: Boolean(row.is_invalid || row.is_disqualified),
    invalidReason: row.invalid_reason || row.disqualified_reason || "",
    isDisqualified: Boolean(row.is_disqualified || row.is_invalid),
    disqualifiedReason: row.disqualified_reason || row.invalid_reason || "",
    disqualifiedCategory: row.disqualified_category || "",
    fitClassification: normalizeFitClassification(row.fit_classification || "unknown"),
    manualOverride: Boolean(row.manual_override),
    validationStatus: normalizeValidationStatus(row.validation_status || (row.is_invalid || row.is_disqualified ? "descartado" : "pendiente")),
    instagramStatus: normalizeInstagramStatus(row.instagram_status || (row.instagram_url ? "encontrado" : "pendiente")),
    enrichmentStatus: normalizeEnrichmentStatus(row.enrichment_status || (row.last_refreshed_at ? "parcial" : "pendiente")),
    lastEnrichedAt: row.last_enriched_at || row.last_refreshed_at || "",
    lastSeenAt: row.last_seen_at || row.updated_at || new Date().toISOString(),
    lastRefreshedAt: row.last_refreshed_at || "",
    reviewOwnerCandidates: row.review_owner_candidates || [],
    ownerUserId: row.owner_user_id || "",
    assignedTo: row.assigned_to || "",
    clientId: row.client_id || "",
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    nextFollowUpAt: row.next_follow_up_at || "",
    nextFollowUpType: row.next_follow_up_type || "",
    status: row.status || "Detectado",
    priority: row.priority || "Media",
    potential: Number(row.potential || 0),
    lastContact: row.last_contact || "Sin contacto",
    nextAction: row.next_action || "",
    pain: row.pain || "",
    diagnosis: row.diagnosis || "",
    problemDetected: row.problem_detected || row.pain || "",
    opportunityDetected: row.opportunity_detected || row.diagnosis || "",
    salesHook: row.sales_hook || "",
    recommendedService: row.recommended_service || "",
    probableObjection: row.probable_objection || "",
    suggestedWhatsappMessage: row.suggested_whatsapp_message || "",
    suggestedInstagramMessage: row.suggested_instagram_message || "",
    inPersonArgument: row.in_person_argument || "",
    recommendedOffer: row.recommended_offer || "",
    score: Number(row.score || 0),
    scoreTotal: Number(row.score_total || row.score || 0),
    scoreDemand: Number(row.score_demand ?? row.score_total ?? row.score ?? 0),
    scorePaymentCapacity: Number(row.score_payment_capacity ?? row.score_dinero ?? 0),
    scoreDigitalGap: Number(row.score_digital_gap ?? row.score_presencia_digital ?? 0),
    scoreFit: Number(row.score_fit ?? 0),
    scoreVisitability: Number(row.score_visitability ?? row.score_prioridad_visita ?? 0),
    scorePenalties: Number(row.score_penalties ?? 0),
    scoreConfidence: Number(row.score_confidence ?? 0),
    scoreUpdatedAt: row.score_updated_at || "",
    scorePresenciaDigital: Number(row.score_presencia_digital || 0),
    scoreUrgencia: Number(row.score_urgencia || 0),
    scoreDinero: Number(row.score_dinero || 0),
    scoreFacilidadContacto: Number(row.score_facilidad_contacto || 0),
    scoreProbabilidadCierre: Number(row.score_probabilidad_cierre || 0),
    scorePotencialMensualidad: Number(row.score_potencial_mensualidad || 0),
    scorePrioridadVisita: Number(row.score_prioridad_visita || 0),
    scoreExplanation: normalizeStringArray(row.score_explanation),
    scoreTags: normalizeStringArray(row.score_tags),
    signals: row.signals || inferSignals(row),
    adsSignal: row.ads_signal || "",
    dataQuality: row.data_quality || {},
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

export function toLeadRow(lead: Lead): LeadRow {
  const normalized = withScore({
    ...lead,
    contentUse: normalizeContentUse(lead.contentUse),
    signals: inferSignals({
      ...lead,
      instagram_url: lead.instagramUrl,
      facebook_url: lead.facebookUrl,
      whatsapp_url: lead.whatsappUrl,
      google_maps_url: lead.googleMapsUrl,
      google_photos: lead.googlePhotos
    } as Partial<LeadRow>)
  });

  return {
    id: normalized.id,
    user_id: null,
    name: normalized.name,
    sector: normalized.sector,
    city: normalized.city,
    address: normalized.address,
    phone: normalized.phone,
    website: normalized.website,
    description: normalized.description,
    owner_name: normalized.ownerName,
    instagram_url: normalized.instagramUrl,
    facebook_url: normalized.facebookUrl,
    whatsapp_url: normalized.whatsappUrl,
    logo_url: normalized.logoUrl,
    followers_bucket: normalized.followersBucket,
    content_use: normalized.contentUse,
    website_title: normalized.websiteTitle,
    google_maps_url: normalized.googleMapsUrl,
    rating: normalized.rating,
    reviews: normalized.reviews,
    google_photos: normalized.googlePhotos,
    place_id: normalized.placeId,
    source: normalized.source,
    is_invalid: normalized.isInvalid || Boolean(normalized.isDisqualified),
    invalid_reason: normalized.invalidReason || normalized.disqualifiedReason || "",
    is_disqualified: normalized.isInvalid || Boolean(normalized.isDisqualified),
    disqualified_reason: normalized.disqualifiedReason || normalized.invalidReason || "",
    disqualified_category: normalized.disqualifiedCategory || "",
    fit_classification: normalized.fitClassification || "unknown",
    manual_override: Boolean(normalized.manualOverride),
    validation_status: normalizeValidationStatus(normalized.validationStatus || (normalized.isInvalid ? "descartado" : "pendiente")),
    instagram_status: normalizeInstagramStatus(normalized.instagramStatus || (normalized.instagramUrl ? "encontrado" : "pendiente")),
    enrichment_status: normalizeEnrichmentStatus(normalized.enrichmentStatus || (normalized.lastRefreshedAt ? "parcial" : "pendiente")),
    last_enriched_at: normalized.lastEnrichedAt || normalized.lastRefreshedAt || null,
    last_seen_at: normalized.lastSeenAt || new Date().toISOString(),
    last_refreshed_at: normalized.lastRefreshedAt,
    review_owner_candidates: normalized.reviewOwnerCandidates,
    owner_user_id: normalized.ownerUserId || null,
    assigned_to: normalized.assignedTo || null,
    client_id: normalized.clientId || null,
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    next_follow_up_at: normalized.nextFollowUpAt || null,
    next_follow_up_type: normalized.nextFollowUpType,
    status: normalized.status,
    priority: normalized.priority,
    potential: normalized.potential,
    last_contact: normalized.lastContact,
    next_action: normalized.nextAction,
    pain: normalized.pain,
    diagnosis: normalized.diagnosis,
    problem_detected: normalized.problemDetected,
    opportunity_detected: normalized.opportunityDetected,
    sales_hook: normalized.salesHook,
    recommended_service: normalized.recommendedService,
    probable_objection: normalized.probableObjection,
    suggested_whatsapp_message: normalized.suggestedWhatsappMessage,
    suggested_instagram_message: normalized.suggestedInstagramMessage,
    in_person_argument: normalized.inPersonArgument,
    recommended_offer: normalized.recommendedOffer,
    score: normalized.score,
    score_total: normalized.scoreTotal,
    score_demand: normalized.scoreDemand,
    score_payment_capacity: normalized.scorePaymentCapacity,
    score_digital_gap: normalized.scoreDigitalGap,
    score_fit: normalized.scoreFit,
    score_visitability: normalized.scoreVisitability,
    score_penalties: normalized.scorePenalties,
    score_confidence: normalized.scoreConfidence,
    score_updated_at: normalized.scoreUpdatedAt || new Date().toISOString(),
    score_presencia_digital: normalized.scorePresenciaDigital,
    score_urgencia: normalized.scoreUrgencia,
    score_dinero: normalized.scoreDinero,
    score_facilidad_contacto: normalized.scoreFacilidadContacto,
    score_probabilidad_cierre: normalized.scoreProbabilidadCierre,
    score_potencial_mensualidad: normalized.scorePotencialMensualidad,
    score_prioridad_visita: normalized.scorePrioridadVisita,
    score_explanation: normalized.scoreExplanation,
    score_tags: normalized.scoreTags,
    signals: normalized.signals,
    ads_signal: normalized.adsSignal,
    data_quality: normalized.dataQuality,
    created_at: normalized.createdAt,
    updated_at: new Date().toISOString()
  };
}

export function withScore<T extends Omit<Lead, "score"> | Lead>(lead: T): Lead {
  const contentUse = normalizeContentUse("contentUse" in lead ? lead.contentUse : "Pendiente");
  const signals = inferSignals({
    ...lead,
    instagram_url: "instagramUrl" in lead ? lead.instagramUrl : "",
    facebook_url: "facebookUrl" in lead ? lead.facebookUrl : "",
    whatsapp_url: "whatsappUrl" in lead ? lead.whatsappUrl : "",
    google_maps_url: "googleMapsUrl" in lead ? lead.googleMapsUrl : "",
    google_photos: "googlePhotos" in lead ? lead.googlePhotos : 0
  } as Partial<LeadRow>);

  const existingInvalid = "isInvalid" in lead ? Boolean(lead.isInvalid) : false;
  const existingDisqualified = "isDisqualified" in lead ? Boolean(lead.isDisqualified) : existingInvalid;
  const manualOverride = "manualOverride" in lead ? Boolean(lead.manualOverride) : false;
  const fit = classifyLeadFit({ ...lead, contentUse, signals } as Lead);
  const shouldDisqualify = !manualOverride && (fit.disqualified || existingInvalid || existingDisqualified);
  const disqualifiedReason =
    shouldDisqualify
      ? ("disqualifiedReason" in lead && lead.disqualifiedReason) ||
        ("invalidReason" in lead && lead.invalidReason) ||
        fit.reason
      : "disqualifiedReason" in lead
        ? lead.disqualifiedReason
        : "invalidReason" in lead
          ? lead.invalidReason
          : "";
  const disqualifiedCategory =
    shouldDisqualify
      ? ("disqualifiedCategory" in lead && lead.disqualifiedCategory) || fit.classification
      : "disqualifiedCategory" in lead
        ? lead.disqualifiedCategory
        : "";

  const current = {
    ...lead,
    contentUse,
    placeId: "placeId" in lead ? lead.placeId : "",
    source: "source" in lead ? lead.source : "manual",
    isInvalid: shouldDisqualify,
    invalidReason: shouldDisqualify ? disqualifiedReason : "invalidReason" in lead ? lead.invalidReason : "",
    isDisqualified: shouldDisqualify,
    disqualifiedReason,
    disqualifiedCategory,
    fitClassification:
      shouldDisqualify || !("fitClassification" in lead)
        ? fit.classification
        : normalizeFitClassification(lead.fitClassification || fit.classification),
    manualOverride,
    validationStatus:
      shouldDisqualify ? "descartado" : "validationStatus" in lead ? normalizeValidationStatus(lead.validationStatus || "pendiente") : "pendiente",
    instagramStatus:
      "instagramStatus" in lead
        ? normalizeInstagramStatus(lead.instagramStatus || "pendiente")
        : "instagramUrl" in lead && lead.instagramUrl
          ? "encontrado"
          : "pendiente",
    enrichmentStatus:
      "enrichmentStatus" in lead ? normalizeEnrichmentStatus(lead.enrichmentStatus || "pendiente") : "pendiente",
    lastEnrichedAt: "lastEnrichedAt" in lead ? lead.lastEnrichedAt : "",
    lastSeenAt: "lastSeenAt" in lead ? lead.lastSeenAt : new Date().toISOString(),
    lastRefreshedAt: "lastRefreshedAt" in lead ? lead.lastRefreshedAt : "",
    reviewOwnerCandidates: "reviewOwnerCandidates" in lead ? lead.reviewOwnerCandidates : [],
    signals,
    ownerUserId: "ownerUserId" in lead ? lead.ownerUserId : "",
    assignedTo: "assignedTo" in lead ? lead.assignedTo : "",
    clientId: "clientId" in lead ? lead.clientId : "",
    latitude: "latitude" in lead ? lead.latitude : null,
    longitude: "longitude" in lead ? lead.longitude : null,
    nextFollowUpAt: "nextFollowUpAt" in lead ? lead.nextFollowUpAt : "",
    nextFollowUpType: "nextFollowUpType" in lead ? lead.nextFollowUpType : "",
    problemDetected: "problemDetected" in lead ? lead.problemDetected : "pain" in lead ? lead.pain : "",
    opportunityDetected: "opportunityDetected" in lead ? lead.opportunityDetected : "diagnosis" in lead ? lead.diagnosis : "",
    salesHook: "salesHook" in lead ? lead.salesHook : "",
    recommendedService: "recommendedService" in lead ? lead.recommendedService : "",
    probableObjection: "probableObjection" in lead ? lead.probableObjection : "",
    suggestedWhatsappMessage: "suggestedWhatsappMessage" in lead ? lead.suggestedWhatsappMessage : "",
    suggestedInstagramMessage: "suggestedInstagramMessage" in lead ? lead.suggestedInstagramMessage : "",
    inPersonArgument: "inPersonArgument" in lead ? lead.inPersonArgument : "",
    recommendedOffer: "recommendedOffer" in lead ? lead.recommendedOffer : "",
    status:
      shouldDisqualify && (!("status" in lead) || lead.status !== "Perdido")
        ? "No contactar"
        : "status" in lead
          ? normalizeStatus(String(lead.status))
          : "Detectado",
    scoreTags: "scoreTags" in lead ? lead.scoreTags : [],
    adsSignal: "adsSignal" in lead ? lead.adsSignal : "",
    dataQuality: "dataQuality" in lead ? lead.dataQuality : {}
  } as Lead;

  const breakdown = computeScoreBreakdown(current);

  return {
    ...current,
    score: breakdown.scoreTotal,
    ...breakdown
  };
}

export function inferSignals(row: Partial<LeadRow>) {
  const website = "website" in row ? row.website : "";
  const instagram = row.instagram_url || "";
  const facebook = row.facebook_url || "";
  const whatsapp = row.whatsapp_url || "";
  const googleMaps = row.google_maps_url || "";
  const googlePhotos = Number(row.google_photos || 0);

  return {
    web: Boolean(website),
    instagram: Boolean(instagram),
    facebook: Boolean(facebook),
    whatsapp: Boolean(whatsapp),
    photos: googlePhotos > 0,
    googleProfile: Boolean(googleMaps)
  };
}

export function normalizeStatus(status: string): LeadStatus {
  const legacy: Record<string, LeadStatus> = {
    "No contactado": "Detectado",
    Visitado: "Reunión agendada",
    Propuesta: "Propuesta enviada",
    Descargado: "No contactar",
    Descartado: "No contactar",
    Interesado: "Respondió",
    "Visita/Reunión": "Reunión agendada",
    Cliente: "Ganado",
    Desinteresado: "Perdido"
  };

  const allowed: LeadStatus[] = [
    "Detectado",
    "Validado",
    "Prioritario",
    "Contactado",
    "Respondió",
    "Reunión agendada",
    "Diagnóstico hecho",
    "Propuesta enviada",
    "Negociación",
    "Ganado",
    "Perdido",
    "No encaja",
    "No contactar"
  ];

  return legacy[status] || (allowed.includes(status as LeadStatus) ? (status as LeadStatus) : "Detectado");
}

export function normalizeContentUse(value: string): ContentUse {
  const legacy: Record<string, ContentUse> = {
    "Sin redes": "Sin uso",
    Abandonado: "Sin uso",
    "Básico": "Flojo",
    Basico: "Flojo",
    Fuerte: "Muy trabajado"
  };
  const allowed: ContentUse[] = ["Pendiente", "Sin uso", "Flojo", "Activo", "Muy trabajado"];

  return legacy[value] || (allowed.includes(value as ContentUse) ? (value as ContentUse) : "Pendiente");
}

export function normalizeValidationStatus(value: string): ValidationStatus {
  const allowed: ValidationStatus[] = ["pendiente", "validado", "descartado", "duplicado", "revisar"];
  return allowed.includes(value as ValidationStatus) ? (value as ValidationStatus) : "pendiente";
}

export function normalizeInstagramStatus(value: string): InstagramStatus {
  const allowed: InstagramStatus[] = ["pendiente", "encontrado", "sin_cuenta", "manual", "revisar"];
  return allowed.includes(value as InstagramStatus) ? (value as InstagramStatus) : "pendiente";
}

export function normalizeEnrichmentStatus(value: string): EnrichmentStatus {
  const allowed: EnrichmentStatus[] = ["pendiente", "parcial", "completo", "error"];
  return allowed.includes(value as EnrichmentStatus) ? (value as EnrichmentStatus) : "pendiente";
}

export function normalizeFitClassification(value: string): FitClassification {
  const allowed: FitClassification[] = [
    "valid_client_candidate",
    "public_entity",
    "tourism_public",
    "healthcare_public",
    "education_public",
    "emergency_service",
    "government",
    "duplicate",
    "low_fit",
    "unknown"
  ];
  return allowed.includes(value as FitClassification) ? (value as FitClassification) : "unknown";
}

export function normalizeSocialUrl(value: string, network: "instagram" | "facebook") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http")) return trimmed;

  const handle = trimmed.replace(/^@/, "");
  return network === "instagram"
    ? `https://instagram.com/${handle}`
    : `https://facebook.com/search/top?q=${encodeURIComponent(handle)}`;
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export function seedRows() {
  return seedLeads.map(toLeadRow);
}

export function sortLeads(a: Lead, b: Lead) {
  if (a.isInvalid !== b.isInvalid) return a.isInvalid ? 1 : -1;
  return b.score - a.score;
}
