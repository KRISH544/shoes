import { ReleaseStatus } from "@prisma/client";
import { getDefaultUser } from "@/lib/default-user";
import { prisma } from "@/lib/db";
import { sendReleaseAlerts } from "@/lib/notifications";
import { includesKeyword, inferRetailerFromUrl, isLikelyRaffle, shortHash, slugify } from "@/lib/normalize";
import { parseSource, ReleaseCandidate } from "@/lib/source-parser";

export type ScanSummary = {
  startedAt: string;
  finishedAt: string;
  sourcesChecked: number;
  candidatesSeen: number;
  matchesFound: number;
  releasesCreated: number;
  notificationsAttempted: number;
  errors: Array<{ source: string; message: string }>;
};

export async function runReleaseScan(options: { sourceId?: string } = {}): Promise<ScanSummary> {
  const startedAt = new Date();
  const user = await getDefaultUser();
  const keywords = await prisma.keyword.findMany({
    where: {
      userId: user.id,
      active: true
    }
  });

  const sources = await prisma.source.findMany({
    where: {
      active: true,
      ...(options.sourceId ? { id: options.sourceId } : {})
    },
    orderBy: { name: "asc" }
  });

  const summary: ScanSummary = {
    startedAt: startedAt.toISOString(),
    finishedAt: startedAt.toISOString(),
    sourcesChecked: 0,
    candidatesSeen: 0,
    matchesFound: 0,
    releasesCreated: 0,
    notificationsAttempted: 0,
    errors: []
  };

  if (!keywords.length || !sources.length) {
    summary.finishedAt = new Date().toISOString();
    return summary;
  }

  for (const source of sources) {
    try {
      const candidates = await parseSource(source);
      summary.sourcesChecked += 1;
      summary.candidatesSeen += candidates.length;

      await prisma.source.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: new Date(),
          lastStatus: "OK",
          lastError: null
        }
      });

      for (const candidate of candidates) {
        const matchedKeywords = keywords.filter((keyword) =>
          includesKeyword(`${candidate.title} ${candidate.snippet || ""} ${candidate.url}`, keyword.text)
        );

        if (!matchedKeywords.length) continue;

        const { release, created } = await upsertReleaseFromCandidate(source.id, candidate);
        summary.matchesFound += matchedKeywords.length;
        if (created) summary.releasesCreated += 1;

        for (const keyword of matchedKeywords) {
          await prisma.releaseMatch.upsert({
            where: {
              userId_releaseId_matchedText: {
                userId: user.id,
                releaseId: release.id,
                matchedText: keyword.text
              }
            },
            update: {
              keywordId: keyword.id
            },
            create: {
              userId: user.id,
              releaseId: release.id,
              keywordId: keyword.id,
              matchedText: keyword.text
            }
          });
        }

        const notificationResults = await sendReleaseAlerts(
          user,
          release,
          matchedKeywords.map((keyword) => keyword.text)
        );
        summary.notificationsAttempted += notificationResults.length;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scan error";
      summary.errors.push({ source: source.name, message });
      await prisma.source.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: new Date(),
          lastStatus: "ERROR",
          lastError: message.slice(0, 700)
        }
      });
    }
  }

  summary.finishedAt = new Date().toISOString();
  return summary;
}

async function upsertReleaseFromCandidate(sourceId: string, candidate: ReleaseCandidate) {
  const existing = await prisma.release.findUnique({
    where: { sourceUrl: candidate.url }
  });

  const raffleUrl = candidate.raffleUrl || (isLikelyRaffle(`${candidate.title} ${candidate.snippet || ""}`) ? candidate.url : null);
  const title = candidate.title.slice(0, 220);
  const retailer = candidate.retailer || inferRetailerFromUrl(candidate.url);
  const slug = `${slugify(title)}-${shortHash(candidate.url)}`;

  const release = await prisma.release.upsert({
    where: { sourceUrl: candidate.url },
    update: {
      title,
      productUrl: candidate.url,
      retailer: retailer || undefined,
      price: candidate.price || undefined,
      releaseDate: candidate.releaseDate || undefined,
      raffleUrl: raffleUrl || undefined,
      imageUrl: candidate.imageUrl || undefined,
      sourceId
    },
    create: {
      title,
      slug,
      sourceUrl: candidate.url,
      productUrl: candidate.url,
      retailer,
      price: candidate.price,
      releaseDate: candidate.releaseDate,
      raffleUrl,
      imageUrl: candidate.imageUrl,
      status: raffleUrl ? ReleaseStatus.RAFFLE_OPEN : ReleaseStatus.NEW,
      notes: candidate.snippet?.slice(0, 1000),
      sourceId
    }
  });

  return {
    release,
    created: !existing
  };
}
