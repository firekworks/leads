import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { normalizeLeads, type LeadRow } from "@/lib/leads-codec";
import { buildGoogleMapsRouteUrl } from "@/lib/enrichment/providers/googleMapsProvider";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireInternalUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const { data: items, error } = await auth.admin
    .from("lead_route_items")
    .select("lead_id, position")
    .eq("route_id", id)
    .order("position", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leadIds = (items || []).map((item) => item.lead_id);
  if (!leadIds.length) return NextResponse.json({ error: "Ruta vacía" }, { status: 404 });

  const { data: leads, error: leadsError } = await auth.admin.from("leads").select("*").in("id", leadIds);
  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });

  const normalized = normalizeLeads((leads || []) as LeadRow[]);
  const byId = new Map(normalized.map((lead) => [lead.id, lead]));
  const ordered = leadIds.flatMap((leadId) => {
    const lead = byId.get(leadId);
    return lead ? [lead] : [];
  });

  return NextResponse.json({ url: buildGoogleMapsRouteUrl(ordered) });
}
