import { SourceType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sourceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  url: z.string().url(),
  type: z.nativeEnum(SourceType),
  retailer: z.string().trim().max(80).optional().nullable(),
  region: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable()
});

export async function GET() {
  const sources = await prisma.source.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }]
  });

  return NextResponse.json({ sources });
}

export async function POST(request: Request) {
  const body = sourceSchema.safeParse(await readJson(request));
  if (!body.success) return jsonError("Source name, valid URL, and source type are required.");

  const source = await prisma.source.upsert({
    where: { url: body.data.url },
    update: {
      ...body.data,
      active: true
    },
    create: body.data
  });

  return NextResponse.json({ source }, { status: 201 });
}
