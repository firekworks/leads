"use client";

import { useEffect, useMemo, useState } from "react";
import type { RouteStop } from "@/types/lead";
import { scoreLabel, scoreTone } from "@/lib/scoring";

type RoutePlannerProps = {
  stops: RouteStop[];
  onSelect: (lead: RouteStop) => void;
  onMarkVisited?: (leads: RouteStop[]) => void;
};

const ROUTE_PAGE_SIZE = 70;

export function RoutePlanner({ stops, onSelect, onMarkVisited }: RoutePlannerProps) {
  const [city, setCity] = useState("");
  const [temperature, setTemperature] = useState("");
  const [visibleCount, setVisibleCount] = useState(ROUTE_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const cities = useMemo(() => Array.from(new Set(stops.map((stop) => stop.city))).sort((a, b) => a.localeCompare(b, "es")), [stops]);

  const filteredStops = useMemo(() => {
    return stops.filter((stop) => {
      const matchesCity = city ? stop.city === city : true;
      const label = scoreLabel(stop.score);
      const matchesTemperature = temperature ? label === temperature : true;
      return matchesCity && matchesTemperature && !stop.isInvalid && !stop.isDisqualified;
    });
  }, [city, stops, temperature]);

  const visibleStops = filteredStops.slice(0, visibleCount);
  const selectedStops = selectedIds
    .map((id) => stops.find((stop) => stop.id === id))
    .filter(Boolean) as RouteStop[];

  useEffect(() => {
    setVisibleCount(ROUTE_PAGE_SIZE);
  }, [city, temperature, stops]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => stops.some((stop) => stop.id === id)));
  }, [stops]);

  function toggleStop(stop: RouteStop) {
    setSelectedIds((current) => current.includes(stop.id) ? current.filter((id) => id !== stop.id) : [...current, stop.id]);
  }

  function moveSelected(index: number, direction: -1 | 1) {
    setSelectedIds((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function mapsUrl() {
    const route = selectedStops.length ? selectedStops : visibleStops.slice(0, 8);
    if (!route.length) return "";
    const [first, ...rest] = route;
    const destination = rest.at(-1) || first;
    const waypoints = rest.slice(0, -1).map(stopQuery).join("|");
    const params = new URLSearchParams({
      api: "1",
      origin: stopQuery(first),
      destination: stopQuery(destination),
      travelmode: "driving"
    });
    if (waypoints) params.set("waypoints", waypoints);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  function copyList() {
    const route = selectedStops.length ? selectedStops : visibleStops.slice(0, 12);
    void navigator.clipboard?.writeText(
      route.map((stop, index) => `${index + 1}. ${stop.name} · ${stop.city} · ${stop.address || stop.googleMapsUrl || ""}`).join("\n")
    );
  }

  return (
    <div className="route-planner">
      <section className="route-control">
        <div>
          <span className="eyebrow">Ruta</span>
          <h2>{selectedStops.length || visibleStops.length}</h2>
        </div>
        <select value={city} onChange={(event) => setCity(event.target.value)} aria-label="Ciudad ruta">
          <option value="">Todas</option>
          {cities.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={temperature} onChange={(event) => setTemperature(event.target.value)} aria-label="Temperatura ruta">
          <option value="">Temperatura</option>
          {["Prioritario", "Caliente", "Templado", "Frío", "Revisar"].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <a className="button" href={mapsUrl() || undefined} target="_blank" rel="noreferrer" aria-disabled={!visibleStops.length}>
          Maps
        </a>
        <button className="button button--ghost" type="button" onClick={copyList} disabled={!visibleStops.length}>
          Copiar
        </button>
        <button
          className="button button--ghost"
          type="button"
          onClick={() => onMarkVisited?.(selectedStops)}
          disabled={!selectedStops.length}
        >
          Visitados
        </button>
      </section>

      <div className="route-grid">
        <section className="route-selection">
          <header>
            <span>Orden</span>
            <strong>{selectedStops.length}</strong>
          </header>
          {selectedStops.length ? selectedStops.map((stop, index) => (
            <article key={stop.id} className="route-selected">
              <strong>{index + 1}</strong>
              <button type="button" onClick={() => onSelect(stop)}>
                <span>{stop.name}</span>
                <small>{stop.city} · {stop.address || "Coordenadas pendientes"}</small>
              </button>
              <div>
                <button type="button" onClick={() => moveSelected(index, -1)} disabled={index === 0}>^</button>
                <button type="button" onClick={() => moveSelected(index, 1)} disabled={index === selectedStops.length - 1}>v</button>
              </div>
            </article>
          )) : (
            <p className="empty-state">Selecciona comercios.</p>
          )}
        </section>
      </div>

      <div className="list-status">
        <span>Mostrando {visibleStops.length} de {filteredStops.length}</span>
        {visibleStops.length < filteredStops.length ? (
          <button type="button" onClick={() => setVisibleCount((current) => current + ROUTE_PAGE_SIZE)}>Ver más</button>
        ) : null}
      </div>

      <div className="route-stop-list">
        {visibleStops.map((lead) => (
          <article className="route-stop" key={lead.id}>
            <label>
              <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleStop(lead)} />
            </label>
            <button type="button" onClick={() => onSelect(lead)}>
              <span className={`route-stop__score score-pill score-pill--${scoreTone(lead.score)}`}>{lead.score}</span>
              <div>
                <strong>{lead.name}</strong>
                <small>{lead.city} · {lead.address || "Coordenadas pendientes"}</small>
              </div>
              <em>{scoreLabel(lead.score)}</em>
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function stopQuery(stop: RouteStop) {
  if (typeof stop.latitude === "number" && typeof stop.longitude === "number") {
    return `${stop.latitude},${stop.longitude}`;
  }
  return `${stop.name} ${stop.address} ${stop.city} España`.trim();
}
