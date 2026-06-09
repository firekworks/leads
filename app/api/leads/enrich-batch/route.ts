import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { auditWebsite } from "@/lib/enrichment/providers/websiteAuditProvider";
import { manualSearchLinks } from "@/lib/enrichment/providers/searchProvider";
import { normalizeLeads, toLeadRow, type LeadRow } from "@/lib/leads-codec";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireInternalUser(request, { write: true });
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => ({}))) as { limit?: number };
  const limit = Math.max(1, Math.min(Number(body.limit || 25), 50));
  const { data, error } = await auth.admin
    .from("leads")
    .select("*")
    .eq("is_invalid", false)
    .order("last_enriched_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leads = normalizeLeads((data || []) as LeadRow[]);
  const rows: LeadRow[] = [];
  const sources: Record<string, unknown>[] = [];

  for (const lead of leads) {
    const website = await auditWebsite(lead);
    const search = manualSearchLinks(lead);
    const nextLead = {
      ...lead,
      ...website.leadPatch,
      lastEnrichedAt: new Date().toISOString(),
      enrichmentStatus: "parcial" as const,
      updatedAt: new Date().toISOString()
    };
    rows.push(toLeadRow(nextLead));
    sources.push(
      ...[...website.sources, ...search.sources].map((source) => ({
        lead_id: lead.id,
        source: source.source,
        source_url: source.sourceUrl,
        data_type: source.dataType,
        confidence: source.confidence,
        raw_payload: source.rawPayload || {}
      }))
    );
  }

  if (rows.length) {
    const { error: updateError } = await auth.admin.from("leads").upsert(rows);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (sources.length) {
    try {
      await auth.admin.from("lead_enrichment_sources").insert(sources);
    } catch {
      // Optional source history: lead updates are already persisted.
    }
  }

  return NextResponse.json({
    ok: true,
    updated: rows.length,
    message: `${rows.length} leads enriquecidos sin scrapear redes sociales`
  });
}
