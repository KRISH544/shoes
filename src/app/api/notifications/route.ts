import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDefaultUser } from "@/lib/default-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getDefaultUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    include: { release: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ notifications });
}
