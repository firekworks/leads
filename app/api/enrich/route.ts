import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import type { Lead } from "@/types/lead";

const LINK_PATTERN = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;

export async function POST(request: Request) {
  const auth = await requireInternalUser(request, { write: true });
  if ("response" in auth) return auth.response;

  const body = (await request.json()) as { lead?: Lead };
  const lead = body.lead;

  if (!lead) {
    return NextResponse.json({ error: "Lead requerido" }, { status: 400 });
  }

  const searchLinks = createSearchLinks(lead);
  const enriched = {
    description: lead.description || "",
    instagramUrl: lead.instagramUrl || "",
    facebookUrl: lead.facebookUrl || "",
    whatsappUrl: lead.whatsappUrl || "",
    logoUrl: lead.logoUrl || "",
    websiteTitle: lead.websiteTitle || "",
    searchLinks
  };

  const targetUrl = normalizeWebsiteUrl(lead.website);

  if (!targetUrl) {
    return NextResponse.json(enriched);
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "user-agent": "Firekworks Leads CRM enrichment/1.0"
      },
      signal: AbortSignal.timeout(8000)
    });

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!response.ok || !contentType.includes("text/html")) {
      return NextResponse.json(enriched);
    }

    const html = await response.text();
    const links = extractLinks(html, targetUrl);
    const title = extractTagContent(html, "title");
    const description = extractMeta(html, "description");
    const favicon = extractFavicon(html, targetUrl);

    return NextResponse.json({
      ...enriched,
      description: description || enriched.description,
      instagramUrl: enriched.instagramUrl || findSocialUrl(links, ["instagram.com"]),
      facebookUrl: enriched.facebookUrl || findSocialUrl(links, ["facebook.com", "fb.com"]),
      whatsappUrl:
        enriched.whatsappUrl || findSocialUrl(links, ["wa.me", "api.whatsapp.com", "whatsapp.com"]),
      logoUrl: favicon || enriched.logoUrl,
      websiteTitle: title || enriched.websiteTitle
    });
  } catch (error) {
    return NextResponse.json({
      ...enriched,
      error: error instanceof Error ? error.message : "No se pudo enriquecer la web"
    });
  }
}

function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function extractLinks(html: string, baseUrl: string) {
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = LINK_PATTERN.exec(html))) {
    try {
      links.push(new URL(decodeHtml(match[1]), baseUrl).toString());
    } catch {
      continue;
    }
  }

  return links;
}

function findSocialUrl(links: string[], hosts: string[]) {
  return links.find((link) => hosts.some((host) => link.toLowerCase().includes(host))) || "";
}

function extractTagContent(html: string, tag: string) {
  const pattern = new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, "is");
  return cleanText(html.match(pattern)?.[1] || "");
}

function extractMeta(html: string, name: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of tags) {
    const attrs = extractAttributes(tag);
    const metaName = (attrs.name || attrs.property || "").toLowerCase();
    if (metaName === name || metaName === `og:${name}`) {
      return cleanText(attrs.content || "");
    }
  }

  return "";
}

function extractFavicon(html: string, baseUrl: string) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  const iconTag = tags.find((tag) => {
    const rel = extractAttributes(tag).rel || "";
    return /(?:^|\s)(icon|shortcut icon|apple-touch-icon)(?:\s|$)/i.test(rel);
  });
  const href = iconTag ? extractAttributes(iconTag).href : "";

  try {
    return href ? new URL(decodeHtml(href), baseUrl).toString() : new URL("/favicon.ico", baseUrl).toString();
  } catch {
    return "";
  }
}

function extractAttributes(tag: string) {
  const attrs: Record<string, string> = {};
  const pattern = /([\w:-]+)\s*=\s*["']([^"']*)["']/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(tag))) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[2]);
  }

  return attrs;
}

function createSearchLinks(lead: Pick<Lead, "name" | "city">) {
  const query = `${lead.name} ${lead.city}`.trim();

  return {
    instagram: `https://www.google.com/search?q=${encodeURIComponent(`${query} instagram`)}`,
    facebook: `https://www.google.com/search?q=${encodeURIComponent(`${query} facebook`)}`,
    owner: `https://www.google.com/search?q=${encodeURIComponent(`${query} dueño gerente`)}`
  };
}

function cleanText(value: string) {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}
