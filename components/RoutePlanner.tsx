import type { RouteStop } from "@/types/lead";

type RoutePlannerProps = {
  stops: RouteStop[];
};

export function RoutePlanner({ stops }: RoutePlannerProps) {
  return (
    <div className="route-list">
      {stops.map((lead) => (
        <article className="route-stop" key={lead.id}>
          <span className="route-stop__order">{lead.visitOrder}</span>
          <div>
            <strong>{lead.name}</strong>
            <small>
              {lead.city} · {lead.address}
            </small>
            <p>{lead.routeReason}</p>
          </div>
          <span className="route-stop__score">{lead.score}</span>
        </article>
      ))}
    </div>
  );
}
