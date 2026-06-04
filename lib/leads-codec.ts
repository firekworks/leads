import { leads as seedLeads } from "@/lib/mock-leads";
import { computeScore } from "@/lib/scoring";
import type { ContentUse, FollowersBucket, Lead, LeadSignals, LeadSource, LeadStatus } from "@/types/lead";

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
  last_seen_at: string | null;
  last_refreshed_at: string | null;
  review_owner_candidates: string[] | null;
  status: LeadStatus | null;
  priority: Lead["priority"] | null;
  potential: number | null;
  last_contact: string | null;
  next_action: string | null;
  pain: string | null;
  diagnosis: string | null;
  score: number | null;
  signals: LeadSignals | null;
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
      lastSeenAt: lead.lastSeenAt || lead.updatedAt || new Date().toISOString(),
      lastRefreshedAt: lead.lastRefreshedAt || "",
      reviewOwnerCandidates: legacy.reviewOwnerCandidates || [],
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
    isInvalid: Boolean(row.is_invalid),
    invalidReason: row.invalid_reason || "",
    lastSeenAt: row.last_seen_at || row.updated_at || new Date().toISOString(),
    lastRefreshedAt: row.last_refreshed_at || "",
    reviewOwnerCandidates: row.review_owner_candidates || [],
    status: row.status || "Detectado",
    priority: row.priority || "Media",
    potential: Number(row.potential || 0),
    lastContact: row.last_contact || "Sin contacto",
    nextAction: row.next_action || "",
    pain: row.pain || "",
    diagnosis: row.diagnosis || "",
    score: Number(row.score || 0),
    signals: row.signals || inferSignals(row),
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
    is_invalid: normalized.isInvalid,
    invalid_reason: normalized.invalidReason,
    last_seen_at: normalized.lastSeenAt || new Date().toISOString(),
    last_refreshed_at: normalized.lastRefreshedAt,
    review_owner_candidates: normalized.reviewOwnerCandidates,
    status: normalized.status,
    priority: normalized.priority,
    potential: normalized.potential,
    last_contact: normalized.lastContact,
    next_action: normalized.nextAction,
    pain: normalized.pain,
    diagnosis: normalized.diagnosis,
    score: normalized.score,
    signals: normalized.signals,
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

  return {
    ...lead,
    contentUse,
    placeId: "placeId" in lead ? lead.placeId : "",
    source: "source" in lead ? lead.source : "manual",
    isInvalid: "isInvalid" in lead ? lead.isInvalid : false,
    invalidReason: "invalidReason" in lead ? lead.invalidReason : "",
    lastSeenAt: "lastSeenAt" in lead ? lead.lastSeenAt : new Date().toISOString(),
    lastRefreshedAt: "lastRefreshedAt" in lead ? lead.lastRefreshedAt : "",
    reviewOwnerCandidates: "reviewOwnerCandidates" in lead ? lead.reviewOwnerCandidates : [],
    signals,
    score: computeScore({ ...lead, contentUse, signals } as Lead)
  } as Lead;
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
    Visitado: "Visita/Reunión",
    Propuesta: "Negociación",
    Perdido: "Descartado"
  };

  const allowed: LeadStatus[] = [
    "Descartado",
    "Detectado",
    "Validado",
    "Interesado",
    "Visita/Reunión",
    "Negociación",
    "Cliente",
    "Desinteresado"
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

export function normalizeSocialUrl(value: string, network: "instagram" | "facebook") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http")) return trimmed;

  const handle = trimmed.replace(/^@/, "");
  return network === "instagram"
    ? `https://instagram.com/${handle}`
    : `https://facebook.com/search/top?q=${encodeURIComponent(handle)}`;
}

export function seedRows() {
  return seedLeads.map(toLeadRow);
}

export function sortLeads(a: Lead, b: Lead) {
  if (a.isInvalid !== b.isInvalid) return a.isInvalid ? 1 : -1;
  return b.score - a.score;
}
