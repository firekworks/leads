"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Background } from "@/components/Background";
import { useInternalAuth } from "@/components/AuthGate";
import type { Lead } from "@/types/lead";

const cities = ["Castalla", "Ibi", "Onil", "Tibi", "Biar", "Sax", "Elda", "Petrer"];
const sectors = [
  "Restaurantes",
  "Cafeterías",
  "Bares",
  "Clínicas",
  "Dentistas privados",
  "Gimnasios",
  "Inmobiliarias",
  "Hoteles",
  "Alojamientos privados",
  "Moda",
  "Talleres",
  "Academias privadas",
  "Peluquerías",
  "Centros de belleza",
  "Ocio",
  "Tiendas especializadas"
];

type ScanPayload = {
  ok?: boolean;
  mode?: string;
  estimatedRequests?: number;
  requestsUsed?: number;
  uniqueCandidates?: number;
  imported?: number;
  leads?: Lead[];
  message?: string;
  error?: string;
};

export function ScanWorkspace() {
  const { accessToken, profile } = useInternalAuth();
  const [city, setCity] = useState("Castalla");
  const [sector, setSector] = useState("Restaurantes");
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<ScanPayload | null>(null);

  async function runScan(mode: "preview" | "import") {
    setLoading(true);
    try {
      const response = await fetch("/api/places/import", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          city,
          sector,
          mode,
          allowPaidRequests: false,
          maxRequests: 1,
          pageSize: 10,
          returnLeads: false
        })
      });
      const nextPayload = (await response.json()) as ScanPayload;
      setPayload(nextPayload);
    } catch (error) {
      setPayload({ error: error instanceof Error ? error.message : "No se pudo ejecutar Scan" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <Background />
      <AppShell currentView="system" userLabel={`${profile.role} · ${profile.email}`} sourceLabel="System">
        <header className="workspace-header workspace-header--compact">
          <div>
            <p className="eyebrow">SYSTEM / SCAN</p>
            <h1>Scan</h1>
            <p className="workspace-subtitle">Escanea zonas sin exponer claves.</p>
          </div>
        </header>

        <section className="scan-module">
          <article className="scan-panel">
            <div>
              <span className="eyebrow">Entrada</span>
              <h2>Buscar comercios</h2>
            </div>
            <label>
              Ciudad
              <select value={city} onChange={(event) => setCity(event.target.value)}>
                {cities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Sector
              <select value={sector} onChange={(event) => setSector(event.target.value)}>
                {sectors.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <div className="detail-actions">
              <button className="button button--ghost" type="button" onClick={() => runScan("preview")} disabled={loading}>
                Plan sin coste
              </button>
              <button className="button" type="button" onClick={() => runScan("import")} disabled={loading}>
                Preparar importación
              </button>
            </div>
          </article>

          <article className="scan-panel scan-panel--result">
            <span className="eyebrow">Resultado</span>
            {payload ? (
              <div className="scan-result">
                <strong>{payload.error ? "Revisar" : payload.mode || "Scan"}</strong>
                <p>{payload.error || payload.message || "Búsqueda procesada."}</p>
                <div className="scan-metrics">
                  <div><span>Peticiones</span><strong>{payload.requestsUsed ?? payload.estimatedRequests ?? 0}</strong></div>
                  <div><span>Candidatos</span><strong>{payload.uniqueCandidates ?? 0}</strong></div>
                  <div><span>Guardados</span><strong>{payload.imported ?? 0}</strong></div>
                </div>
                {payload.error?.includes("GOOGLE_PLACES_API_KEY") ? (
                  <code>Configura GOOGLE_PLACES_API_KEY en Vercel para ejecutar importaciones.</code>
                ) : null}
              </div>
            ) : (
              <div className="empty-panel">
                <strong>Preparado</strong>
                <span>La previsualización no consume Places.</span>
              </div>
            )}
          </article>
        </section>
      </AppShell>
    </main>
  );
}
