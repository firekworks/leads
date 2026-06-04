"use client";

import type { Lead, LeadStatus } from "@/types/lead";
import { estimateMonthlyValue, scoreTone } from "@/lib/scoring";
import { statusTone } from "@/lib/status";

type PipelineBoardProps = {
  leads: Lead[];
  statuses: LeadStatus[];
  selectedId: string;
  onSelect: (lead: Lead) => void;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
};

export function PipelineBoard({ leads, statuses, selectedId, onSelect, onStatusChange }: PipelineBoardProps) {
  return (
    <div className="pipeline-board">
      {statuses.map((status, statusIndex) => {
        const columnLeads = leads.filter((lead) => lead.status === status && !lead.isInvalid);

        return (
          <section className={`pipeline-column pipeline-column--${statusTone(status)}`} key={status}>
            <header>
              <span>{status}</span>
              <strong>{columnLeads.length}</strong>
            </header>
            <div className="pipeline-column__list">
              {columnLeads.length ? (
                columnLeads.map((lead) => (
                  <article
                    className={selectedId === lead.id ? "pipeline-card pipeline-card--active" : "pipeline-card"}
                    key={lead.id}
                  >
                    <button className="pipeline-card__body" type="button" onClick={() => onSelect(lead)}>
                      <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>
                        {lead.score}
                      </span>
                      <span>
                        <strong>{lead.name}</strong>
                        <small>
                          {lead.city} · {lead.contentUse} · ≈ {estimateMonthlyValue(lead)}€/mes
                        </small>
                      </span>
                    </button>
                    <div className="pipeline-card__moves">
                      <button
                        type="button"
                        disabled={statusIndex === 0}
                        onClick={() => onStatusChange(lead, statuses[statusIndex - 1])}
                        aria-label="Retroceder estado"
                      >
                        &lt;
                      </button>
                      <button
                        type="button"
                        disabled={statusIndex === statuses.length - 1}
                        onClick={() => onStatusChange(lead, statuses[statusIndex + 1])}
                        aria-label="Avanzar estado"
                      >
                        &gt;
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-state">Vacío</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
