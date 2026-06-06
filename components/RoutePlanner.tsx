"use client";

import { useEffect, useMemo, useState } from "react";
import type { RouteStop } from "@/types/lead";
import { scoreLabel, scoreTone } from "@/lib/scoring";

type RoutePlannerProps = {
  stops: RouteStop[];
  onSelect: (lead: RouteStop) => void;
  onMarkVisited?: (leads: RouteStop[]) => void;
};

const ROUTE_PAGE_SIZE = 60;
const minScores = {
  Revisar: 0,
  Frío: 25,
  Templado: 50,
  Caliente: 70,
  Prioritario: 85
} as const;

type MinTemperature = keyof typeof minScores | "";

export function RoutePlanner({ stops, onSelect, onMarkVisited }: RoutePlannerProps) {
  const [city, setCity] = useState("");
  const [minTemperature, setMinTemperature] = useState<MinTemperature>("");
  const [onlyPhone, setOnlyPhone] = useState(false);
  const [onlyMaps, setOnlyMaps] = useState(false);
  const [sortBy, setSortBy] = useState<"score" | "nearby">("score");
  const [visibleCount, setVisibleCount] = useState(ROUTE_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const cities = useMemo(() => Array.from(new Set(stops.map((stop) => stop.city).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es")), [stops]);

  const filteredStops = useMemo(() => {
    const minScore = minTemperature ? minScores[minTemperature] : 0;
    return stops
      .filter((stop) => {
        const matchesCity = city ? stop.city === city : true;
        return (
          matchesCity &&
          stop.score >= minScore &&
          !stop.isInvalid &&
          !stop.isDisqualified &&
          (!onlyPhone || Boolean(stop.phone || stop.whatsappUrl)) &&
          (!onlyMaps || Boolean(stop.googleMapsUrl || (typeof stop.latitude === "number" && typeof stop.longitude === "number")))
        );
      })
      .sort((a, b) => {
        if (sortBy === "nearby") return `${a.city}${a.address}`.localeCompare(`${b.city}${b.address}`, "es") || b.score - a.score;
        return b.score - a.score;
      });
  }, [city, minTemperature, onlyMaps, onlyPhone, sortBy, stops]);

  const visibleStops = filteredStops.slice(0, visibleCount);
  const selectedStops = selectedIds
    .map((id) => stops.find((stop) => stop.id === id))
    .filter(Boolean) as RouteStop[];

  useEffect(() => {
    setVisibleCount(ROUTE_PAGE_SIZE);
  }, [city, minTemperature, onlyMaps, onlyPhone, sortBy, stops]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => stops.some((stop) => stop.id === id)));
  }, [stops]);

  function toggleStop(stop: RouteStop) {
    setSelectedIds((current) => current.includes(stop.id) ? current.filter((id) => id !== stop.id) : [...current, stop.id]);
  }

  function moveSelected(from: number, to: number) {
    setSelectedIds((current) => {
      if (to < 0 || to >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
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
        <select value={city} onChange={(event) => setCity(event.target.value)} aria-label="Ciudad ruta">
          <option value="">Ciudad</option>
          {cities.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={minTemperature} onChange={(event) => setMinTemperature(event.target.value as MinTemperature)} aria-label="Temperatura mínima">
          <option value="">Temperatura mínima</option>
          {Object.keys(minScores).map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "score" | "nearby")} aria-label="Orden">
          <option value="score">Score</option>
          <option value="nearby">Cercanía</option>
        </select>
        <label>
          <input type="checkbox" checked={onlyPhone} onChange={(event) => setOnlyPhone(event.target.checked)} />
          Teléfono
        </label>
        <label>
          <input type="checkbox" checked={onlyMaps} onChange={(event) => setOnlyMaps(event.target.checked)} />
          Maps
        </label>
      </section>

      <div className="route-grid">
        <section className="route-candidates" aria-label="Leads para ruta">
          <header>
            <span>{visibleStops.length} de {filteredStops.length}</span>
            {visibleStops.length < filteredStops.length ? (
              <button type="button" onClick={() => setVisibleCount((current) => current + ROUTE_PAGE_SIZE)}>Ver más</button>
            ) : null}
          </header>

          <div className="route-stop-list">
            {visibleStops.map((lead) => (
              <article className="route-stop" key={lead.id}>
                <label aria-label={`Añadir ${lead.name}`}>
                  <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleStop(lead)} />
                </label>
                <button type="button" onClick={() => onSelect(lead)}>
                  <span>
                    <strong>{lead.name}</strong>
                    <small>{lead.city} · {lead.address || "Sin dirección"}</small>
                  </span>
                  <em>{scoreLabel(lead.score)}</em>
                  <b className={`route-stop__score score-pill score-pill--${scoreTone(lead.score)}`}>{lead.score}</b>
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="route-selection">
          <header>
            <span>Ruta</span>
            <strong>{selectedStops.length}</strong>
          </header>

          <div className="route-selected-list">
            {selectedStops.length ? selectedStops.map((stop, index) => (
              <article
                key={stop.id}
                className="route-selected"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) moveSelected(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
              >
                <strong>{index + 1}</strong>
                <button type="button" onClick={() => onSelect(stop)}>
                  <span>{stop.name}</span>
                  <small>{stop.city} · {stop.address || "Sin dirección"}</small>
                </button>
                <div>
                  <button type="button" onClick={() => moveSelected(index, index - 1)} disabled={index === 0}>↑</button>
                  <button type="button" onClick={() => moveSelected(index, index + 1)} disabled={index === selectedStops.length - 1}>↓</button>
                </div>
              </article>
            )) : (
              <p className="empty-state">Añade leads.</p>
            )}
          </div>

          <div className="route-actions">
            <a className="button" href={mapsUrl() || undefined} target="_blank" rel="noreferrer" aria-disabled={!selectedStops.length}>
              Abrir en Maps
            </a>
            <button className="button button--ghost" type="button" onClick={copyList} disabled={!selectedStops.length}>
              Copiar ruta
            </button>
            <button className="button button--ghost" type="button" onClick={() => onMarkVisited?.(selectedStops)} disabled={!selectedStops.length}>
              Marcar visitados
            </button>
          </div>
        </section>
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
