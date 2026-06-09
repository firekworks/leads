import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { computeScoreBreakdown } from "@/lib/scoring";
import { normalizeLeads, toLeadRow, type LeadRow } from "@/lib/leads-codec";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireInternalUser(request, { write: true });
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => ({}))) as { limit?: number };
  const limit = Math.max(1, Math.min(Number(body.limit || 100), 500));
  const { data, error } = await auth.admin
    .from("leads")
    .select("*")
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leads = normalizeLeads((data || []) as LeadRow[]);
  const rows = leads.map((lead) => {
    const breakdown = computeScoreBreakdown(lead);
    return toLeadRow({ ...lead, ...breakdown, updatedAt: new Date().toISOString() });
  });

  if (rows.length) {
    const { error: updateError } = await auth.admin.from("leads").upsert(rows);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    updated: rows.length,
    message: `${rows.length} leads recalculados`
  });
}
