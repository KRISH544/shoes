import { ReleaseStatus } from "@prisma/client";
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
  status: z.nativeEnum(ReleaseStatus).optional(),
  releaseDate: z.string().datetime().nullable().optional(),
  price: z.string().trim().max(40).nullable().optional(),
  raffleUrl: z.string().url().nullable().optional(),
  notes: z.string().trim().max(1500).nullable().optional()
});

export async function PATCH(request: Request, context: RouteContext) {
  const body = patchSchema.safeParse(await readJson(request));
  if (!body.success) return jsonError("Invalid release update.");

  const { id } = await getParams(context.params);
  const release = await prisma.release.update({
    where: { id },
    data: {
      ...body.data,
      releaseDate: body.data.releaseDate ? new Date(body.data.releaseDate) : body.data.releaseDate
    }
  });

  return NextResponse.json({ release });
}
