"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Background } from "@/components/Background";
import { useInternalAuth } from "@/components/AuthGate";

type AppText = {
  id?: string;
  app: "web" | "radar" | "leads" | "stats";
  key: string;
  value: string;
  description: string;
  category: string;
  is_public: boolean;
  updated_at?: string;
};

const apps: AppText["app"][] = ["leads", "stats", "radar", "web"];

export function TextsAdmin() {
  const { accessToken, profile } = useInternalAuth();
  const [texts, setTexts] = useState<AppText[]>([]);
  const [selected, setSelected] = useState<AppText | null>(null);
  const [query, setQuery] = useState("");
  const [app, setApp] = useState<AppText["app"] | "">("");
  const [message, setMessage] = useState("Cargando textos");
  const canEdit = profile.role === "admin";

  useEffect(() => {
    fetch("/api/admin/texts", {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    })
      .then(async (response) => {
        const payload = (await response.json()) as { texts?: AppText[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "No se pudieron cargar textos");
        return payload.texts || [];
      })
      .then((items) => {
        setTexts(items);
        setSelected(items[0] || null);
        setMessage(`${items.length} textos cargados`);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "No se pudieron cargar textos"));
  }, [accessToken]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return texts.filter((text) => {
      const matchesApp = app ? text.app === app : true;
      const haystack = `${text.app} ${text.key} ${text.category} ${text.description} ${text.value}`.toLowerCase();
      return matchesApp && (!needle || haystack.includes(needle));
    });
  }, [app, query, texts]);

  async function saveText() {
    if (!selected || !canEdit) return;
    setMessage("Guardando");

    const response = await fetch("/api/admin/texts", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ text: selected })
    });
    const payload = (await response.json()) as { text?: AppText; error?: string };

    if (!response.ok || !payload.text) {
      setMessage(payload.error || "No se pudo guardar");
      return;
    }

    setTexts((current) =>
      current.map((item) => (item.app === payload.text?.app && item.key === payload.text?.key ? payload.text : item))
    );
    setSelected(payload.text);
    setMessage("Texto guardado");
  }

  function update<K extends keyof AppText>(key: K, value: AppText[K]) {
    setSelected((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <main className="app">
      <Background />
      <AppShell currentView="textos">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Ajustes internos</p>
            <h1>Textos</h1>
            <p className="workspace-subtitle">Copys compartidos para Leads, Stats, Radar y Web con fallback seguro.</p>
          </div>
          <div className="header-actions">
            <span className="source-pill source-pill--supabase">{message}</span>
            {canEdit ? (
              <button className="button" type="button" onClick={saveText}>
                Guardar
              </button>
            ) : null}
          </div>
        </header>

        <section className="texts-admin">
          <div className="texts-admin__list">
            <div className="filters filters--texts">
              <label className="search-field">
                <span className="css-icon css-icon--search" aria-hidden="true" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar texto" />
              </label>
              <select value={app} onChange={(event) => setApp(event.target.value as AppText["app"] | "")}>
                <option value="">Todas las apps</option>
                {apps.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="lead-list">
              {filtered.map((text) => (
                <button
                  key={`${text.app}.${text.key}`}
                  className={selected?.app === text.app && selected.key === text.key ? "text-row text-row--active" : "text-row"}
                  type="button"
                  onClick={() => setSelected(text)}
                >
                  <strong>{text.key}</strong>
                  <span>{text.app} · {text.category || "general"}</span>
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <aside className="lead-detail texts-admin__editor">
              <span className="eyebrow">{selected.app}</span>
              <h2>{selected.key}</h2>
              <div className="detail-form">
                <label>
                  App
                  <select value={selected.app} onChange={(event) => update("app", event.target.value as AppText["app"])} disabled={!canEdit}>
                    {apps.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Categoría
                  <input value={selected.category || ""} onChange={(event) => update("category", event.target.value)} disabled={!canEdit} />
                </label>
                <label className="detail-form__wide">
                  Key
                  <input value={selected.key} onChange={(event) => update("key", event.target.value)} disabled={!canEdit} />
                </label>
                <label className="detail-form__wide">
                  Valor
                  <textarea value={selected.value} rows={7} onChange={(event) => update("value", event.target.value)} disabled={!canEdit} />
                </label>
                <label className="detail-form__wide">
                  Descripción
                  <textarea value={selected.description || ""} rows={3} onChange={(event) => update("description", event.target.value)} disabled={!canEdit} />
                </label>
                <label className="check-row detail-form__wide">
                  <input
                    type="checkbox"
                    checked={selected.is_public}
                    onChange={(event) => update("is_public", event.target.checked)}
                    disabled={!canEdit}
                  />
                  Público para lectura segura
                </label>
              </div>
            </aside>
          ) : null}
        </section>
      </AppShell>
    </main>
  );
}
