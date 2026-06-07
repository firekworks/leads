"use client";

import { AppShell } from "@/components/AppShell";
import { Background } from "@/components/Background";
import { useInternalAuth } from "@/components/AuthGate";

const rules = [
  { label: "Demanda visible", value: "0-25", text: "Rating, reseñas, fotos, sector y señales de demanda local." },
  { label: "Capacidad de pago", value: "0-25", text: "Sector, ticket, inversión visible y fuentes empresariales si existen." },
  { label: "Brecha digital", value: "0-20", text: "Web, Instagram, WhatsApp, fotos, CTA y reservas solo si están verificados." },
  { label: "Facilidad contacto", value: "0-15", text: "Teléfono, WhatsApp, web, dirección y dueño/contacto si existe fuente." },
  { label: "Prioridad presencial", value: "0-15", text: "Cercanía, ruta, sector prioritario y potencial de mensualidad." }
];

const penalties = [
  "Ayuntamiento o administración",
  "Policía, Guardia Civil o emergencias",
  "Hospital/colegio público",
  "Turismo municipal o monumento",
  "Parque público u oficina pública",
  "Asociación sin ánimo comercial evidente",
  "Cerrado, duplicado o sin encaje comercial"
];

export function ScoringWorkspace() {
  const { profile } = useInternalAuth();

  return (
    <main className="app">
      <Background />
      <AppShell currentView="system" userLabel={`${profile.role} · ${profile.email}`} sourceLabel="Reglas">
        <header className="workspace-header workspace-header--compact">
          <div>
            <p className="eyebrow">Sistema</p>
            <h1>Scoring</h1>
            <p className="workspace-subtitle">Temperatura comercial basada en evidencias, no en intuición.</p>
          </div>
        </header>

        <section className="scoring-layout">
          <article className="system-panel">
            <header>
              <span>Pesos</span>
              <strong>100</strong>
            </header>
            <div>
              {rules.map((rule) => (
                <div className="scoring-rule" key={rule.label}>
                  <strong>{rule.label}</strong>
                  <span>{rule.text}</span>
                  <em>{rule.value}</em>
                </div>
              ))}
            </div>
          </article>

          <article className="system-panel">
            <header>
              <span>Penalizaciones</span>
              <strong>Auto descarte</strong>
            </header>
            <div>
              {penalties.map((penalty) => (
                <div className="system-row" key={penalty}>
                  <span>{penalty}</span>
                  <strong>-</strong>
                </div>
              ))}
            </div>
          </article>
        </section>
      </AppShell>
    </main>
  );
}
