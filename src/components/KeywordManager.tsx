"use client";

import { FormEvent, useState } from "react";
import { Plus, Power, Trash2 } from "lucide-react";

type Keyword = {
  id: string;
  text: string;
  active: boolean;
};

export function KeywordManager({ initialKeywords }: { initialKeywords: Keyword[] }) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function addKeyword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;

    const response = await fetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error || "Could not add keyword");
      return;
    }

    setError(null);
    setText("");
    setKeywords((current) => [payload.keyword, ...current.filter((keyword) => keyword.id !== payload.keyword.id)]);
  }

  async function toggleKeyword(keyword: Keyword) {
    const response = await fetch(`/api/keywords/${keyword.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !keyword.active })
    });
    const payload = await response.json();
    if (response.ok) {
      setKeywords((current) => current.map((item) => (item.id === keyword.id ? payload.keyword : item)));
    }
  }

  async function deleteKeyword(keyword: Keyword) {
    const response = await fetch(`/api/keywords/${keyword.id}`, { method: "DELETE" });
    if (response.ok) {
      setKeywords((current) => current.filter((item) => item.id !== keyword.id));
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Keywords</h2>
          <p>{keywords.filter((keyword) => keyword.active).length} active</p>
        </div>
      </div>

      <form className="inline-form" onSubmit={addKeyword}>
        <label className="sr-only" htmlFor="keyword-text">
          Keyword
        </label>
        <input
          id="keyword-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Travis Scott, Jordan 1, Nike SB"
          maxLength={80}
        />
        <button className="button primary" type="submit">
          <Plus size={16} aria-hidden="true" />
          <span>Add</span>
        </button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}

      <div className="token-list">
        {keywords.map((keyword) => (
          <div className={keyword.active ? "token-row" : "token-row muted"} key={keyword.id}>
            <span>{keyword.text}</span>
            <div className="row-actions">
              <button
                className="icon-button"
                type="button"
                title={keyword.active ? "Pause keyword" : "Resume keyword"}
                onClick={() => toggleKeyword(keyword)}
              >
                <Power size={16} aria-hidden="true" />
              </button>
              <button className="icon-button danger" type="button" title="Delete keyword" onClick={() => deleteKeyword(keyword)}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
