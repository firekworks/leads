export type LeadStatus =
  | "Detectado"
  | "Validado"
  | "Prioritario"
  | "Contactado"
  | "Respondió"
  | "Reunión agendada"
  | "Diagnóstico hecho"
  | "Propuesta enviada"
  | "Negociación"
  | "Ganado"
  | "Perdido"
  | "No encaja"
  | "No contactar";

export type LeadPriority = "Muy alta" | "Alta" | "Media" | "Baja";

export type LeadSector = string;

export type LeadCity = string;

export type FollowersBucket =
  | "Pendiente"
  | "Sin cuenta"
  | "< 1.000"
  | "1.000 - 5.000"
  | "+5.000";

export type ContentUse =
  | "Pendiente"
  | "Sin uso"
  | "Flojo"
  | "Activo"
  | "Muy trabajado";

export type LeadSource = "manual" | "google_places" | "importado" | "web";
export type ValidationStatus = "pendiente" | "validado" | "descartado" | "duplicado" | "revisar";
export type InstagramStatus = "pendiente" | "encontrado" | "sin_cuenta" | "manual" | "revisar";
export type EnrichmentStatus = "pendiente" | "parcial" | "completo" | "error";
export type FitClassification =
  | "valid_client_candidate"
  | "public_entity"
  | "tourism_public"
  | "healthcare_public"
  | "education_public"
  | "emergency_service"
  | "government"
  | "duplicate"
  | "low_fit"
  | "unknown";

export type LeadSignals = {
  web: boolean;
  instagram: boolean;
  facebook: boolean;
  whatsapp: boolean;
  photos: boolean;
  googleProfile: boolean;
};

export type Lead = {
  id: string;
  name: string;
  sector: LeadSector;
  city: LeadCity;
  address: string;
  phone: string;
  website: string;
  description: string;
  ownerName: string;
  instagramUrl: string;
  facebookUrl: string;
  whatsappUrl: string;
  logoUrl: string;
  followersBucket: FollowersBucket;
  contentUse: ContentUse;
  websiteTitle: string;
  googleMapsUrl: string;
  rating: number;
  reviews: number;
  googlePhotos: number;
  placeId: string;
  source: LeadSource;
  isInvalid: boolean;
  invalidReason: string;
  isDisqualified?: boolean;
  disqualifiedReason?: string;
  disqualifiedCategory?: string;
  fitClassification?: FitClassification;
  manualOverride?: boolean;
  validationStatus?: ValidationStatus;
  instagramStatus?: InstagramStatus;
  enrichmentStatus?: EnrichmentStatus;
  lastEnrichedAt?: string;
  lastSeenAt: string;
  lastRefreshedAt: string;
  reviewOwnerCandidates: string[];
  ownerUserId?: string;
  assignedTo?: string;
  clientId?: string;
  latitude?: number | null;
  longitude?: number | null;
  nextFollowUpAt?: string;
  nextFollowUpType?: string;
  status: LeadStatus;
  priority: LeadPriority;
  potential: number;
  lastContact: string;
  nextAction: string;
  pain: string;
  diagnosis: string;
  problemDetected?: string;
  opportunityDetected?: string;
  salesHook?: string;
  recommendedService?: string;
  probableObjection?: string;
  suggestedWhatsappMessage?: string;
  suggestedInstagramMessage?: string;
  inPersonArgument?: string;
  recommendedOffer?: string;
  score: number;
  scoreTotal?: number;
  scorePresenciaDigital?: number;
  scoreUrgencia?: number;
  scoreDinero?: number;
  scoreFacilidadContacto?: number;
  scoreProbabilidadCierre?: number;
  scorePotencialMensualidad?: number;
  scorePrioridadVisita?: number;
  scoreExplanation?: string[];
  scoreTags?: string[];
  signals: LeadSignals;
  adsSignal?: string;
  dataQuality?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type LeadActivity = {
  id: string;
  leadId: string;
  userId: string;
  type: "llamada" | "WhatsApp" | "email" | "Instagram" | "visita" | "reunión" | "propuesta" | "nota" | "sistema";
  occurredAt: string;
  result: string;
  nextAction: string;
  reminderAt: string;
  fileUrl: string;
  createdAt: string;
};

export type LeadTask = {
  id: string;
  leadId: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  dueAt: string;
  priority: LeadPriority;
  status: "pendiente" | "hecha" | "pospuesta" | "cancelada";
  completedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadNote = {
  id: string;
  leadId: string;
  userId: string;
  note: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  leadId: string;
  name: string;
  sector: string;
  city: string;
  phone: string;
  website: string;
  billingName: string;
  taxId: string;
  billingEmail: string;
  billingAddress: string;
  status: "Pendiente datos fiscales" | "Activo" | "Pausado" | "Baja";
  createdAt: string;
  updatedAt: string;
};

export type RouteStop = Lead & {
  visitOrder: number;
  routeReason: string;
};
