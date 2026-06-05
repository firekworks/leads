"use client";

import { useMemo, useState } from "react";
import type { ContentUse, FollowersBucket, LeadCity, LeadSector, LeadStatus } from "@/types/lead";

type SavedView = {
  id: string;
  label: string;
  icon: string;
};

type FiltersProps = {
  cities: LeadCity[];
  sectors: LeadSector[];
  statuses: LeadStatus[];
  followersBuckets: FollowersBucket[];
  contentUses: ContentUse[];
  savedViews?: readonly SavedView[];
  query: string;
  city: string;
  sector: string;
  status: string;
  followersBucket: string;
  contentUse: string;
  withoutInstagram: boolean;
  withoutFacebook: boolean;
  withoutWeb: boolean;
  withoutWhatsapp: boolean;
  withoutPhone: boolean;
  minScore: number;
  onQuery: (value: string) => void;
  onCity: (value: string) => void;
  onSector: (value: string) => void;
  onStatus: (value: string) => void;
  onFollowersBucket: (value: string) => void;
  onContentUse: (value: string) => void;
  onWithoutInstagram: (value: boolean) => void;
  onWithoutFacebook: (value: boolean) => void;
  onWithoutWeb: (value: boolean) => void;
  onWithoutWhatsapp: (value: boolean) => void;
  onWithoutPhone: (value: boolean) => void;
  onMinScore: (value: number) => void;
  onSavedView?: (value: string) => void;
};

export function Filters({
  cities,
  sectors,
  statuses,
  followersBuckets,
  contentUses,
  savedViews = [],
  query,
  city,
  sector,
  status,
  followersBucket,
  contentUse,
  withoutInstagram,
  withoutFacebook,
  withoutWeb,
  withoutWhatsapp,
  withoutPhone,
  minScore,
  onQuery,
  onCity,
  onSector,
  onStatus,
  onFollowersBucket,
  onContentUse,
  onWithoutInstagram,
  onWithoutFacebook,
  onWithoutWeb,
  onWithoutWhatsapp,
  onWithoutPhone,
  onMinScore,
  onSavedView
}: FiltersProps) {
  const [open, setOpen] = useState(false);
  const activeFilters = useMemo(
    () =>
      [
        city && `Ciudad: ${city}`,
        sector && `Sector: ${sector}`,
        status && `Estado: ${status}`,
        followersBucket && `IG: ${followersBucket}`,
        contentUse && `Contenido: ${contentUse}`,
        minScore ? `Score +${minScore}` : "",
        withoutInstagram && "Sin Instagram",
        withoutFacebook && "Sin Facebook",
        withoutWeb && "Sin web",
        withoutWhatsapp && "Sin WhatsApp",
        withoutPhone && "Sin teléfono"
      ].filter(Boolean) as string[],
    [
      city,
      contentUse,
      followersBucket,
      minScore,
      sector,
      status,
      withoutFacebook,
      withoutInstagram,
      withoutPhone,
      withoutWhatsapp,
      withoutWeb
    ]
  );

  function clearFilters() {
    onCity("");
    onSector("");
    onStatus("");
    onFollowersBucket("");
    onContentUse("");
    onWithoutInstagram(false);
    onWithoutFacebook(false);
    onWithoutWeb(false);
    onWithoutWhatsapp(false);
    onWithoutPhone(false);
    onMinScore(0);
  }

  return (
    <div className="filters">
      {savedViews.length ? (
        <div className="saved-views" aria-label="Vistas rápidas">
          {savedViews.map((view) => (
            <button key={view.id} type="button" onClick={() => onSavedView?.(view.id)}>
              <span className={`css-icon css-icon--${view.icon}`} aria-hidden="true" />
              {view.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="filters__bar">
        <label className="search-field">
          <span className="css-icon css-icon--search" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Buscar comercio, ciudad, sector, Instagram o siguiente acción"
          />
        </label>
        <button className="button button--ghost filters__toggle" type="button" onClick={() => setOpen((value) => !value)}>
          <span className="css-icon css-icon--filter" aria-hidden="true" />
          Filtros
          {activeFilters.length ? <strong>{activeFilters.length}</strong> : null}
        </button>
      </div>

      {activeFilters.length ? (
        <div className="filters__chips" aria-label="Filtros activos">
          {activeFilters.map((item) => (
            <span key={item}>{item}</span>
          ))}
          <button type="button" onClick={clearFilters}>
            Limpiar
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="filters__panel">
          <select value={city} onChange={(event) => onCity(event.target.value)} aria-label="Ciudad">
            <option value="">Ciudad</option>
            {cities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select value={sector} onChange={(event) => onSector(event.target.value)} aria-label="Sector">
            <option value="">Sector</option>
            {sectors.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select value={status} onChange={(event) => onStatus(event.target.value)} aria-label="Estado">
            <option value="">Estado</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={followersBucket}
            onChange={(event) => onFollowersBucket(event.target.value)}
            aria-label="Seguidores IG"
          >
            <option value="">Seguidores IG</option>
            {followersBuckets.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={contentUse}
            onChange={(event) => onContentUse(event.target.value)}
            aria-label="Uso de contenido"
          >
            <option value="">Uso contenido</option>
            {contentUses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="score-filter">
            <span>Score mínimo</span>
            <input
              type="number"
              min={0}
              max={100}
              value={minScore || ""}
              onChange={(event) => onMinScore(Number(event.target.value || 0))}
            />
          </label>

          <div className="filter-toggles" aria-label="Filtros de ausencia">
            <label>
              <input
                type="checkbox"
                checked={withoutInstagram}
                onChange={(event) => onWithoutInstagram(event.target.checked)}
              />
              Sin Instagram
            </label>
            <label>
              <input
                type="checkbox"
                checked={withoutFacebook}
                onChange={(event) => onWithoutFacebook(event.target.checked)}
              />
              Sin Facebook
            </label>
            <label>
              <input
                type="checkbox"
                checked={withoutWeb}
                onChange={(event) => onWithoutWeb(event.target.checked)}
              />
              Sin web
            </label>
            <label>
              <input
                type="checkbox"
                checked={withoutWhatsapp}
                onChange={(event) => onWithoutWhatsapp(event.target.checked)}
              />
              Sin WhatsApp
            </label>
            <label>
              <input
                type="checkbox"
                checked={withoutPhone}
                onChange={(event) => onWithoutPhone(event.target.checked)}
              />
              Sin teléfono
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
