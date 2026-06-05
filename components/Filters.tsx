import type { ContentUse, FollowersBucket, LeadCity, LeadSector, LeadStatus } from "@/types/lead";

type FiltersProps = {
  cities: LeadCity[];
  sectors: LeadSector[];
  statuses: LeadStatus[];
  followersBuckets: FollowersBucket[];
  contentUses: ContentUse[];
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
};

export function Filters({
  cities,
  sectors,
  statuses,
  followersBuckets,
  contentUses,
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
  onMinScore
}: FiltersProps) {
  return (
    <div className="filters">
      <label className="search-field">
        <span className="css-icon css-icon--search" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Buscar negocio, ciudad o señal"
        />
      </label>

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
  );
}
