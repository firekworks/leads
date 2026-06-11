import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { normalizeLeads, type LeadRow } from "@/lib/leads-codec";
import { scanGooglePlacesFallback } from "@/lib/enrichment/providers/googlePlacesProvider";

export const dynamic = "force-dynamic";

type ScanRequest = {
  city?: string;
  sector?: string;
  radius?: number;
  allowPaidRequests?: boolean;
  maxRequests?: number;
};

export async function POST(request: Request) {
  const auth = await requireInternalUser(request);
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => ({}))) as ScanRequest;
  const city = body.city || "Castalla";
  const sector = body.sector || "Restaurantes";

  const { data, error } = await auth.admin
    .from("leads")
    .select("*")
    .order("score_total", { ascending: false })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const existingLeads = normalizeLeads((data || []) as LeadRow[]);
  const result = await scanGooglePlacesFallback({
    city,
    sector,
    existingLeads,
    context: {
      allowPaidRequests: Boolean(body.allowPaidRequests),
      maxRequests: Math.max(0, Math.min(Number(body.maxRequests || 1), 3))
    }
  });

  try {
    await auth.admin.from("lead_scan_jobs").insert({
      city,
      sector,
      radius: Number(body.radius || 5000),
      status: "completed",
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      total_found: result.leads.length,
      total_saved: 0,
      total_discarded: 0,
      estimated_cost: result.estimatedCost,
      error: ""
    });
  } catch {
    // Optional table: older deployments can still scan with existing leads.
  }

  return NextResponse.json(result);
}
