import type { RouteStop } from "@/types/lead";

type RoutePlannerProps = {
  stops: RouteStop[];
  onSelect: (lead: RouteStop) => void;
};

export function RoutePlanner({ stops, onSelect }: RoutePlannerProps) {
  return (
    <div className="route-list">
      {stops.map((lead) => (
        <button className="route-stop" key={lead.id} type="button" onClick={() => onSelect(lead)}>
          <span className="route-stop__order">{lead.visitOrder}</span>
          <div>
            <strong>{lead.name}</strong>
            <small>
              {lead.city} · {lead.address}
            </small>
            <p>{lead.routeReason}</p>
          </div>
          <span className="route-stop__score">{lead.score}</span>
        </button>
      ))}
    </div>
  );
}
