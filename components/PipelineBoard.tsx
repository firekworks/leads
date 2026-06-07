"use client";

import { useState } from "react";
import type { Lead, LeadStatus } from "@/types/lead";
import { scoreLabel, scoreTone } from "@/lib/scoring";

type PipelineBoardProps = {
  leads: Lead[];
  selectedId: string;
  onSelect: (lead: Lead) => void;
  onStatusChange: (lead: Lead, status: LeadStatus) => void | Promise<void>;
};

const COLUMN_PAGE_SIZE = 28;
const lanes: Array<{
  id: string;
  title: string;
  tone: string;
  dropStatus: LeadStatus;
  statuses: LeadStatus[];
}> = [
  { id: "discard", title: "Descartar", tone: "discard", dropStatus: "No contactar", statuses: ["No contactar", "No encaja"] },
  { id: "detected", title: "Detectados", tone: "detected", dropStatus: "Detectado", statuses: ["Detectado", "Validado"] },
  { id: "priority", title: "Priorizados", tone: "priority", dropStatus: "Prioritario", statuses: ["Prioritario"] },
  { id: "contacted", title: "Contactados", tone: "contacted", dropStatus: "Contactado", statuses: ["Contactado", "Respondió"] },
  {
    id: "closing",
    title: "Cierre",
    tone: "closing",
    dropStatus: "Reunión agendada",
    statuses: ["Reunión agendada", "Diagnóstico hecho", "Propuesta enviada", "Negociación", "Ganado", "Perdido"]
  }
];

export function PipelineBoard({ leads, selectedId, onSelect, onStatusChange }: PipelineBoardProps) {
  const [columnLimits, setColumnLimits] = useState<Record<string, number>>({});
  const [draggedId, setDraggedId] = useState("");
  const [lastMove, setLastMove] = useState<{ lead: Lead; previousStatus: LeadStatus; nextStatus: LeadStatus } | null>(null);

  return (
    <div className="pipeline-stack">
      {lastMove ? (
        <div className="pipeline-undo" role="status">
          <span>{lastMove.lead.name} movido a {shortStatus(lastMove.nextStatus)}</span>
          <button
            type="button"
            onClick={() => {
              void onStatusChange(lastMove.lead, lastMove.previousStatus);
              setLastMove(null);
            }}
          >
            Deshacer
          </button>
        </div>
      ) : null}

      <div className="pipeline-board pipeline-board--compact">
        {lanes.map((lane) => {
        const columnLeads = leads.filter((lead) => lane.statuses.includes(lead.status));
        const visibleLimit = columnLimits[lane.id] || COLUMN_PAGE_SIZE;
        const visibleLeads = columnLeads.slice(0, visibleLimit);

        return (
          <section
            className={`pipeline-column pipeline-column--${lane.tone}`}
            key={lane.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const leadId = event.dataTransfer.getData("text/plain") || draggedId;
              const lead = leads.find((item) => item.id === leadId);
              setDraggedId("");
              if (lead && lead.status !== lane.dropStatus) {
                setLastMove({ lead, previousStatus: lead.status, nextStatus: lane.dropStatus });
                void onStatusChange(lead, lane.dropStatus);
              }
            }}
          >
            <header>
              <span>{lane.title}</span>
              <strong>{columnLeads.length}</strong>
            </header>

            {lane.id === "closing" ? (
              <div className="pipeline-subchips">
                {["Reunión agendada", "Propuesta enviada", "Ganado", "Perdido"].map((status) => (
                  <span key={status}>{shortStatus(status as LeadStatus)}</span>
                ))}
              </div>
            ) : null}

            <div className="pipeline-column__list">
              {columnLeads.length ? (
                <>
                  {visibleLeads.map((lead) => (
                    <article
                      className={
                        selectedId === lead.id
                          ? "pipeline-card pipeline-card--active"
                          : draggedId === lead.id
                            ? "pipeline-card pipeline-card--dragging"
                            : "pipeline-card"
                      }
                      key={lead.id}
                      draggable
                      onDragStart={(event) => {
                        setDraggedId(lead.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", lead.id);
                      }}
                      onDragEnd={() => setDraggedId("")}
                    >
                      <button className="pipeline-card__body" type="button" onClick={() => onSelect(lead)}>
                        <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>
                          <strong>{lead.score}</strong>
                        </span>
                        <span className="pipeline-card__copy">
                          <strong>{lead.name}</strong>
                          <small>{lead.city} · {lead.sector}</small>
                          <em>{scoreLabel(lead.score)} · {shortStatus(lead.status)}</em>
                        </span>
                        <span className="pipeline-card__signals" aria-label="Señales">
                          {pipelineChips(lead).map((chip) => <i key={chip}>{chip}</i>)}
                        </span>
                      </button>
                    </article>
                  ))}
                  {visibleLeads.length < columnLeads.length ? (
                    <button
                      className="pipeline-more"
                      type="button"
                      onClick={() =>
                        setColumnLimits((current) => ({
                          ...current,
                          [lane.id]: visibleLimit + COLUMN_PAGE_SIZE
                        }))
                      }
                    >
                      Ver más
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="empty-state">Vacío</p>
              )}
            </div>
          </section>
        );
        })}
      </div>
    </div>
  );
}

function pipelineChips(lead: Lead) {
  const chips: string[] = [];
  if (lead.instagramUrl) chips.push("IG");
  if (lead.website) chips.push("W");
  if (lead.phone || lead.whatsappUrl) chips.push("T");
  if (lead.googleMapsUrl) chips.push("M");
  if (!chips.length) chips.push("Pendiente");
  return chips.slice(0, 2);
}

function shortStatus(status: LeadStatus) {
  const labels: Record<LeadStatus, string> = {
    Detectado: "Detectado",
    Validado: "Validado",
    Prioritario: "Prioridad",
    Contactado: "Contactado",
    Respondió: "Respondió",
    "Reunión agendada": "Reunión",
    "Diagnóstico hecho": "Diagnóstico",
    "Propuesta enviada": "Propuesta",
    Negociación: "Negociación",
    Ganado: "Ganado",
    Perdido: "Perdido",
    "No encaja": "No encaja",
    "No contactar": "No contactar"
  };
  return labels[status];
}
