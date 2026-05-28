import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getDefaultUser } from "@/lib/default-user";
import { normalizeKeyword } from "@/lib/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const keywordSchema = z.object({
  text: z.string().trim().min(2).max(80)
});

export async function GET() {
  const user = await getDefaultUser();
  const keywords = await prisma.keyword.findMany({
    where: { userId: user.id },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json({ keywords });
}

export async function POST(request: Request) {
  const body = keywordSchema.safeParse(await readJson(request));
  if (!body.success) return jsonError("Keyword must be between 2 and 80 characters.");

  const user = await getDefaultUser();
  const normalized = normalizeKeyword(body.data.text);

  const keyword = await prisma.keyword.upsert({
    where: {
      userId_normalized: {
        userId: user.id,
        normalized
      }
    },
    update: {
      text: body.data.text,
      active: true
    },
    create: {
      userId: user.id,
      text: body.data.text,
      normalized
    }
  });

  return NextResponse.json({ keyword }, { status: 201 });
}
