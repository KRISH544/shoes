"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { CalendarPlus, ExternalLink, Save } from "lucide-react";
import { compactUrl, formatDate, toDateInputValue } from "@/lib/format";

type Release = {
  id: string;
  title: string;
  sourceUrl: string;
  productUrl: string | null;
  retailer: string | null;
  price: string | null;
  releaseDate: string | null;
  raffleUrl: string | null;
  notes: string | null;
  status: "NEW" | "WATCHING" | "RAFFLE_OPEN" | "DROPPED" | "MISSED" | "ARCHIVED";
  imageUrl: string | null;
  matches: string[];
};

const statuses: Release["status"][] = ["NEW", "WATCHING", "RAFFLE_OPEN", "DROPPED", "MISSED", "ARCHIVED"];

export function ReleaseBoard({ initialReleases }: { initialReleases: Release[] }) {
  const [releases, setReleases] = useState(initialReleases);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return releases;
    return releases.filter((release) =>
      [release.title, release.retailer, release.price, release.notes, release.matches.join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [query, releases]);

  async function updateRelease(id: string, patch: Partial<Release>) {
    setSaving(id);
    const response = await fetch(`/api/releases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    const payload = await response.json();
    if (response.ok) {
      setReleases((current) =>
        current.map((release) =>
          release.id === id
            ? {
                ...release,
                ...payload.release,
                releaseDate: payload.release.releaseDate
              }
            : release
        )
      );
    }
    setSaving(null);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Releases</h2>
          <p>{filtered.length} shown</p>
        </div>
        <label className="search-field">
          <span className="sr-only">Search releases</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search releases" />
        </label>
      </div>

      <div className="release-list">
        {filtered.map((release) => {
          const url = release.raffleUrl || release.productUrl || release.sourceUrl;
          return (
            <article className="release-row" key={release.id}>
              <div className="release-media" aria-hidden="true">
                {release.imageUrl ? <img src={release.imageUrl} alt="" /> : <span>{release.title.slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className="release-main">
                <div className="row-title">
                  <strong>{release.title}</strong>
                  <span className="pill accent">{release.status.replace(/_/g, " ")}</span>
                </div>
                <div className="meta-line">
                  <span>{release.retailer || "Retailer TBA"}</span>
                  <span>{release.price || "Price TBA"}</span>
                  <span>{formatDate(release.releaseDate)}</span>
                </div>
                <div className="keyword-line">
                  {release.matches.map((match) => (
                    <span className="pill" key={match}>
                      {match}
                    </span>
                  ))}
                </div>
                <a href={url} target="_blank" rel="noreferrer">
                  {compactUrl(url)}
                </a>
              </div>
              <div className="release-edit">
                <label>
                  <span>Status</span>
                  <select value={release.status} onChange={(event) => updateRelease(release.id, { status: event.target.value as Release["status"] })}>
                    {statuses.map((status) => (
                      <option value={status} key={status}>
                        {status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Release time</span>
                  <input
                    type="datetime-local"
                    defaultValue={toDateInputValue(release.releaseDate)}
                    onBlur={(event) =>
                      updateRelease(release.id, {
                        releaseDate: event.target.value ? new Date(event.target.value).toISOString() : null
                      })
                    }
                  />
                </label>
                <div className="row-actions">
                  <a className="icon-button" href={`/api/releases/${release.id}/calendar`} title="Add calendar reminder">
                    <CalendarPlus size={16} aria-hidden="true" />
                  </a>
                  <a className="icon-button" href={url} target="_blank" rel="noreferrer" title="Open release page">
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                  <button className="icon-button" type="button" title="Saved" disabled={saving === release.id}>
                    <Save size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
