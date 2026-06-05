import { leads as seedLeads } from "@/lib/mock-leads";
import { normalizeLocal, sortLeads, withScore } from "@/lib/leads-codec";
import type { Lead } from "@/types/lead";

const STORAGE_KEY = "firekworks-leads-v5";

export type LeadsSource = "supabase" | "localStorage";

export type LeadsLoadResult = {
  leads: Lead[];
  source: LeadsSource;
  error?: string;
};

type LeadsApiResponse = {
  leads?: Lead[];
  lead?: Lead;
  error?: string;
};

export async function loadLeads(accessToken?: string): Promise<LeadsLoadResult> {
  try {
    const response = await fetch("/api/leads", {
      cache: "no-store",
      headers: authHeaders(accessToken)
    });
    const payload = (await response.json()) as LeadsApiResponse;

    if (!response.ok || !payload.leads) {
      throw new Error(payload.error || "Supabase no disponible");
    }

    const leads = normalizeLocal(payload.leads);
    saveLocalLeads(leads);
    return { leads, source: "supabase" };
  } catch (error) {
    return {
      leads: loadLocalLeads(),
      source: "localStorage",
      error: error instanceof Error ? error.message : "Fallback local activo"
    };
  }
}

export async function persistLead(lead: Lead, accessToken?: string) {
  const scoredLead = withScore(lead);
  const localLeads = upsertLocalLead(scoredLead);

  try {
    const response = await fetch("/api/leads", {
      method: "PUT",
      headers: { "content-type": "application/json", ...authHeaders(accessToken) },
      body: JSON.stringify({ lead: scoredLead })
    });
    const payload = (await response.json()) as LeadsApiResponse;

    if (!response.ok || !payload.leads || !payload.lead) {
      throw new Error(payload.error || "No se pudo guardar en Supabase");
    }

    const leads = normalizeLocal(payload.leads);
    saveLocalLeads(leads);
    return { lead: withScore(payload.lead), leads, source: "supabase" as LeadsSource };
  } catch {
    return { lead: scoredLead, leads: localLeads, source: "localStorage" as LeadsSource };
  }
}

export async function persistLeads(leads: Lead[], accessToken?: string) {
  const scoredLeads = leads.map(withScore).sort(sortLeads);
  saveLocalLeads(scoredLeads);

  try {
    const response = await fetch("/api/leads", {
      method: "PUT",
      headers: { "content-type": "application/json", ...authHeaders(accessToken) },
      body: JSON.stringify({ leads: scoredLeads })
    });
    const payload = (await response.json()) as LeadsApiResponse;

    if (!response.ok || !payload.leads) {
      throw new Error(payload.error || "No se pudo guardar en Supabase");
    }

    const nextLeads = normalizeLocal(payload.leads);
    saveLocalLeads(nextLeads);
    return { leads: nextLeads, source: "supabase" as LeadsSource };
  } catch {
    return { leads: scoredLeadsFallback(scoredLeads), source: "localStorage" as LeadsSource };
  }
}

export function createBlankLead(): Lead {
  const now = new Date().toISOString();
  const lead: Omit<Lead, "score"> = {
    id: `lead-${Date.now()}`,
    name: "Nuevo comercio",
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
    placeId: "",
    source: "manual",
    isInvalid: false,
    invalidReason: "",
    lastSeenAt: now,
    lastRefreshedAt: "",
    reviewOwnerCandidates: [],
    ownerUserId: "",
    assignedTo: "",
    clientId: "",
    latitude: null,
    longitude: null,
    nextFollowUpAt: "",
    nextFollowUpType: "",
    status: "Detectado",
    priority: "Media",
    potential: 350,
    lastContact: "Sin contacto",
    nextAction: "",
    pain: "",
    diagnosis: "",
    problemDetected: "",
    opportunityDetected: "",
    salesHook: "",
    recommendedService: "",
    probableObjection: "",
    suggestedWhatsappMessage: "",
    suggestedInstagramMessage: "",
    inPersonArgument: "",
    recommendedOffer: "",
    scoreTotal: 0,
    scorePresenciaDigital: 0,
    scoreUrgencia: 0,
    scoreDinero: 0,
    scoreFacilidadContacto: 0,
    scoreProbabilidadCierre: 0,
    scorePotencialMensualidad: 0,
    scorePrioridadVisita: 0,
    scoreExplanation: [],
    signals: {
      web: false,
      instagram: false,
      facebook: false,
      whatsapp: false,
      photos: false,
      googleProfile: false
    },
    adsSignal: "",
    dataQuality: {},
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
    "nextAction",
    "placeId",
    "source",
    "isInvalid"
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
    owner: `https://www.google.com/search?q=${encodeURIComponent(`${base} dueño gerente`)}`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(base)}`
  };
}

function loadLocalLeads() {
  if (typeof window === "undefined") return seedLeads;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem("firekworks-leads-v4");
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
  const sorted = next.map(withScore).sort(sortLeads);
  saveLocalLeads(sorted);
  return sorted;
}

function scoredLeadsFallback(leads: Lead[]) {
  const sorted = leads.map(withScore).sort(sortLeads);
  saveLocalLeads(sorted);
  return sorted;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function authHeaders(accessToken?: string): HeadersInit {
  return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
}
