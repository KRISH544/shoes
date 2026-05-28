"use client";

import { FormEvent, useState } from "react";
import { Plus, Power, Trash2 } from "lucide-react";
import { compactUrl, formatDate } from "@/lib/format";

type Source = {
  id: string;
  name: string;
  url: string;
  type: "RSS" | "HTML";
  active: boolean;
  retailer: string | null;
  region: string | null;
  notes: string | null;
  lastCheckedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
};

export function SourceManager({ initialSources }: { initialSources: Source[] }) {
  const [sources, setSources] = useState(initialSources);
  const [form, setForm] = useState({ name: "", url: "", type: "HTML", retailer: "", region: "" });
  const [error, setError] = useState<string | null>(null);

  async function addSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error || "Could not add source");
      return;
    }

    setError(null);
    setForm({ name: "", url: "", type: "HTML", retailer: "", region: "" });
    setSources((current) => [payload.source, ...current.filter((source) => source.id !== payload.source.id)]);
  }

  async function toggleSource(source: Source) {
    const response = await fetch(`/api/sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !source.active })
    });
    const payload = await response.json();
    if (response.ok) {
      setSources((current) => current.map((item) => (item.id === source.id ? payload.source : item)));
    }
  }

  async function deleteSource(source: Source) {
    const response = await fetch(`/api/sources/${source.id}`, { method: "DELETE" });
    if (response.ok) {
      setSources((current) => current.filter((item) => item.id !== source.id));
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Add source</h2>
            <p>{sources.filter((source) => source.active).length} active</p>
          </div>
        </div>

        <form className="source-form" onSubmit={addSource}>
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label className="wide">
            <span>URL</span>
            <input
              type="url"
              value={form.url}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
              required
            />
          </label>
          <label>
            <span>Type</span>
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              <option value="HTML">HTML</option>
              <option value="RSS">RSS</option>
            </select>
          </label>
          <label>
            <span>Retailer</span>
            <input value={form.retailer} onChange={(event) => setForm({ ...form, retailer: event.target.value })} />
          </label>
          <label>
            <span>Region</span>
            <input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} />
          </label>
          <button className="button primary" type="submit">
            <Plus size={16} aria-hidden="true" />
            <span>Add</span>
          </button>
        </form>
        {error ? <p className="form-error">{error}</p> : null}
      </section>

      <section className="panel">
        <div className="source-list">
          {sources.map((source) => (
            <article className={source.active ? "source-row" : "source-row muted"} key={source.id}>
              <div>
                <div className="row-title">
                  <strong>{source.name}</strong>
                  <span className="pill">{source.type}</span>
                  <span className={source.lastStatus === "ERROR" ? "pill danger" : "pill"}>{source.lastStatus || "Not checked"}</span>
                </div>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {compactUrl(source.url)}
                </a>
                <p>Last checked: {formatDate(source.lastCheckedAt)}</p>
                {source.lastError ? <p className="form-error">{source.lastError}</p> : null}
              </div>
              <div className="row-actions">
                <button className="icon-button" type="button" title={source.active ? "Pause source" : "Resume source"} onClick={() => toggleSource(source)}>
                  <Power size={16} aria-hidden="true" />
                </button>
                <button className="icon-button danger" type="button" title="Delete source" onClick={() => deleteSource(source)}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
