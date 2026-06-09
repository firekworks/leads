import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { buildLeadProposal } from "@/lib/enrichment/leadProposal";
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
  const proposal = buildLeadProposal(lead);
  const nextLead = {
    ...lead,
    problemDetected: proposal.problem,
    opportunityDetected: proposal.opportunity,
    salesHook: proposal.salesHook,
    recommendedService: proposal.recommendedService,
    recommendedOffer: proposal.recommendedOffer,
    probableObjection: proposal.probableObjection,
    inPersonArgument: proposal.pitchPresencial30s,
    nextAction: lead.nextAction || proposal.nextAction,
    status: lead.status === "Detectado" || lead.status === "Validado" ? "Prioritario" : lead.status,
    updatedAt: new Date().toISOString()
  };

  const { data: updated, error: updateError } = await auth.admin
    .from("leads")
    .upsert(toLeadRow(nextLead))
    .select("*")
    .eq("id", id)
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message || "No se pudo guardar la propuesta" }, { status: 500 });
  }

  await Promise.allSettled([
    auth.admin.from("lead_proposals").insert({
      lead_id: id,
      title: `Propuesta Firekworks · ${lead.name}`,
      plan: proposal.recommendedPlan,
      monthly_value: proposal.monthlyPriceEstimate,
      ad_budget: proposal.adBudgetEstimate,
      payload: proposal,
      created_by: auth.user.id
    }),
    auth.admin.from("lead_activities").insert({
      lead_id: id,
      user_id: auth.user.id,
      type: "propuesta",
      result: "Propuesta Firekworks generada",
      next_action: proposal.nextAction
    })
  ]);

  return NextResponse.json({ lead: normalizeLeads([updated as LeadRow])[0], proposal });
}
