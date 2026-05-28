"use client";

import { FormEvent, useState } from "react";
import { BellRing, Save } from "lucide-react";

type SettingsUser = {
  name: string | null;
  email: string | null;
  phone: string | null;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  preferences: {
    calendarReminderMinutes: number;
    timezone: string;
  } | null;
};

export function SettingsForm({ initialUser }: { initialUser: SettingsUser }) {
  const [form, setForm] = useState({
    name: initialUser.name || "",
    email: initialUser.email || "",
    phone: initialUser.phone || "",
    emailEnabled: initialUser.emailEnabled,
    smsEnabled: initialUser.smsEnabled,
    pushEnabled: initialUser.pushEnabled,
    calendarReminderMinutes: initialUser.preferences?.calendarReminderMinutes || 30,
    timezone: initialUser.preferences?.timezone || "Pacific/Auckland"
  });
  const [status, setStatus] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setStatus(response.ok ? "Saved" : "Could not save");
  }

  async function enablePush() {
    setStatus(null);
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("Push is not available in this browser");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setStatus("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("Push permission was not granted");
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    const response = await fetch("/api/push/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription)
    });

    setForm((current) => ({ ...current, pushEnabled: response.ok }));
    setStatus(response.ok ? "Push enabled" : "Could not enable push");
  }

  return (
    <form className="panel settings-form" onSubmit={save}>
      <div className="panel-header">
        <div>
          <h2>Alert settings</h2>
          <p>{status || "Email, SMS, push, calendar"}</p>
        </div>
        <button className="button primary" type="submit">
          <Save size={16} aria-hidden="true" />
          <span>Save</span>
        </button>
      </div>

      <div className="settings-grid">
        <label>
          <span>Name</span>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          <span>Email</span>
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label>
          <span>Phone</span>
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </label>
        <label>
          <span>Timezone</span>
          <input value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
        </label>
        <label>
          <span>Calendar reminder</span>
          <input
            type="number"
            min={5}
            max={240}
            value={form.calendarReminderMinutes}
            onChange={(event) => setForm({ ...form, calendarReminderMinutes: Number(event.target.value) })}
          />
        </label>
      </div>

      <div className="toggle-grid">
        <label className="switch-row">
          <input
            type="checkbox"
            checked={form.emailEnabled}
            onChange={(event) => setForm({ ...form, emailEnabled: event.target.checked })}
          />
          <span>Email alerts</span>
        </label>
        <label className="switch-row">
          <input type="checkbox" checked={form.smsEnabled} onChange={(event) => setForm({ ...form, smsEnabled: event.target.checked })} />
          <span>SMS alerts</span>
        </label>
        <label className="switch-row">
          <input
            type="checkbox"
            checked={form.pushEnabled}
            onChange={(event) => setForm({ ...form, pushEnabled: event.target.checked })}
          />
          <span>Push alerts</span>
        </label>
        <button className="button secondary" type="button" onClick={enablePush}>
          <BellRing size={16} aria-hidden="true" />
          <span>Enable push</span>
        </button>
      </div>
    </form>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
