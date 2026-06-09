import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { buildVisitScript } from "@/lib/enrichment/leadProposal";
import { normalizeLeads, toLeadRow, type LeadRow } from "@/lib/leads-codec";

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
  const script = buildVisitScript(lead);
  const content = [
    `Apertura: ${script.opening}`,
    `Preguntas:\n${script.questions.map((question, index) => `${index + 1}. ${question}`).join("\n")}`,
    `Cierre: ${script.close}`,
    `Objeciones: ${script.objections}`
  ].join("\n\n");
  const nextLead = {
    ...lead,
    inPersonArgument: script.argument,
    nextAction: lead.nextAction || "Visita presencial de 15 minutos",
    updatedAt: new Date().toISOString()
  };

  const { data: updated, error: updateError } = await auth.admin
    .from("leads")
    .upsert(toLeadRow(nextLead))
    .select("*")
    .eq("id", id)
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message || "No se pudo guardar el guion" }, { status: 500 });
  }

  await Promise.allSettled([
    auth.admin.from("lead_notes").insert({
      lead_id: id,
      user_id: auth.user.id,
      note: content,
      pinned: true
    }),
    auth.admin.from("lead_activities").insert({
      lead_id: id,
      user_id: auth.user.id,
      type: "visita",
      result: "Guion de visita preparado",
      next_action: nextLead.nextAction
    })
  ]);

  return NextResponse.json({ lead: normalizeLeads([updated as LeadRow])[0], script });
}
