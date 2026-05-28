import { ReleaseStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDefaultUser } from "@/lib/default-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getDefaultUser();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as ReleaseStatus | null;
  const q = searchParams.get("q");

  const releases = await prisma.release.findMany({
    where: {
      ...(status && Object.values(ReleaseStatus).includes(status) ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { retailer: { contains: q, mode: "insensitive" } },
              { notes: { contains: q, mode: "insensitive" } }
            ]
          }
        : {}),
      releaseMatches: {
        some: {
          userId: user.id
        }
      }
    },
    include: {
      releaseMatches: {
        where: { userId: user.id },
        include: { keyword: true }
      },
      source: true
    },
    orderBy: [{ releaseDate: "asc" }, { firstSeenAt: "desc" }],
    take: 100
  });

  return NextResponse.json({ releases });
}
