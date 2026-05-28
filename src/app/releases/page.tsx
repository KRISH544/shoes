import { ReleaseBoard } from "@/components/ReleaseBoard";
import { prisma } from "@/lib/db";
import { getDefaultUser } from "@/lib/default-user";

export const dynamic = "force-dynamic";

export default async function ReleasesPage() {
  const user = await getDefaultUser();
  const releases = await prisma.release.findMany({
    where: { releaseMatches: { some: { userId: user.id } } },
    include: {
      releaseMatches: {
        where: { userId: user.id }
      }
    },
    orderBy: [{ releaseDate: "asc" }, { firstSeenAt: "desc" }],
    take: 120
  });

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title">
          <h1>Releases</h1>
          <p>Dates, retailers, prices, raffle links</p>
        </div>
      </header>
      <ReleaseBoard
        initialReleases={releases.map((release) => ({
          id: release.id,
          title: release.title,
          sourceUrl: release.sourceUrl,
          productUrl: release.productUrl,
          retailer: release.retailer,
          price: release.price,
          releaseDate: release.releaseDate?.toISOString() || null,
          raffleUrl: release.raffleUrl,
          notes: release.notes,
          status: release.status,
          imageUrl: release.imageUrl,
          matches: release.releaseMatches.map((match) => match.matchedText)
        }))}
      />
    </div>
  );
}
