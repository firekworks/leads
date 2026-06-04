import { NextResponse } from "next/server";
import { normalizeLeads, toLeadRow, withScore, type LeadRow } from "@/lib/leads-codec";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead, LeadSector } from "@/types/lead";

export const dynamic = "force-dynamic";

const FOIA_CITIES = ["Castalla", "Ibi", "Onil", "Biar", "Tibi"];
const EXCLUDED_TERMS = ["alcoy", "alcoi", "alicante", "alacant"];
const DEFAULT_TYPES: LeadSector[] = [
  "Restaurantes",
  "Clínicas",
  "Gimnasios",
  "Estética",
  "Peluquerías",
  "Academias",
  "Talleres",
  "Inmobiliarias"
];

type PlacesImportRequest = {
  city?: string;
  sector?: string;
  query?: string;
  mode?: "preview" | "import";
  allowPaidRequests?: boolean;
  maxRequests?: number;
  pageSize?: number;
};

type GooglePlace = {
  id?: string;
  name?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  businessStatus?: string;
  types?: string[];
};

type PlacesSearchResult = {
  places: GooglePlace[];
  requestsUsed: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as PlacesImportRequest;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const city = FOIA_CITIES.includes(body.city || "") ? body.city! : "Castalla";
  const sector = body.sector || "comercios";
  const maxRequests = Math.max(0, Math.min(Number(body.maxRequests || 1), 3));
  const pageSize = Math.max(5, Math.min(Number(body.pageSize || 10), 20));
  const query = body.query || `${sector} en ${city}`;

  if (!body.allowPaidRequests) {
    return NextResponse.json({
      ok: true,
      mode: "safe_preview",
      estimatedRequests: maxRequests || 1,
      includedCities: FOIA_CITIES,
      excluded: ["Alcoy", "Alicante"],
      message: "No se han hecho peticiones a Google Places. Activa allowPaidRequests para ejecutar una búsqueda limitada."
    });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "Falta GOOGLE_PLACES_API_KEY en el servidor" }, { status: 503 });
  }

  if (!maxRequests) {
    return NextResponse.json({ error: "maxRequests debe ser mayor que 0" }, { status: 400 });
  }

  let searchResult: PlacesSearchResult;
  try {
    searchResult = await searchPlaces({ apiKey, query, city, pageSize, maxRequests });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo consultar Google Places"
      },
      { status: 502 }
    );
  }

  const { places, requestsUsed } = searchResult;
  const uniquePlaces = uniqueByPlaceId(places);
  const incomingLeads = uniquePlaces
    .filter((place) => isAllowedPlace(place, city))
    .map((place) => placeToLead(place, city, sector))
    .slice(0, pageSize * maxRequests);

  if (body.mode !== "import") {
    return NextResponse.json({
      ok: true,
      mode: "preview",
      requestsUsed,
      uniqueCandidates: uniquePlaces.length,
      leads: incomingLeads
    });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Faltan variables de Supabase en el servidor" }, { status: 503 });
  }

  const ids = incomingLeads.map((lead) => lead.id);
  const { data: existingRows, error: existingError } = await supabase
    .from("leads")
    .select("*")
    .in("id", ids);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existingById = new Map(
    ((existingRows || []) as LeadRow[]).map((row) => [row.id, normalizeLeads([row])[0]])
  );
  const leads = incomingLeads
    .map((lead) => mergeImportedLead(existingById.get(lead.id), lead))
    .filter((lead) => !lead.isInvalid);

  if (!leads.length) {
    return NextResponse.json({
      ok: true,
      mode: "import",
      requestsUsed,
      imported: 0,
      skippedInvalid: incomingLeads.length
    });
  }

  const { error } = await supabase.from("leads").upsert(leads.map((lead) => toLeadRow(lead)));
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data, error: readError } = await supabase
    .from("leads")
    .select("*")
    .order("is_invalid", { ascending: true })
    .order("score", { ascending: false });

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    mode: "import",
    requestsUsed,
    imported: leads.length,
    uniqueCandidates: uniquePlaces.length,
    leads: normalizeLeads((data || []) as LeadRow[])
  });
}

async function searchPlaces({
  apiKey,
  query,
  city,
  pageSize,
  maxRequests
}: {
  apiKey: string;
  query: string;
  city: string;
  pageSize: number;
  maxRequests: number;
}): Promise<PlacesSearchResult> {
  const places: GooglePlace[] = [];
  let pageToken = "";
  let requestsUsed = 0;

  for (let requestIndex = 0; requestIndex < maxRequests; requestIndex += 1) {
    if (requestIndex > 0 && pageToken) {
      await new Promise((resolve) => setTimeout(resolve, 1600));
    }

    const result = await searchPlacesPage({ apiKey, query, city, pageSize, pageToken });
    requestsUsed += 1;
    places.push(...result.places);
    pageToken = result.nextPageToken || "";

    if (!pageToken) break;
  }

  return { places, requestsUsed };
}

async function searchPlacesPage({
  apiKey,
  query,
  city,
  pageSize,
  pageToken
}: {
  apiKey: string;
  query: string;
  city: string;
  pageSize: number;
  pageToken?: string;
}) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
      "x-goog-fieldmask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.googleMapsUri",
        "places.rating",
        "places.userRatingCount",
        "places.websiteUri",
        "places.nationalPhoneNumber",
        "places.businessStatus",
        "places.types",
        "nextPageToken"
      ].join(",")
    },
    body: JSON.stringify({
      textQuery: `${query}, ${city}, Alicante, España`,
      pageSize,
      ...(pageToken ? { pageToken } : {}),
      languageCode: "es",
      regionCode: "ES"
    }),
    signal: AbortSignal.timeout(9000)
  });

  if (!response.ok) {
    throw new Error(`Google Places respondió ${response.status}`);
  }

  const payload = (await response.json()) as { places?: GooglePlace[]; nextPageToken?: string };
  return { places: payload.places || [], nextPageToken: payload.nextPageToken || "" };
}

