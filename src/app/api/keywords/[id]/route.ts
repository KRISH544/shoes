import { NextResponse } from "next/server";
import { z } from "zod";
import { getParams, jsonError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getDefaultUser } from "@/lib/default-user";
import { normalizeKeyword } from "@/lib/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

const patchSchema = z.object({
  active: z.boolean().optional(),
  text: z.string().trim().min(2).max(80).optional()
});

export async function PATCH(request: Request, context: RouteContext) {
  const body = patchSchema.safeParse(await readJson(request));
  if (!body.success) return jsonError("Invalid keyword update.");

  const user = await getDefaultUser();
  const { id } = await getParams(context.params);

  const update = await prisma.keyword.updateMany({
    where: { id, userId: user.id },
    data: {
      ...body.data,
      normalized: body.data.text ? normalizeKeyword(body.data.text) : undefined
    }
  });

  if (!update.count) return jsonError("Keyword not found.", 404);

  const keyword = await prisma.keyword.findUniqueOrThrow({ where: { id } });

  return NextResponse.json({ keyword });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getDefaultUser();
  const { id } = await getParams(context.params);

  await prisma.keyword.deleteMany({
    where: { id, userId: user.id }
  });

  return NextResponse.json({ ok: true });
}
