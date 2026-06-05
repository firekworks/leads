import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireInternalUser } from "@/lib/api-auth";
import type { LeadRow } from "@/lib/leads-codec";

export const dynamic = "force-dynamic";

type DuplicateCandidate = {
  lead_id: string;
  duplicate_lead_id: string;
  reason: string;
  confidence: number;
  status: "pendiente";
};

export async function GET(request: Request) {
  const auth = await requireInternalUser(request);
  if ("response" in auth) return auth.response;

  const candidates = await findDuplicates(auth.admin);
  if ("response" in candidates) return candidates.response;

  return NextResponse.json({
    candidates: candidates.rows,
    groups: summarizeDuplicates(candidates.rows)
  });
}

export async function POST(request: Request) {
  const auth = await requireInternalUser(request, { write: true });
  if ("response" in auth) return auth.response;

  const candidates = await findDuplicates(auth.admin);
  if ("response" in candidates) return candidates.response;

  await auth.admin.from("lead_duplicates").delete().eq("status", "pendiente");

  if (candidates.rows.length) {
    const { error } = await auth.admin.from("lead_duplicates").upsert(candidates.rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    saved: candidates.rows.length,
    groups: summarizeDuplicates(candidates.rows)
  });
}

async function findDuplicates(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("leads")
    .select("id,name,city,phone,website,place_id,is_invalid");

  if (error) {
    return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
  }

  const rows = ((data || []) as LeadRow[]).filter((lead) => !lead.is_invalid);
  return { rows: detectDuplicates(rows) };
}

function detectDuplicates(rows: LeadRow[]) {
  const candidates = new Map<string, DuplicateCandidate>();

  collectGroups(rows, "place_id", 0.98, (lead) => lead.place_id || "", candidates);
  collectGroups(rows, "telefono", 0.92, (lead) => normalizePhone(lead.phone || ""), candidates);
  collectGroups(rows, "web", 0.88, (lead) => normalizeWebsite(lead.website || ""), candidates);
  collectGroups(rows, "nombre_ciudad", 0.78, (lead) => normalizeNameCity(lead.name, lead.city), candidates);

  return Array.from(candidates.values()).sort((a, b) => b.confidence - a.confidence);
}

function collectGroups(
  rows: LeadRow[],
  reason: string,
  confidence: number,
  keyFor: (lead: LeadRow) => string,
  candidates: Map<string, DuplicateCandidate>
) {
  const groups = new Map<string, LeadRow[]>();

  for (const row of rows) {
    const key = keyFor(row);
    if (!key) continue;
    const current = groups.get(key) || [];
    current.push(row);
    groups.set(key, current);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    for (let index = 0; index < group.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < group.length; compareIndex += 1) {
        const [leadId, duplicateLeadId] = [group[index].id, group[compareIndex].id].sort();
        const candidateKey = `${leadId}:${duplicateLeadId}:${reason}`;
        candidates.set(candidateKey, {
          lead_id: leadId,
          duplicate_lead_id: duplicateLeadId,
          reason,
          confidence,
          status: "pendiente"
        });
      }
    }
  }
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-9) : "";
}

function normalizeWebsite(value: string) {
  if (!value.trim()) return "";

  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

function normalizeNameCity(name: string, city: string) {
  const normalizedName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
  const normalizedCity = city.trim().toLowerCase();
  return normalizedName.length > 4 && normalizedCity ? `${normalizedName}:${normalizedCity}` : "";
}

function summarizeDuplicates(rows: DuplicateCandidate[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.reason] = (acc[row.reason] || 0) + 1;
    return acc;
  }, {});
}
