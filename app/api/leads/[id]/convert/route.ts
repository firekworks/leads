import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { normalizeLeads, type LeadRow } from "@/lib/leads-codec";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireInternalUser(request, { write: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    billingName?: string;
    taxId?: string;
    billingEmail?: string;
    billingAddress?: string;
  };

  const { data: leadData, error: leadError } = await auth.admin.from("leads").select("*").eq("id", id).single();
  const leadRow = leadData as LeadRow | null;
  if (leadError || !leadRow) {
    return NextResponse.json({ error: leadError?.message || "Lead no encontrado" }, { status: 404 });
  }

  const lead = normalizeLeads([leadRow])[0];
  const { data: client, error: clientError } = await auth.admin
    .from("clients")
    .insert({
      lead_id: lead.id,
      name: lead.name,
      sector: lead.sector,
      city: lead.city,
      address: lead.address,
      phone: lead.phone,
      website: lead.website,
      instagram_url: lead.instagramUrl,
      facebook_url: lead.facebookUrl,
      whatsapp_url: lead.whatsappUrl,
      logo_url: lead.logoUrl,
      billing_name: body.billingName || "",
      tax_id: body.taxId || "",
      billing_email: body.billingEmail || "",
      billing_address: body.billingAddress || "",
      status: "Pendiente datos fiscales",
      created_by: auth.user.id
    })
    .select("*")
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: clientError?.message || "No se pudo crear cliente" }, { status: 500 });
  }

  await auth.admin.from("lead_to_client_links").insert({
    lead_id: lead.id,
    client_id: client.id,
    created_by: auth.user.id
  });

  const { data: updatedLeadRows, error: updateError } = await auth.admin
    .from("leads")
    .update({
      status: "Ganado",
      client_id: client.id,
      next_action: "Completar datos fiscales y abrir onboarding interno",
      updated_at: new Date().toISOString()
    })
    .eq("id", lead.id)
    .select("*");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await auth.admin.from("lead_activities").insert({
    lead_id: lead.id,
    user_id: auth.user.id,
    type: "sistema",
    result: "Lead convertido en cliente",
    next_action: "Completar datos fiscales y preparar onboarding"
  });

  return NextResponse.json({
    client,
    lead: normalizeLeads((updatedLeadRows || []) as LeadRow[])[0]
  });
}
