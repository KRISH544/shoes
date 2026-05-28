import { Bell, CalendarDays, Newspaper } from "lucide-react";
import { ScanButton } from "@/components/ScanButton";
import { prisma } from "@/lib/db";
import { getDefaultUser } from "@/lib/default-user";
import { formatDate, formatShortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getDefaultUser();
  const now = new Date();

  const [activeKeywords, upcomingCount, activeSources, sentAlerts, recentReleases, recentNotifications, sourceHealth] =
    await Promise.all([
      prisma.keyword.count({ where: { userId: user.id, active: true } }),
      prisma.release.count({
        where: {
          releaseMatches: { some: { userId: user.id } },
          OR: [{ releaseDate: null }, { releaseDate: { gte: now } }]
        }
      }),
      prisma.source.count({ where: { active: true } }),
      prisma.notification.count({ where: { userId: user.id, status: "SENT" } }),
      prisma.release.findMany({
        where: { releaseMatches: { some: { userId: user.id } } },
        include: {
          releaseMatches: { where: { userId: user.id } }
        },
        orderBy: [{ releaseDate: "asc" }, { firstSeenAt: "desc" }],
        take: 6
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        include: { release: true },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.source.findMany({
        orderBy: [{ active: "desc" }, { name: "asc" }],
        take: 8
      })
    ]);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title">
          <h1>Sneaker release tracker</h1>
          <p>Public drops, raffles, calendar reminders</p>
        </div>
        <ScanButton />
      </header>

      <section className="stats-grid" aria-label="Tracker stats">
        <div className="stat">
          <span>Keywords</span>
          <strong>{activeKeywords}</strong>
        </div>
        <div className="stat">
          <span>Upcoming</span>
          <strong>{upcomingCount}</strong>
        </div>
        <div className="stat">
          <span>Sources</span>
          <strong>{activeSources}</strong>
        </div>
        <div className="stat">
          <span>Sent alerts</span>
          <strong>{sentAlerts}</strong>
        </div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Matched releases</h2>
              <p>{recentReleases.length} recent</p>
            </div>
            <CalendarDays size={20} aria-hidden="true" />
          </div>
          {recentReleases.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Release</th>
                  <th>Retailer</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentReleases.map((release) => (
                  <tr key={release.id}>
                    <td>
                      <strong>{release.title}</strong>
                      <div className="keyword-line">
                        {release.releaseMatches.map((match) => (
                          <span className="pill" key={match.id}>
                            {match.matchedText}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{release.retailer || "TBA"}</td>
                    <td>{formatShortDate(release.releaseDate)}</td>
                    <td>
                      <span className="pill accent">{release.status.replace(/_/g, " ")}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No matches yet</div>
          )}
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Source health</h2>
                <p>{sourceHealth.length} tracked</p>
              </div>
              <Newspaper size={20} aria-hidden="true" />
            </div>
            <div className="alert-list">
              {sourceHealth.map((source) => (
                <div className="alert-row" key={source.id}>
                  <div>
                    <strong>{source.name}</strong>
                    <p>{formatDate(source.lastCheckedAt)}</p>
                  </div>
                  <span className={source.lastStatus === "ERROR" ? "pill danger" : "pill"}>{source.lastStatus || "Ready"}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Alert feed</h2>
                <p>{recentNotifications.length} latest</p>
              </div>
              <Bell size={20} aria-hidden="true" />
            </div>
            <div className="alert-list">
              {recentNotifications.length ? (
                recentNotifications.map((notification) => (
                  <div className="alert-row" key={notification.id}>
                    <div>
                      <strong>{notification.release.title}</strong>
                      <p>{notification.channel} at {formatDate(notification.sentAt || notification.createdAt)}</p>
                    </div>
                    <span className={notification.status === "FAILED" ? "pill danger" : "pill"}>{notification.status}</span>
                  </div>
                ))
              ) : (
                <div className="empty">No alerts yet</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
