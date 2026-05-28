import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getDefaultUser } from "@/lib/default-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

const settingsSchema = z.object({
  name: z.preprocess(blankToNull, z.string().trim().max(80).nullable().optional()),
  email: z.preprocess(blankToNull, z.string().email().nullable().optional()),
  phone: z.preprocess(blankToNull, z.string().trim().max(30).nullable().optional()),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  calendarReminderMinutes: z.coerce.number().int().min(5).max(240).optional(),
  timezone: z.string().trim().max(80).optional()
});

export async function GET() {
  const user = await getDefaultUser();
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const body = settingsSchema.safeParse(await readJson(request));
  if (!body.success) return jsonError("Invalid settings update.");

  const user = await getDefaultUser();
  const { calendarReminderMinutes, timezone, ...userFields } = body.data;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...userFields,
      preferences: {
        upsert: {
          update: {
            ...(calendarReminderMinutes ? { calendarReminderMinutes } : {}),
            ...(timezone ? { timezone } : {})
          },
          create: {
            calendarReminderMinutes: calendarReminderMinutes || 30,
            timezone: timezone || process.env.DEFAULT_TIMEZONE || "Pacific/Auckland"
          }
        }
      }
    },
    include: {
      preferences: true,
      pushSubscriptions: true
    }
  });

  return NextResponse.json({ user: updated });
}
