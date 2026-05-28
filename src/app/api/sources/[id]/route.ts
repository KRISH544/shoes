import { NextResponse } from "next/server";
import { z } from "zod";
import { getParams, jsonError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  url: z.string().url().optional(),
  active: z.boolean().optional(),
  retailer: z.string().trim().max(80).optional().nullable(),
  region: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable()
});

export async function PATCH(request: Request, context: RouteContext) {
  const body = patchSchema.safeParse(await readJson(request));
  if (!body.success) return jsonError("Invalid source update.");

  const { id } = await getParams(context.params);
  const source = await prisma.source.update({
    where: { id },
    data: body.data
  });

  return NextResponse.json({ source });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await getParams(context.params);
  await prisma.source.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
