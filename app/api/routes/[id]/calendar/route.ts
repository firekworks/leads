import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { buildGoogleMapsRouteUrl } from "@/lib/enrichment/providers/googleMapsProvider";
import { normalizeLeads, type LeadRow } from "@/lib/leads-codec";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireInternalUser(request, { write: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { date?: string; title?: string };

  const { data: route, error: routeError } = await auth.admin.from("lead_routes").select("*").eq("id", id).single();
  if (routeError || !route) return NextResponse.json({ error: routeError?.message || "Ruta no encontrada" }, { status: 404 });

  const { data: items, error } = await auth.admin
    .from("lead_route_items")
    .select("lead_id, position")
    .eq("route_id", id)
    .order("position", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leadIds = (items || []).map((item) => item.lead_id);
  const { data: leadsData, error: leadsError } = await auth.admin.from("leads").select("*").in("id", leadIds);
  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });
  const leads = normalizeLeads((leadsData || []) as LeadRow[]);
  const byId = new Map(leads.map((lead) => [lead.id, lead]));
  const ordered = leadIds.flatMap((leadId) => {
    const lead = byId.get(leadId);
    return lead ? [lead] : [];
  });
  const mapsUrl = buildGoogleMapsRouteUrl(ordered);
  const title = body.title || route.name || "Ruta comercial Firekworks";
  const scheduledAt = body.date || new Date().toISOString();

  await Promise.allSettled([
    auth.admin.from("lead_calendar_events").insert({
      route_id: id,
      lead_ids: leadIds,
      title,
      type: "ruta",
      status: "pending",
      start_at: scheduledAt,
      end_at: new Date(new Date(scheduledAt).getTime() + 2 * 60 * 60 * 1000).toISOString(),
      notes: `Google Maps: ${mapsUrl}\nStats bridge pendiente.`,
      created_by: auth.user.id
    }),
    auth.admin.from("audit_logs").insert({
      table_name: "lead_routes",
      record_id: id,
      action: "CALENDAR_BRIDGE_PENDING",
      user_id: auth.user.id,
      new_data: { title, scheduled_at: scheduledAt, google_maps_url: mapsUrl }
    })
  ]);

  const statsBase = process.env.STATS_API_BASE_URL || process.env.STATS_APP_URL;
  const statsKey = process.env.STATS_INTERNAL_API_KEY;

  if (!statsBase || !statsKey) {
    return NextResponse.json({
      ok: true,
      routeId: id,
      mapsUrl,
      message: "Evento interno guardado. Stats bridge pendiente de STATS_API_BASE_URL/STATS_INTERNAL_API_KEY."
    });
  }

  try {
    const response = await fetch(`${statsBase.replace(/\/$/, "")}/api/internal/calendar/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${statsKey}`
      },
      body: JSON.stringify({ route_id: id, title, date: scheduledAt, leads: leadIds, google_maps_url: mapsUrl }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Stats respondió ${response.status}`);
    return NextResponse.json({ ok: true, routeId: id, mapsUrl, message: "Evento enviado a Stats." });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      routeId: id,
      mapsUrl,
      message: error instanceof Error ? `Guardado interno; Stats pendiente: ${error.message}` : "Guardado interno; Stats pendiente"
    });
  }
}