function uniqueByPlaceId(places: GooglePlace[]) {
  const byId = new Map<string, GooglePlace>();

  for (const place of places) {
    const key = place.id || `${place.displayName?.text || ""}-${place.formattedAddress || ""}`;
    if (!byId.has(key)) byId.set(key, place);
  }

  return Array.from(byId.values());
}

function isAllowedPlace(place: GooglePlace, city: string) {
  const haystack = `${place.formattedAddress || ""} ${place.displayName?.text || ""}`.toLowerCase();
  return haystack.includes(city.toLowerCase()) && !EXCLUDED_TERMS.some((term) => haystack.includes(term));
}

function placeToLead(place: GooglePlace, city: string, sector: string): Lead {
  const now = new Date().toISOString();
  const name = place.displayName?.text || "Comercio local";
  const id = place.id ? `places-${place.id}` : slugify(`${name}-${city}`);
  const isClosed = place.businessStatus === "CLOSED_PERMANENTLY";
  const inferredSector = inferSector(sector, place.types || []);
  const reviews = Number(place.userRatingCount || 0);
  const rating = Number(place.rating || 0);

  return withScore({
    id,
    name,
    sector: inferredSector,
    city,
    address: place.formattedAddress || "",
    phone: place.nationalPhoneNumber || "",
    website: place.websiteUri || "",
    description: reviews
      ? `${inferredSector} con ${reviews} reseñas en Google y oportunidad de revisar imagen local.`
      : `${inferredSector} detectado en Google Places para revisión comercial.`,
    ownerName: "",
    instagramUrl: "",
    facebookUrl: "",
    whatsappUrl: "",
    logoUrl: "",
    followersBucket: "Pendiente",
    contentUse: "Pendiente",
    websiteTitle: "",
    googleMapsUrl: place.googleMapsUri || "",
    rating,
    reviews,
    googlePhotos: 0,
    placeId: place.id || "",
    source: "google_places",
    isInvalid: isClosed,
    invalidReason: isClosed ? "Cerrado permanentemente en Google Places" : "",
    lastSeenAt: now,
    lastRefreshedAt: now,
    reviewOwnerCandidates: [],
    status: isClosed ? "Descartado" : "Detectado",
    priority: reviews >= 100 && rating >= 4.3 ? "Alta" : "Media",
    potential: estimatePotential(inferredSector, reviews, rating),
    lastContact: "Sin contacto",
    nextAction: "Validar Instagram, Facebook y contacto directo",
    pain: "",
    diagnosis: "",
    signals: {
      web: Boolean(place.websiteUri),
      instagram: false,
      facebook: false,
      whatsapp: false,
      photos: false,
      googleProfile: Boolean(place.googleMapsUri)
    },
    createdAt: now,
    updatedAt: now
  });
}

function mergeImportedLead(existing: Lead | undefined, incoming: Lead) {
  if (!existing) return incoming;

  return withScore({
    ...incoming,
    status: existing.status,
    priority: existing.priority,
    potential: existing.potential || incoming.potential,
    lastContact: existing.lastContact,
    nextAction: existing.nextAction || incoming.nextAction,
    pain: existing.pain,
    diagnosis: existing.diagnosis,
    ownerName: existing.ownerName,
    instagramUrl: existing.instagramUrl,
    facebookUrl: existing.facebookUrl,
    whatsappUrl: existing.whatsappUrl || incoming.whatsappUrl,
    logoUrl: existing.logoUrl || incoming.logoUrl,
    followersBucket: existing.followersBucket,
    contentUse: existing.contentUse,
    websiteTitle: existing.websiteTitle || incoming.websiteTitle,
    description: existing.description || incoming.description,
    isInvalid: existing.isInvalid,
    invalidReason: existing.invalidReason,
    reviewOwnerCandidates: existing.reviewOwnerCandidates,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  });
}

function inferSector(querySector: string, types: string[]) {
  const normalized = querySector.toLowerCase();
  if (normalized.includes("clín") || types.includes("dentist") || types.includes("doctor")) return "Clínicas";
  if (normalized.includes("gim") || types.includes("gym")) return "Gimnasios";
  if (normalized.includes("estética") || types.includes("beauty_salon") || types.includes("spa")) return "Estética";
  if (normalized.includes("pelu") || types.includes("hair_care")) return "Peluquerías";
  if (normalized.includes("academ") || types.includes("school")) return "Academias";
  if (normalized.includes("taller") || types.includes("car_repair")) return "Talleres";
  if (normalized.includes("inmobili") || types.includes("real_estate_agency")) return "Inmobiliarias";
  if (normalized.includes("rest") || types.includes("restaurant") || types.includes("bar")) return "Restaurantes";
  return DEFAULT_TYPES.includes(querySector as LeadSector) ? querySector : "Comercios";
}

function estimatePotential(sector: string, reviews: number, rating: number) {
  const sectorBase: Record<string, number> = {
    Clínicas: 850,
    Inmobiliarias: 760,
    Gimnasios: 680,
    Restaurantes: 580,
    Estética: 520,
    Academias: 560,
    Talleres: 480,
    Peluquerías: 360
  };
  const reputationLift = reviews >= 200 ? 160 : reviews >= 75 ? 90 : reviews >= 20 ? 40 : 0;
  const ratingLift = rating >= 4.6 ? 90 : rating >= 4.2 ? 45 : 0;

  return (sectorBase[sector] || 420) + reputationLift + ratingLift;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
