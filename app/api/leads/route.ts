import { NextResponse } from "next/server";
import { normalizeLeads, seedRows, toLeadRow, withScore, type LeadRow } from "@/lib/leads-codec";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/types/lead";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Faltan variables de Supabase en el servidor" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("is_invalid", { ascending: true })
    .order("score", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.length) {
    const { data: seeded, error: seedError } = await supabase
      .from("leads")
      .upsert(seedRows())
      .select("*")
      .order("score", { ascending: false });

    if (seedError) {
      return NextResponse.json({ error: seedError.message }, { status: 500 });
    }

    return NextResponse.json({ leads: normalizeLeads((seeded || []) as LeadRow[]) });
  }

  return NextResponse.json({ leads: normalizeLeads(data as LeadRow[]) });
}

export async function PUT(request: Request) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Faltan variables de Supabase en el servidor" },
      { status: 503 }
    );
  }

  const body = (await request.json()) as { lead?: Lead; leads?: Lead[] };
  const leads = body.leads || (body.lead ? [body.lead] : []);

  if (!leads.length) {
    return NextResponse.json({ error: "Lead requerido" }, { status: 400 });
  }

  const rows = leads.map((lead) => toLeadRow(withScore(lead)));
  const { error } = await supabase.from("leads").upsert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data, error: readError } = await supabase
    .from("leads")
    .select("*")
    .order("is_invalid", { ascending: true })
    .order("score", { ascending: false });

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const normalized = normalizeLeads((data || []) as LeadRow[]);
  const savedLead = body.lead ? normalized.find((lead) => lead.id === body.lead?.id) : undefined;

  return NextResponse.json({ leads: normalized, lead: savedLead || body.lead });
}
