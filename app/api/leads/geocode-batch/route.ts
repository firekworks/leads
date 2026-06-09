import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { normalizeLeads, type LeadRow } from "@/lib/leads-codec";

export const dynamic = "force-dynamic";

type GeocodeResponse = {
  results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
  status?: string;
};

export async function POST(request: Request) {
  const auth = await requireInternalUser(request, { write: true });
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => ({}))) as { allowPaidRequests?: boolean; limit?: number };
  const limit = Math.max(1, Math.min(Number(body.limit || 25), 50));
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  const { data, error } = await auth.admin
    .from("leads")
    .select("*")
    .is("latitude", null)
    .not("address", "is", null)
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pending = normalizeLeads((data || []) as LeadRow[]).filter((lead) => lead.address || lead.city);

  if (!body.allowPaidRequests) {
    return NextResponse.json({
      ok: true,
      pending: pending.length,
      message: `${pending.length} pendientes. No se han hecho peticiones a Google Geocoding.`
    });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "Falta GOOGLE_MAPS_SERVER_API_KEY para geocodificar" }, { status: 503 });
  }

  let updated = 0;
  for (const lead of pending) {
    const params = new URLSearchParams({
      address: `${lead.name} ${lead.address} ${lead.city} Alicante España`,
      key: apiKey
    });
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) continue;
    const payload = (await response.json()) as GeocodeResponse;
    const location = payload.results?.[0]?.geometry?.location;
    if (typeof location?.lat !== "number" || typeof location.lng !== "number") continue;
    const { error: updateError } = await auth.admin
      .from("leads")
      .update({ latitude: location.lat, longitude: location.lng, updated_at: new Date().toISOString() })
      .eq("id", lead.id);
    if (!updateError) updated += 1;
  }

  return NextResponse.json({
    ok: true,
    updated,
    message: `${updated} leads geocodificados`
  });
}
