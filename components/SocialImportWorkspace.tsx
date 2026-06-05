"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Background } from "@/components/Background";
import { useInternalAuth } from "@/components/AuthGate";
import { loadLeads } from "@/lib/leads-repository";
import type { ContentUse, FollowersBucket, Lead } from "@/types/lead";

type ParsedSocialRow = {
  raw: string;
  name: string;
  city: string;
  instagramUrl: string;
  facebookUrl: string;
  followersBucket: FollowersBucket | "";
  contentUse: ContentUse | "";
  match: Lead | null;
  confidence: number;
};

type ImportResponse = {
  updated?: Array<{ id: string; name: string }>;
  unmatched?: Array<{ name: string }>;
  error?: string;
  message?: string;
};

const example = `Restaurante La Placa | Castalla | @laplaca | https://facebook.com/laplaca | 1.000 - 5.000 | Activo
Clínica Dental Albor | Ibi | https://instagram.com/clinicadentalalbor | +5.000 | Muy trabajado`;

export function SocialImportWorkspace() {
  const { accessToken, profile } = useInternalAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [message, setMessage] = useState("Cargando leads");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    loadLeads(accessToken).then((result) => {
      if (!active) return;
      setLeads(result.leads);
      setMessage(result.source === "supabase" ? "Supabase activo" : "Fallback local activo");
    });
    return () => {
      active = false;
    };
  }, [accessToken]);

  const rows = useMemo(() => parseSocialText(text, leads), [text, leads]);
  const matchedRows = rows.filter((row) => row.match && (row.instagramUrl || row.facebookUrl || row.followersBucket || row.contentUse));
  const unmatchedRows = rows.filter((row) => !row.match);

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/leads/social-import", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          items: matchedRows.map((row) => ({
            leadId: row.match?.id,
            name: row.name,
            city: row.city,
            instagramUrl: row.instagramUrl,
            facebookUrl: row.facebookUrl,
            followersBucket: row.followersBucket || undefined,
            contentUse: row.contentUse || undefined
          }))
        })
      });
      const payload = (await response.json()) as ImportResponse;
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar");
      setMessage(payload.message || `${payload.updated?.length || 0} perfiles guardados`);
      const refreshed = await loadLeads(accessToken);
      setLeads(refreshed.leads);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app">
      <Background />
      <AppShell
        currentView="importar"
        userLabel={`${profile.role} · ${profile.email}`}
        sourceLabel={message}
      >
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Importar redes</p>
            <h1>Perfiles sociales</h1>
            <p className="workspace-subtitle">Pega Instagram, Facebook, seguidores y uso de contenido sin gastar Google Places.</p>
          </div>
          <div className="header-actions">
            <span className="source-pill source-pill--supabase">{leads.length} leads cargados</span>
            <button className="button" type="button" onClick={handleSave} disabled={saving || !matchedRows.length}>
              {saving ? "Guardando" : `Guardar ${matchedRows.length}`}
            </button>
          </div>
        </header>

        <section className="social-import">
          <article className="social-import__panel">
            <div>
              <span className="eyebrow">Pegado rápido</span>
              <h2>Una línea por comercio</h2>
              <p>Formato flexible: nombre, ciudad, enlaces, rango de seguidores y uso de contenido.</p>
            </div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={example}
              rows={14}
            />
            <div className="social-import__stats">
              <span>{rows.length} filas</span>
              <span>{matchedRows.length} listas</span>
              <span>{unmatchedRows.length} revisar</span>
            </div>
          </article>

          <article className="social-import__panel social-import__panel--preview">
            <div>
              <span className="eyebrow">Previsualización</span>
              <h2>Matching</h2>
              <p>Solo se guardan filas con comercio encontrado y algún dato social.</p>
            </div>

            <div className="social-import__list">
              {rows.length ? rows.map((row) => (
                <section className={row.match ? "social-row" : "social-row social-row--unmatched"} key={row.raw}>
                  <div>
                    <strong>{row.name || "Sin nombre"}</strong>
                    <span>{row.city || "Ciudad no detectada"}</span>
                  </div>
                  <div>
                    <strong>{row.match?.name || "Sin match"}</strong>
                    <span>{row.match ? `${row.match.city} · ${Math.round(row.confidence * 100)}%` : "Revisar nombre/ciudad"}</span>
                  </div>
                  <div className="social-row__badges">
                    {row.instagramUrl ? <span className="badge badge--instagram">IG</span> : null}
                    {row.facebookUrl ? <span className="badge badge--facebook">FB</span> : null}
                    {row.followersBucket ? <span>{row.followersBucket}</span> : null}
                    {row.contentUse ? <span>{row.contentUse}</span> : null}
                  </div>
                </section>
              )) : (
                <div className="empty-panel">
                  <strong>Pega enlaces para empezar</strong>
                  <span>El matching se calcula en local antes de guardar.</span>
                </div>
              )}
            </div>
          </article>
        </section>
      </AppShell>
    </main>
  );
}

