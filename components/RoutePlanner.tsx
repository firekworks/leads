"use client";

import { useEffect, useState } from "react";
import type { RouteStop } from "@/types/lead";

type RoutePlannerProps = {
  stops: RouteStop[];
  onSelect: (lead: RouteStop) => void;
};

const ROUTE_PAGE_SIZE = 80;
const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  Biar: { x: 18, y: 34 },
  Onil: { x: 40, y: 54 },
  Castalla: { x: 47, y: 44 },
  Ibi: { x: 66, y: 52 },
  Tibi: { x: 76, y: 76 }
};
const MAP_BOUNDS = {
  minLat: 38.48,
  maxLat: 38.68,
  minLng: -0.84,
  maxLng: -0.52
};

export function RoutePlanner({ stops, onSelect }: RoutePlannerProps) {
  const [visibleCount, setVisibleCount] = useState(ROUTE_PAGE_SIZE);
  const visibleStops = stops.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(ROUTE_PAGE_SIZE);
  }, [stops]);

  return (
    <div className="route-list">
      <section className="route-map" aria-label="Mapa de prioridad comercial">
        <div className="route-map__cities">
          {Object.entries(CITY_POSITIONS).map(([city, position]) => (
            <span key={city} style={{ left: `${position.x}%`, top: `${position.y}%` }}>
              {city}
            </span>
          ))}
        </div>
        {visibleStops.slice(0, 70).map((lead, index) => {
          const position = leadPosition(lead, index);
          const priority = lead.score >= 80 ? "high" : lead.score >= 60 ? "medium" : "low";

          return (
            <button
              className={`route-map__dot route-map__dot--${priority}`}
              key={lead.id}
              type="button"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              onClick={() => onSelect(lead)}
              title={`${lead.name} · ${lead.city} · ${lead.score}`}
            >
              <span>{lead.visitOrder}</span>
            </button>
          );
        })}
      </section>
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

function leadPosition(lead: RouteStop, index: number) {
  if (typeof lead.latitude === "number" && typeof lead.longitude === "number") {
    const x = ((lead.longitude - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
    const y = 100 - ((lead.latitude - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
    return { x: clampMapValue(x), y: clampMapValue(y) };
  }

  const base = CITY_POSITIONS[lead.city] || { x: 50, y: 50 };
  const ring = (index % 9) - 4;
  const layer = Math.floor((index % 27) / 9);

  return {
    x: clampMapValue(base.x + ring * 2.4),
    y: clampMapValue(base.y + (layer - 1) * 4.2)
  };
}

function clampMapValue(value: number) {
  return Math.max(5, Math.min(95, value));
}
