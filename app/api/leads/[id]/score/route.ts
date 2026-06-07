import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { normalizeLeads, toLeadRow, type LeadRow } from "@/lib/leads-codec";
import { computeScoreBreakdown } from "@/lib/scoring";

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
  const breakdown = computeScoreBreakdown(lead);
  const nextLead = { ...lead, ...breakdown, updatedAt: new Date().toISOString() };

  const { data: updated, error: updateError } = await auth.admin
    .from("leads")
    .upsert(toLeadRow(nextLead))
    .select("*")
    .eq("id", id)
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message || "No se pudo recalcular" }, { status: 500 });
  }

  try {
    await auth.admin.from("lead_score_breakdowns").insert({
      lead_id: id,
      score_total: breakdown.scoreTotal,
      score_demand: breakdown.scoreDemandaVisible,
      score_money: breakdown.scoreDinero,
      score_digital_gap: breakdown.scorePresenciaDigital,
      score_contactability: breakdown.scoreFacilidadContacto,
      score_route_priority: breakdown.scorePrioridadVisita,
      positive_factors: breakdown.scoreExplanation,
      negative_factors: [],
      explanation: breakdown.scoreExplanation.join(" "),
      confidence: "media",
      sources: breakdown.scoreTags
    });
  } catch {
    // Optional history table: the lead still gets its recalculated score.
  }

  return NextResponse.json({ lead: normalizeLeads([updated as LeadRow])[0], breakdown });
}
