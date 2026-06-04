import { leads as seedLeads } from "@/lib/mock-leads";
import { computeScore } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/client";
import type { ContentUse, FollowersBucket, Lead, LeadSignals, LeadStatus } from "@/types/lead";

const STORAGE_KEY = "firekworks-leads-v4";

type LeadRow = {
  id: string;
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

export type LeadsSource = "supabase" | "localStorage";

export type LeadsLoadResult = {
  leads: Lead[];
  source: LeadsSource;
  error?: string;
};

export async function loadLeads(): Promise<LeadsLoadResult> {
  const supabase = createClient();

  if (!supabase) {
    return { leads: loadLocalLeads(), source: "localStorage", error: "Supabase no configurado" };
  }

  try {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("score", { ascending: false });

    if (error) throw error;

    if (!data?.length) {
      const rows = seedLeads.map(toLeadRow);
      const { data: seeded, error: seedError } = await supabase
        .from("leads")
        .insert(rows)
        .select("*")
        .order("score", { ascending: false });

      if (seedError) throw seedError;

      const seededLeads = normalizeLeads((seeded || []) as LeadRow[]);
      saveLocalLeads(seededLeads);
      return { leads: seededLeads, source: "supabase" };
    }

    const remoteLeads = normalizeLeads(data as LeadRow[]);
    saveLocalLeads(remoteLeads);
    return { leads: remoteLeads, source: "supabase" };
  } catch (error) {
    return {
      leads: loadLocalLeads(),
      source: "localStorage",
      error: error instanceof Error ? error.message : "Supabase no disponible"
    };
  }
}

export async function persistLead(lead: Lead) {
  const scoredLead = withScore(lead);
  const localLeads = upsertLocalLead(scoredLead);
  const supabase = createClient();

  if (!supabase) {
    return { lead: scoredLead, leads: localLeads, source: "localStorage" as LeadsSource };
  }

  try {
    const { error } = await supabase.from("leads").upsert(toLeadRow(scoredLead));
    if (error) throw error;
    return { lead: scoredLead, leads: localLeads, source: "supabase" as LeadsSource };
  } catch {
    return { lead: scoredLead, leads: localLeads, source: "localStorage" as LeadsSource };
  }
}

export async function persistLeads(leads: Lead[]) {
  const scoredLeads = leads.map(withScore).sort((a, b) => b.score - a.score);
  saveLocalLeads(scoredLeads);

  const supabase = createClient();
  if (!supabase) return { leads: scoredLeads, source: "localStorage" as LeadsSource };

  try {
    const { error } = await supabase.from("leads").upsert(scoredLeads.map(toLeadRow));
    if (error) throw error;
    return { leads: scoredLeads, source: "supabase" as LeadsSource };
  } catch {
    return { leads: scoredLeads, source: "localStorage" as LeadsSource };
  }
}

export function createBlankLead(): Lead {
  const now = new Date().toISOString();
  const lead: Omit<Lead, "score"> = {
    id: `lead-${Date.now()}`,
    name: "Nuevo lead",
    sector: "Restaurantes",
    city: "Castalla",
    address: "",
    phone: "",
    website: "",
    description: "",
    ownerName: "",
    instagramUrl: "",
    facebookUrl: "",
    whatsappUrl: "",
    logoUrl: "",
    followersBucket: "Pendiente",
    contentUse: "Pendiente",
    websiteTitle: "",
    googleMapsUrl: "",
    rating: 0,
    reviews: 0,
    googlePhotos: 0,
    status: "Detectado",
    priority: "Media",
    potential: 500,
    lastContact: "Sin contacto",
    nextAction: "",
    pain: "",
    diagnosis: "",
    signals: {
      web: false,
      instagram: false,
      facebook: false,
      whatsapp: false,
      photos: false,
      googleProfile: false
    },
    createdAt: now,
    updatedAt: now
  };

  return withScore(lead);
}

export function exportLeadsToCsv(leads: Lead[]) {
  const headers: Array<keyof Lead> = [
    "name",
    "sector",
    "city",
    "status",
    "score",
    "followersBucket",
    "contentUse",
    "website",
    "instagramUrl",
    "facebookUrl",
    "whatsappUrl",
    "phone",
    "ownerName",
    "description",
    "nextAction"
  ];

  const rows = leads.map((lead) =>
    headers.map((key) => csvCell(String(lead[key] ?? ""))).join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `firekworks-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function googleSearchUrls(lead: Pick<Lead, "name" | "city">) {
  const base = `${lead.name} ${lead.city}`.trim();

  return {
    instagram: `https://www.google.com/search?q=${encodeURIComponent(`${base} instagram`)}`,
    facebook: `https://www.google.com/search?q=${encodeURIComponent(`${base} facebook`)}`,
    owner: `https://www.google.com/search?q=${encodeURIComponent(`${base} dueño gerente`)}`
  };
}

function normalizeLeads(rows: LeadRow[]) {
  return rows.map(fromLeadRow).map(withScore).sort((a, b) => b.score - a.score);
}

function fromLeadRow(row: LeadRow): Lead {
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
    contentUse: row.content_use || "Pendiente",
    websiteTitle: row.website_title || "",
    googleMapsUrl: row.google_maps_url || "",
    rating: Number(row.rating || 0),
    reviews: Number(row.reviews || 0),
    googlePhotos: Number(row.google_photos || 0),
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

function toLeadRow(lead: Lead): LeadRow {
  const normalized = withScore({
    ...lead,
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

function loadLocalLeads() {
  if (typeof window === "undefined") return seedLeads;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveLocalLeads(seedLeads);
      return seedLeads;
    }

    return normalizeLocal(JSON.parse(raw) as Lead[]);
  } catch {
    saveLocalLeads(seedLeads);
    return seedLeads;
  }
}

function saveLocalLeads(leads: Lead[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads.map(withScore)));
}

function upsertLocalLead(lead: Lead) {
  const current = loadLocalLeads();
  const next = current.some((item) => item.id === lead.id)
    ? current.map((item) => (item.id === lead.id ? lead : item))
    : [lead, ...current];
  const sorted = next.map(withScore).sort((a, b) => b.score - a.score);
  saveLocalLeads(sorted);
  return sorted;
}

function normalizeLocal(leads: Lead[]) {
  return leads.map((lead) => {
    const legacy = lead as Lead & { instagram?: string; facebook?: string };
    const normalized = {
      ...lead,
      status: normalizeStatus(String(lead.status)),
      description: lead.description || "",
      ownerName: lead.ownerName || "",
      instagramUrl: lead.instagramUrl || normalizeSocialUrl(legacy.instagram || "", "instagram"),
      facebookUrl: lead.facebookUrl || normalizeSocialUrl(legacy.facebook || "", "facebook"),
      whatsappUrl: lead.whatsappUrl || "",
      logoUrl: lead.logoUrl || "",
      followersBucket: lead.followersBucket || "Pendiente",
      contentUse: lead.contentUse || "Pendiente",
      websiteTitle: lead.websiteTitle || "",
      signals: inferSignals({
        ...lead,
        instagram_url: lead.instagramUrl || normalizeSocialUrl(legacy.instagram || "", "instagram"),
        facebook_url: lead.facebookUrl || normalizeSocialUrl(legacy.facebook || "", "facebook"),
        whatsapp_url: lead.whatsappUrl,
        google_maps_url: lead.googleMapsUrl,
        google_photos: lead.googlePhotos
      } as Partial<LeadRow>)
    } as Lead;

    return withScore(normalized);
  });
}

function withScore<T extends Omit<Lead, "score"> | Lead>(lead: T): Lead {
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
    signals,
    score: computeScore({ ...lead, signals } as Lead)
  } as Lead;
}

function inferSignals(row: Partial<LeadRow>) {
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

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function normalizeStatus(status: string): LeadStatus {
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

function normalizeSocialUrl(value: string, network: "instagram" | "facebook") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http")) return trimmed;

  const handle = trimmed.replace(/^@/, "");
  return network === "instagram"
    ? `https://instagram.com/${handle}`
    : `https://facebook.com/search/top?q=${encodeURIComponent(handle)}`;
}
