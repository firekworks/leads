import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { normalizeLeads, toLeadRow, type LeadRow } from "@/lib/leads-codec";
import { auditWebsite } from "@/lib/enrichment/providers/websiteAuditProvider";
import { manualSearchLinks } from "@/lib/enrichment/providers/searchProvider";

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
  const websiteResult = await auditWebsite(lead);
  const searchResult = manualSearchLinks(lead);
  const nextLead = {
    ...lead,
    ...websiteResult.leadPatch,
    lastEnrichedAt: new Date().toISOString(),
    enrichmentStatus: "parcial" as const,
    updatedAt: new Date().toISOString()
  };

  const { data: updated, error: updateError } = await auth.admin
    .from("leads")
    .upsert(toLeadRow(nextLead))
    .select("*")
    .eq("id", id)
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message || "No se pudo enriquecer" }, { status: 500 });
  }

  const sources = [...websiteResult.sources, ...searchResult.sources].map((source) => ({
    lead_id: id,
    source: source.source,
    source_url: source.sourceUrl,
    data_type: source.dataType,
    confidence: source.confidence,
    raw_payload: source.rawPayload || {}
  }));

  if (sources.length) {
    try {
      await auth.admin.from("lead_enrichment_sources").insert(sources);
    } catch {
      // Optional sources table: enrichment still updates the lead safely.
    }
  }

  return NextResponse.json({
    lead: normalizeLeads([updated as LeadRow])[0],
    sources,
    message: websiteResult.message
  });
}
