import { SettingsForm } from "@/components/SettingsForm";
import { getDefaultUser } from "@/lib/default-user";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getDefaultUser();

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title">
          <h1>Settings</h1>
          <p>Alert channels and reminders</p>
        </div>
      </header>
      <SettingsForm
        initialUser={{
          name: user.name,
          email: user.email,
          phone: user.phone,
          emailEnabled: user.emailEnabled,
          smsEnabled: user.smsEnabled,
          pushEnabled: user.pushEnabled,
          preferences: user.preferences
            ? {
                calendarReminderMinutes: user.preferences.calendarReminderMinutes,
                timezone: user.preferences.timezone
              }
            : null
        }}
      />
    </div>
  );
}
