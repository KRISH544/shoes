import { CalendarPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getDefaultUser } from "@/lib/default-user";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getDefaultUser();
  const releases = await prisma.release.findMany({
    where: {
      releaseMatches: { some: { userId: user.id } },
      status: { not: "ARCHIVED" }
    },
    orderBy: [{ releaseDate: "asc" }, { firstSeenAt: "desc" }],
    take: 80
  });

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title">
          <h1>Calendar</h1>
          <p>Release-time reminders</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Upcoming reminders</h2>
            <p>{releases.length} releases</p>
          </div>
          <CalendarPlus size={20} aria-hidden="true" />
        </div>
        <div className="alert-list">
          {releases.length ? (
            releases.map((release) => (
              <article className="calendar-row" key={release.id}>
                <div>
                  <strong>{release.title}</strong>
                  <p>
                    {release.retailer || "Retailer TBA"} at {formatDate(release.releaseDate)}
                  </p>
                </div>
                <a className="button secondary" href={`/api/releases/${release.id}/calendar`}>
                  <CalendarPlus size={16} aria-hidden="true" />
                  <span>Add</span>
                </a>
              </article>
            ))
          ) : (
            <div className="empty">No releases yet</div>
          )}
        </div>
      </section>
    </div>
  );
}
