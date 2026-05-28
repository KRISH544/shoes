import { Bell } from "lucide-react";
import { prisma } from "@/lib/db";
import { getDefaultUser } from "@/lib/default-user";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const user = await getDefaultUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    include: { release: true },
    orderBy: { createdAt: "desc" },
    take: 150
  });

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title">
          <h1>Alerts</h1>
          <p>Email, SMS, push attempts</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Notification log</h2>
            <p>{notifications.length} entries</p>
          </div>
          <Bell size={20} aria-hidden="true" />
        </div>
        <div className="alert-list">
          {notifications.length ? (
            notifications.map((notification) => (
              <article className="alert-row" key={notification.id}>
                <div>
                  <strong>{notification.release.title}</strong>
                  <p>
                    {notification.channel} at {formatDate(notification.sentAt || notification.createdAt)}
                    {notification.error ? `: ${notification.error}` : ""}
                  </p>
                </div>
                <span className={notification.status === "FAILED" ? "pill danger" : "pill"}>{notification.status}</span>
              </article>
            ))
          ) : (
            <div className="empty">No alerts yet</div>
          )}
        </div>
      </section>
    </div>
  );
}
