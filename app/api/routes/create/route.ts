import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { buildGoogleMapsRouteUrl } from "@/lib/enrichment/providers/googleMapsProvider";
import { normalizeLeads, type LeadRow } from "@/lib/leads-codec";

export const dynamic = "force-dynamic";

type RouteRequest = {
  name?: string;
  city?: string;
  leadIds?: string[];
};

export async function POST(request: Request) {
  const auth = await requireInternalUser(request, { write: true });
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => ({}))) as RouteRequest;
  const leadIds = Array.from(new Set((body.leadIds || []).filter(Boolean))).slice(0, 25);
  if (!leadIds.length) return NextResponse.json({ error: "Selecciona leads" }, { status: 400 });

  const { data: leadsData, error: leadsError } = await auth.admin.from("leads").select("*").in("id", leadIds);
  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });
  const leads = normalizeLeads((leadsData || []) as LeadRow[]);
  const byId = new Map(leads.map((lead) => [lead.id, lead]));
  const orderedLeads = leadIds.flatMap((id) => {
    const lead = byId.get(id);
    return lead ? [lead] : [];
  });
  const mapsUrl = buildGoogleMapsRouteUrl(orderedLeads);

  const { data: route, error } = await auth.admin
    .from("lead_routes")
    .insert({
      name: body.name || `Ruta ${body.city || "comercial"}`,
      city: body.city || orderedLeads[0]?.city || "",
      status: "planned"
    })
    .select("*")
    .single();

  if (error || !route) return NextResponse.json({ error: error?.message || "No se pudo crear ruta" }, { status: 500 });

  const items = leadIds.map((leadId, index) => ({
    route_id: route.id,
    lead_id: leadId,
    position: index + 1,
    notes: ""
  }));
  const { error: itemError } = await auth.admin.from("lead_route_items").insert(items);
  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });

  await auth.admin.from("lead_route_stops").insert(items).then(() => null, () => null);

  await Promise.allSettled([
    auth.admin.from("lead_activities").insert(
      leadIds.map((leadId) => ({
        lead_id: leadId,
        user_id: auth.user.id,
        type: "sistema",
        result: "Lead añadido a ruta",
        next_action: "Preparar visita presencial"
      }))
    ),
    auth.admin.from("lead_tasks").insert(
      leadIds.map((leadId) => ({
        lead_id: leadId,
        user_id: auth.user.id,
        type: "visit",
        title: "Visita en ruta",
        description: `Ruta ${route.name} · ${mapsUrl}`,
        due_at: null,
        priority: "Media",
        status: "pendiente"
      }))
    )
  ]);

  return NextResponse.json({ route, items, mapsUrl });
}
