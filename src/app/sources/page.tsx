import { SourceManager } from "@/components/SourceManager";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await prisma.source.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }]
  });

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title">
          <h1>Sources</h1>
          <p>Public release pages and sneaker news feeds</p>
        </div>
      </header>
      <SourceManager
        initialSources={sources.map((source) => ({
          id: source.id,
          name: source.name,
          url: source.url,
          type: source.type,
          active: source.active,
          retailer: source.retailer,
          region: source.region,
          notes: source.notes,
          lastCheckedAt: source.lastCheckedAt?.toISOString() || null,
          lastStatus: source.lastStatus,
          lastError: source.lastError
        }))}
      />
    </div>
  );
}
