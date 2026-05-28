import { Release } from "@prisma/client";
import { createEvent } from "ics";

export async function createReleaseCalendar(release: Release, reminderMinutes = 30) {
  const startDate = release.releaseDate || new Date();
  const [year, month, day, hour, minute] = toIcsDateArray(startDate);
  const url = release.raffleUrl || release.productUrl || release.sourceUrl;

  const { error, value } = createEvent({
    title: `${release.title} release`,
    description: [
      release.retailer ? `Retailer: ${release.retailer}` : null,
      release.price ? `Price: ${release.price}` : null,
      release.notes,
      `Open manually: ${url}`
    ]
      .filter(Boolean)
      .join("\n"),
    location: release.retailer || "Online",
    url,
    start: [year, month, day, hour, minute],
    duration: { minutes: 30 },
    alarms: [
      {
        action: "display",
        description: `Manual checkout prep for ${release.title}`,
        trigger: { minutes: reminderMinutes, before: true }
      }
    ]
  });

  if (error || !value) {
    throw error || new Error("Could not create calendar event");
  }

  return value;
}

function toIcsDateArray(date: Date): [number, number, number, number, number] {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes()
  ];
}
