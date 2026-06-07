import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";

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
  const leadIds = (body.leadIds || []).filter(Boolean);
  if (!leadIds.length) return NextResponse.json({ error: "Selecciona leads" }, { status: 400 });

  const { data: route, error } = await auth.admin
    .from("lead_routes")
    .insert({
      name: body.name || `Ruta ${body.city || "comercial"}`,
      city: body.city || "",
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

  return NextResponse.json({ route, items });
}
