"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

const checklist = [
  "Sign in early",
  "Save delivery address",
  "Save payment method",
  "Enable SNKRS notifications",
  "Join official raffles"
];

export function ManualChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    const saved = window.localStorage.getItem("manual-checkout-checklist");
    return saved ? JSON.parse(saved) : {};
  });

  function toggle(item: string) {
    const next = { ...checked, [item]: !checked[item] };
    setChecked(next);
    window.localStorage.setItem("manual-checkout-checklist", JSON.stringify(next));
  }

  return (
    <section className="panel checklist-panel">
      <div className="panel-header">
        <div>
          <h2>Manual checkout checklist</h2>
          <p>{Object.values(checked).filter(Boolean).length} of {checklist.length} complete</p>
        </div>
        <CheckCircle2 size={22} aria-hidden="true" />
      </div>
      <div className="checklist">
        {checklist.map((item) => (
          <label className="check-row" key={item}>
            <input type="checkbox" checked={Boolean(checked[item])} onChange={() => toggle(item)} />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
