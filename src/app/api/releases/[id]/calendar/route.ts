import { getParams, jsonError } from "@/lib/api";
import { createReleaseCalendar } from "@/lib/calendar";
import { prisma } from "@/lib/db";
import { getDefaultUser } from "@/lib/default-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getDefaultUser();
  const { id } = await getParams(context.params);
  const release = await prisma.release.findUnique({ where: { id } });

  if (!release) return jsonError("Release not found.", 404);

  const reminderMinutes = user.preferences?.calendarReminderMinutes || 30;

  await prisma.calendarReminder.upsert({
    where: {
      userId_releaseId: {
        userId: user.id,
        releaseId: release.id
      }
    },
    update: { reminderMinutes },
    create: {
      userId: user.id,
      releaseId: release.id,
      reminderMinutes
    }
  });

  const ics = await createReleaseCalendar(release, reminderMinutes);
  const filename = `${release.slug}.ics`;

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
