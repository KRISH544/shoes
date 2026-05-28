"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

type ScanSummary = {
  sourcesChecked: number;
  candidatesSeen: number;
  matchesFound: number;
  releasesCreated: number;
  notificationsAttempted: number;
  errors: Array<{ source: string; message: string }>;
};

export function ScanButton() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runScan() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scan", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Scan failed");
      setSummary(payload.summary);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="scan-control">
      <button className="button primary" onClick={runScan} disabled={loading}>
        <RefreshCw size={16} aria-hidden="true" className={loading ? "spin" : ""} />
        <span>{loading ? "Scanning" : "Run scan"}</span>
      </button>
      {summary ? (
        <span className="inline-status">
          {summary.matchesFound} matches, {summary.releasesCreated} new
        </span>
      ) : null}
      {error ? <span className="inline-error">{error}</span> : null}
    </div>
  );
}
