import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { normalizeLeads, toLeadRow, type LeadRow } from "@/lib/leads-codec";
import { buildLeadDemo } from "@/lib/enrichment/generateLeadDemo";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireInternalUser(request, { write: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const { data, error } = await auth.admin.from("leads").select("*").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: error?.message || "Lead no encontrado" }, { status: 404 });

  const lead = normalizeLeads([data as LeadRow])[0];
  const demo = buildLeadDemo(lead);
  const nextLead = {
    ...lead,
    problemDetected: demo.problem,
    opportunityDetected: demo.opportunity,
    recommendedService: demo.proposal,
    salesHook: demo.hook,
    recommendedOffer: demo.offer,
    suggestedWhatsappMessage: demo.whatsapp,
    suggestedInstagramMessage: demo.instagram,
    inPersonArgument: demo.visitScript,
    probableObjection: demo.objections,
    nextAction: lead.nextAction || demo.nextStep,
    updatedAt: new Date().toISOString()
  };

  const { data: updated, error: updateError } = await auth.admin
    .from("leads")
    .upsert(toLeadRow(nextLead))
    .select("*")
    .eq("id", id)
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message || "No se pudo guardar la demo" }, { status: 500 });
  }

  try {
    await auth.admin.from("lead_assets").insert([
      { lead_id: id, type: "audit", title: "Auditoría resumida", content: demo.summary, preview_data: demo },
      { lead_id: id, type: "demo_landing", title: "Mockup de landing", content: demo.landing, preview_data: demo },
      { lead_id: id, type: "whatsapp_message", title: "WhatsApp", content: demo.whatsapp, preview_data: demo },
      { lead_id: id, type: "instagram_message", title: "Instagram DM", content: demo.instagram, preview_data: demo },
      { lead_id: id, type: "visit_script", title: "Guion presencial", content: demo.visitScript, preview_data: demo },
      { lead_id: id, type: "objections", title: "Objeciones", content: demo.objections, preview_data: demo },
      { lead_id: id, type: "proposal", title: "Propuesta Firekworks", content: demo.proposal, preview_data: demo }
    ]);
  } catch {
    // Optional asset table: generated text is still saved on the lead.
  }

  return NextResponse.json({ lead: normalizeLeads([updated as LeadRow])[0], demo });
}
