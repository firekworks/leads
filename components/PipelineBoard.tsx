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

const COLUMN_PAGE_SIZE = 18;
const lanes: Array<{
  id: string;
  title: string;
  tone: string;
  dropStatus: LeadStatus;
  statuses: LeadStatus[];
}> = [
  { id: "review", title: "Revisar", tone: "review", dropStatus: "Detectado", statuses: ["Detectado", "Validado"] },
  { id: "priority", title: "Prioritario", tone: "priority", dropStatus: "Prioritario", statuses: ["Prioritario"] },
  { id: "visited", title: "Visitado", tone: "visited", dropStatus: "Contactado", statuses: ["Contactado", "Respondió", "Reunión agendada", "Diagnóstico hecho"] },
  { id: "proposal", title: "Propuesta", tone: "proposal", dropStatus: "Propuesta enviada", statuses: ["Propuesta enviada"] },
  { id: "negotiation", title: "Negociación", tone: "negotiation", dropStatus: "Negociación", statuses: ["Negociación"] },
  { id: "client", title: "Cliente", tone: "client", dropStatus: "Ganado", statuses: ["Ganado"] },
  { id: "discard", title: "Descartado", tone: "discard", dropStatus: "No contactar", statuses: ["Perdido", "No encaja", "No contactar"] }
];

export function PipelineBoard({ leads, selectedId, onSelect, onStatusChange }: PipelineBoardProps) {
  const [columnLimits, setColumnLimits] = useState<Record<string, number>>({});
  const [draggedId, setDraggedId] = useState("");
  const [lastMove, setLastMove] = useState<{ lead: Lead; previousStatus: LeadStatus; nextStatus: LeadStatus } | null>(null);

  function moveLead(lead: Lead, status: LeadStatus) {
    if (lead.status === status) return;
    setLastMove({ lead, previousStatus: lead.status, nextStatus: status });
    void onStatusChange(lead, status);
  }

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

      <div className="pipeline-board">
        {lanes.map((lane, laneIndex) => {
          const columnLeads = leads.filter((lead) => lane.statuses.includes(lead.status));
          const visibleLimit = columnLimits[lane.id] || COLUMN_PAGE_SIZE;
          const visibleLeads = columnLeads.slice(0, visibleLimit);
          const prevLane = lanes[laneIndex - 1];
          const nextLane = lanes[laneIndex + 1];

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
                if (lead) moveLead(lead, lane.dropStatus);
              }}
            >
              <header>
                <span>{lane.title}</span>
                <strong>{columnLeads.length}</strong>
              </header>

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
                            <em>{lead.nextAction || "Definir siguiente acción"}</em>
                            <b>{scoreLabel(lead.score)} · {shortStatus(lead.status)}</b>
                          </span>
                        </button>
                        <div className="pipeline-card__actions">
                          <button type="button" disabled={!prevLane} onClick={() => prevLane && moveLead(lead, prevLane.dropStatus)}>Atrás</button>
                          <button type="button" disabled={!nextLane} onClick={() => nextLane && moveLead(lead, nextLane.dropStatus)}>Avanzar</button>
                        </div>
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

function shortStatus(status: LeadStatus) {
  const labels: Record<LeadStatus, string> = {
    Detectado: "Detectado",
    Validado: "Validado",
    Prioritario: "Prioridad",
    Contactado: "Contactado",
    Respondió: "Respondió",
    "Reunión agendada": "Reunión",
    "Diagnóstico hecho": "Visitado",
    "Propuesta enviada": "Propuesta",
    Negociación: "Negociación",
    Ganado: "Cliente",
    Perdido: "Perdido",
    "No encaja": "No encaja",
    "No contactar": "No contactar"
  };
  return labels[status];
}