function parseSocialText(text: string, leads: Lead[]): ParsedSocialRow[] {
  return text
    .split(/\n+/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const instagramUrl = extractInstagram(raw);
      const facebookUrl = extractFacebook(raw);
      const followersBucket = extractFollowers(raw);
      const contentUse = extractContentUse(raw);
      const city = findCity(raw, leads);
      const name = extractName(raw, city);
      const match = findBestMatch(name, city, leads);

      return {
        raw,
        name,
        city,
        instagramUrl,
        facebookUrl,
        followersBucket,
        contentUse,
        match: match?.lead || null,
        confidence: match?.score || 0
      };
    });
}

function extractInstagram(value: string) {
  const url = value.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s,;|)]+/i)?.[0];
  if (url) return url;
  const handle = value.match(/(?:^|[\s|])@([a-z0-9_.]{2,})/i)?.[1];
  return handle ? `https://instagram.com/${handle}` : "";
}

function extractFacebook(value: string) {
  return value.match(/https?:\/\/(?:www\.)?(?:facebook|fb)\.com\/[^\s,;|)]+/i)?.[0] || "";
}

function extractFollowers(value: string): FollowersBucket | "" {
  const normalized = value.toLowerCase();
  if (normalized.includes("sin cuenta")) return "Sin cuenta";
  if (/[+]\s*5[.\s]?000|mas de 5[.\s]?000|más de 5[.\s]?000/i.test(value)) return "+5.000";
  if (/1[.\s]?000\s*[-–]\s*5[.\s]?000/i.test(value)) return "1.000 - 5.000";
  if (/<\s*1[.\s]?000|menos de 1[.\s]?000/i.test(value)) return "< 1.000";
  return "";
}

function extractContentUse(value: string): ContentUse | "" {
  const normalized = value.toLowerCase();
  if (normalized.includes("muy trabajado")) return "Muy trabajado";
  if (normalized.includes("activo")) return "Activo";
  if (normalized.includes("flojo") || normalized.includes("abandonado")) return "Flojo";
  if (normalized.includes("sin uso") || normalized.includes("sin redes")) return "Sin uso";
  return "";
}

function findCity(value: string, leads: Lead[]) {
  const cities = Array.from(new Set(leads.map((lead) => lead.city).filter(Boolean)));
  const normalized = normalizeForMatch(value);
  return cities.find((city) => normalized.includes(normalizeForMatch(city))) || "";
}

function extractName(raw: string, city: string) {
  const firstCell = raw.split("|")[0]?.trim() || raw;
  return firstCell
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/@[a-z0-9_.]+/gi, "")
    .replace(city, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestMatch(name: string, city: string, leads: Lead[]) {
  const target = normalizeForMatch(name);
  const targetCity = normalizeForMatch(city);
  let best: { lead: Lead; score: number } | null = null;

  for (const lead of leads) {
    const nameScore = similarity(target, normalizeForMatch(lead.name));
    const cityScore = targetCity && targetCity === normalizeForMatch(lead.city) ? 0.12 : targetCity ? -0.08 : 0;
    const score = nameScore + cityScore;
    if (!best || score > best.score) best = { lead, score };
  }

  return best && best.score >= 0.46 ? best : null;
}

function similarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.86;
  const aTokens = new Set(a.split(" ").filter((token) => token.length > 2));
  const bTokens = new Set(b.split(" ").filter((token) => token.length > 2));
  const matches = Array.from(aTokens).filter((token) => bTokens.has(token)).length;
  return matches / Math.max(aTokens.size || 1, bTokens.size || 1);
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
