import type { Lead, LeadStatus } from "@/types/lead";
import { scoreTone } from "@/lib/scoring";
import { statusTone } from "@/lib/status";

type PipelineBoardProps = {
  leads: Lead[];
  statuses: LeadStatus[];
};

export function PipelineBoard({ leads, statuses }: PipelineBoardProps) {
  return (
    <div className="pipeline-board">
      {statuses.map((status) => {
        const columnLeads = leads.filter((lead) => lead.status === status);

        return (
          <section className={`pipeline-column pipeline-column--${statusTone(status)}`} key={status}>
            <header>
              <span>{status}</span>
              <strong>{columnLeads.length}</strong>
            </header>
            <div className="pipeline-column__list">
              {columnLeads.length ? (
                columnLeads.map((lead) => (
                  <article className="pipeline-card" key={lead.id}>
                    <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>
                      {lead.score}
                    </span>
                    <strong>{lead.name}</strong>
                    <small>
                      {lead.city} · {lead.nextAction}
                    </small>
                  </article>
                ))
              ) : (
                <p className="empty-state">Sin leads todavía</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
