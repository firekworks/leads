"use client";

import { useEffect, useState } from "react";
import type { RouteStop } from "@/types/lead";

type RoutePlannerProps = {
  stops: RouteStop[];
  onSelect: (lead: RouteStop) => void;
};

const ROUTE_PAGE_SIZE = 80;

export function RoutePlanner({ stops, onSelect }: RoutePlannerProps) {
  const [visibleCount, setVisibleCount] = useState(ROUTE_PAGE_SIZE);
  const visibleStops = stops.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(ROUTE_PAGE_SIZE);
  }, [stops]);

  return (
    <div className="route-list">
      <div className="list-status">
        <span>
          Mostrando {visibleStops.length} de {stops.length}
        </span>
        {visibleStops.length < stops.length ? (
          <button type="button" onClick={() => setVisibleCount((current) => current + ROUTE_PAGE_SIZE)}>
            Ver más
          </button>
        ) : null}
      </div>
      {visibleStops.map((lead) => (
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
