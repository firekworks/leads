import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import {
  normalizeContentUse,
  normalizeLeads,
  normalizeSocialUrl,
  type LeadRow
} from "@/lib/leads-codec";
import type { ContentUse, FollowersBucket, Lead } from "@/types/lead";

export const dynamic = "force-dynamic";

type SocialImportItem = {
  leadId?: string;
  name: string;
  city?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  followersBucket?: FollowersBucket;
  contentUse?: ContentUse;
};

const followersBuckets = new Set<FollowersBucket>([
  "Pendiente",
  "Sin cuenta",
  "< 1.000",
  "1.000 - 5.000",
  "+5.000"
]);

export async function POST(request: Request) {
  const auth = await requireInternalUser(request, { write: true });
  if ("response" in auth) return auth.response;

  const body = (await request.json()) as { items?: SocialImportItem[] };
  const items = (body.items || []).filter((item) => item.leadId || item.name);

  if (!items.length) {
    return NextResponse.json({ error: "No hay filas para importar" }, { status: 400 });
  }

  const { data, error } = await auth.admin.from("leads").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leads = normalizeLeads((data || []) as LeadRow[]);
  const now = new Date().toISOString();
  const updated: Array<{ id: string; name: string }> = [];
  const unmatched: SocialImportItem[] = [];

  for (const item of items) {
    const lead = findLead(leads, item);
    if (!lead) {
      unmatched.push(item);
      continue;
    }

    const instagramUrl = item.instagramUrl ? normalizeSocialUrl(cleanUrl(item.instagramUrl), "instagram") : "";
    const facebookUrl = item.facebookUrl ? normalizeSocialUrl(cleanUrl(item.facebookUrl), "facebook") : "";
    const followersBucket = item.followersBucket && followersBuckets.has(item.followersBucket)
      ? item.followersBucket
      : undefined;
    const contentUse = item.contentUse ? normalizeContentUse(item.contentUse) : undefined;

    const update: Record<string, string> = {
      updated_at: now,
      last_enriched_at: now,
      enrichment_status: "parcial"
    };

    if (instagramUrl) {
      update.instagram_url = instagramUrl;
      update.instagram_status = "manual";
    }
    if (facebookUrl) update.facebook_url = facebookUrl;
    if (followersBucket) update.followers_bucket = followersBucket;
    if (contentUse) update.content_use = contentUse;

    const { error: updateError } = await auth.admin.from("leads").update(update).eq("id", lead.id);
    if (updateError) {
      unmatched.push(item);
      continue;
    }

    await auth.admin.from("audit_logs").insert({
      table_name: "leads",
      record_id: lead.id,
      action: "SOCIAL_IMPORT",
      user_id: auth.user.id,
      old_data: {
        instagram_url: lead.instagramUrl,
        facebook_url: lead.facebookUrl,
        followers_bucket: lead.followersBucket,
        content_use: lead.contentUse
      },
      new_data: update
    });

    updated.push({ id: lead.id, name: lead.name });
  }

  return NextResponse.json({
    ok: true,
    updated,
    unmatched,
    message: `${updated.length} perfiles sociales guardados`
  });
}

function findLead(leads: Lead[], item: SocialImportItem) {
  if (item.leadId) {
    const exact = leads.find((lead) => lead.id === item.leadId);
    if (exact) return exact;
  }

  const target = normalizeForMatch(item.name);
  const city = normalizeForMatch(item.city || "");
  let best: { lead: Lead; score: number } | null = null;

  for (const lead of leads) {
    const leadName = normalizeForMatch(lead.name);
    const leadCity = normalizeForMatch(lead.city);
    const nameScore = similarity(target, leadName);
    const cityBoost = city && city === leadCity ? 0.12 : city ? -0.08 : 0;
    const score = nameScore + cityBoost;

    if (!best || score > best.score) best = { lead, score };
  }

  return best && best.score >= 0.46 ? best.lead : null;
}

function similarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.86;

  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (!aTokens.size || !bTokens.size) return 0;

  const matches = Array.from(aTokens).filter((token) => bTokens.has(token)).length;
  return matches / Math.max(aTokens.size, bTokens.size);
}

function tokenize(value: string) {
  return value
    .split(" ")
    .filter((token) => token.length > 2 && !["bar", "sl", "sll", "cb", "de", "la", "el"].includes(token));
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanUrl(value: string) {
  return value.trim().replace(/[),.;]+$/g, "");
}
