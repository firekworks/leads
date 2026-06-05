import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { normalizeLeads, seedRows, toLeadRow, withScore, type LeadRow } from "@/lib/leads-codec";
import type { Lead } from "@/types/lead";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireInternalUser(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.admin
    .from("leads")
    .select("*")
    .order("is_invalid", { ascending: true })
    .order("score_total", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.length) {
    const { data: seeded, error: seedError } = await auth.admin
      .from("leads")
      .upsert(seedRows())
      .select("*")
      .order("score_total", { ascending: false });

    if (seedError) {
      return NextResponse.json({ error: seedError.message }, { status: 500 });
    }

    return NextResponse.json({ leads: normalizeLeads((seeded || []) as LeadRow[]) });
  }

  return NextResponse.json({ leads: normalizeLeads(data as LeadRow[]) });
}

export async function PUT(request: Request) {
  const auth = await requireInternalUser(request, { write: true });
  if ("response" in auth) return auth.response;

  const body = (await request.json()) as { lead?: Lead; leads?: Lead[] };
  const leads = body.leads || (body.lead ? [body.lead] : []);

  if (!leads.length) {
    return NextResponse.json({ error: "Lead requerido" }, { status: 400 });
  }

  const rows = leads.map((lead) => toLeadRow(withScore(lead)));
  const { error } = await auth.admin.from("leads").upsert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data, error: readError } = await auth.admin
    .from("leads")
    .select("*")
    .order("is_invalid", { ascending: true })
    .order("score_total", { ascending: false });

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const normalized = normalizeLeads((data || []) as LeadRow[]);
  const savedLead = body.lead ? normalized.find((lead) => lead.id === body.lead?.id) : undefined;

  return NextResponse.json({ leads: normalized, lead: savedLead || body.lead });
}
