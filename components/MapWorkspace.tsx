"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Lead } from "@/types/lead";
import { scoreLabel, scoreTone } from "@/lib/scoring";

type MapWorkspaceProps = {
  leads: Lead[];
  selectedId: string;
  onSelect: (lead: Lead) => void;
};

const focusCities = ["Castalla", "Ibi", "Onil", "Tibi", "Biar", "Sax", "Elda", "Petrer", "Alcoy"];

type GoogleMapsNamespace = {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
    SymbolPath: { CIRCLE: number };
  };
};

type GoogleMapInstance = {
  setCenter: (position: { lat: number; lng: number }) => void;
};

type GoogleMarkerInstance = {
  addListener: (eventName: string, callback: () => void) => void;
  setMap: (map: GoogleMapInstance | null) => void;
};

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
    __firekworksMapsPromise?: Promise<void>;
  }
}

export function MapWorkspace({ leads, selectedId, onSelect }: MapWorkspaceProps) {
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<GoogleMarkerInstance[]>([]);
  const [mapError, setMapError] = useState("");
  const localLeads = useMemo(() => leads.filter((lead) => focusCities.includes(lead.city)), [leads]);
  const leadsWithCoords = useMemo(
    () => localLeads.filter((lead) => Number.isFinite(lead.latitude ?? Number.NaN) && Number.isFinite(lead.longitude ?? Number.NaN)),
    [localLeads]
  );
  const selectedLead = leadsWithCoords.find((lead) => lead.id === selectedId) || leadsWithCoords[0];
  const cityGroups = useMemo(() => groupByCity(localLeads), [localLeads]);
  const canRenderMap = Boolean(mapsKey && selectedLead && leadsWithCoords.length);

  useEffect(() => {
    if (!canRenderMap || !mapRef.current || !selectedLead) return;

    let cancelled = false;

    loadGoogleMaps(mapsKey)
      .then(() => {
        if (cancelled || !window.google || !mapRef.current) return;
        const center = leadPosition(selectedLead);
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 12,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: darkMapStyles
        });

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = leadsWithCoords.slice(0, 250).map((lead) => {
          const marker = new window.google!.maps.Marker({
            position: leadPosition(lead),
            map,
            title: lead.name,
            icon: {
              path: window.google!.maps.SymbolPath.CIRCLE,
              scale: lead.id === selectedId ? 10 : 7,
              fillColor: markerColor(lead.score),
              fillOpacity: 0.94,
              strokeColor: lead.id === selectedId ? "#f5f7fa" : "#001020",
              strokeWeight: lead.id === selectedId ? 2.4 : 1.6
            }
          });
          marker.addListener("click", () => onSelect(lead));
          return marker;
        });
        map.setCenter(center);
        setMapError("");
      })
      .catch(() => {
        if (!cancelled) setMapError("No se pudo cargar Google Maps.");
      });

    return () => {
      cancelled = true;
    };
  }, [canRenderMap, leadsWithCoords, mapsKey, onSelect, selectedId, selectedLead]);

  return (
    <section className="map-workspace">
      <div className="map-panel">
        {canRenderMap ? (
          <div ref={mapRef} className="map-real" role="img" aria-label="Mapa real de comercios locales" />
        ) : (
          <div className="map-fallback">
            <span className="css-icon css-icon--map" aria-hidden="true" />
            <strong>Mapa interactivo pendiente de conectar</strong>
            <p>
              {mapsKey
                ? "La clave existe, pero faltan coordenadas reales en los comercios. No se inventan ubicaciones."
                : "Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY y guarda lat/lng para mostrar un mapa real."}
            </p>
          </div>
        )}
        {mapError ? <p className="map-error">{mapError}</p> : null}
      </div>

      <aside className="map-side">
        <div className="map-city-list">
          {cityGroups.map((city) => (
            <article key={city.name}>
              <span>{city.name}</span>
              <strong>{city.total}</strong>
              <small>{city.hot} calientes</small>
            </article>
          ))}
        </div>

        <div className="map-lead-list">
          {(leadsWithCoords.length ? leadsWithCoords : localLeads).slice(0, 48).map((lead) => (
            <button
              key={lead.id}
              className={lead.id === selectedId ? "map-lead map-lead--active" : "map-lead"}
              type="button"
              onClick={() => onSelect(lead)}
            >
              <span className={`score-pill score-pill--${scoreTone(lead.score)}`}>{lead.score}</span>
              <span>
                <strong>{lead.name}</strong>
                <small>
                  {lead.city} · {scoreLabel(lead.score)}
                  {!Number.isFinite(lead.latitude) || !Number.isFinite(lead.longitude) ? " · pendiente de geocodificar" : ""}
                </small>
              </span>
            </button>
          ))}
        </div>
      </aside>
    </section>
  );
}

function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") return Promise.reject(new Error("No browser"));
  if (window.google?.maps) return Promise.resolve();
  if (window.__firekworksMapsPromise) return window.__firekworksMapsPromise;

  window.__firekworksMapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed"));
    document.head.appendChild(script);
  });

  return window.__firekworksMapsPromise;
}

function leadPosition(lead: Lead) {
  return { lat: Number(lead.latitude), lng: Number(lead.longitude) };
}

function markerColor(score: number) {
  if (score >= 80) return "#28e0c2";
  if (score >= 60) return "#5bd097";
  if (score >= 40) return "#f3b84b";
  if (score >= 20) return "#58a6ff";
  return "#e76f6f";
}

function groupByCity(leads: Lead[]) {
  const groups = new Map<string, { name: string; total: number; hot: number }>();

  for (const lead of leads) {
    const current = groups.get(lead.city) || { name: lead.city || "Sin ciudad", total: 0, hot: 0 };
    current.total += 1;
    if (lead.score >= 70) current.hot += 1;
    groups.set(current.name, current);
  }

  return Array.from(groups.values()).sort((a, b) => b.hot - a.hot || b.total - a.total);
}

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#061827" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#afc0d0" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#001020" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#0d2a40" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#001020" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#020b14" }] }
];
