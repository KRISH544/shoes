import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getDefaultUser } from "@/lib/default-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pushSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(10),
    auth: z.string().min(10)
  })
});

export async function POST(request: Request) {
  const body = pushSchema.safeParse(await readJson(request));
  if (!body.success) return jsonError("Invalid push subscription.");

  const user = await getDefaultUser();
  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint: body.data.endpoint },
    update: {
      userId: user.id,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth
    },
    create: {
      userId: user.id,
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth
    }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { pushEnabled: true }
  });

  return NextResponse.json({ subscription }, { status: 201 });
}
