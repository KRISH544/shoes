import { PrismaClient, SourceType } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  const email = process.env.DEFAULT_USER_EMAIL || "you@example.com";
  const name = process.env.DEFAULT_USER_NAME || "Sneaker Desk";
  const timezone = process.env.DEFAULT_TIMEZONE || "Pacific/Auckland";

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      preferences: {
        create: { timezone }
      }
    }
  });

  const keywords = ["Travis Scott", "Cactus Jack", "Jordan 1", "Nike SB"];
  for (const text of keywords) {
    await prisma.keyword.upsert({
      where: {
        userId_normalized: {
          userId: user.id,
          normalized: normalizeKeyword(text)
        }
      },
      update: { text, active: true },
      create: {
        userId: user.id,
        text,
        normalized: normalizeKeyword(text)
      }
    });
  }

  const sources = [
    {
      name: "Travis Scott Shop",
      url: "https://shop.travisscott.com/",
      type: SourceType.HTML,
      retailer: "Travis Scott",
      region: "US",
      notes: "Official public shop and coming-soon page. Manual checkout only."
    },
    {
      name: "Nike SNKRS Upcoming",
      url: "https://www.nike.com/launch?s=upcoming",
      type: SourceType.HTML,
      retailer: "Nike SNKRS",
      region: "US",
      notes: "Public Nike launch page. No login or cart actions."
    },
    {
      name: "Sneaker News Release Dates",
      url: "https://sneakernews.com/release-dates/",
      type: SourceType.HTML,
      retailer: "Sneaker News",
      region: "US",
      notes: "Public sneaker release calendar."
    },
    {
      name: "Sneaker News RSS",
      url: "https://sneakernews.com/feed/",
      type: SourceType.RSS,
      retailer: "Sneaker News",
      region: "US",
      notes: "Public sneaker news feed."
    },
    {
      name: "Nice Kicks Release Dates",
      url: "https://www.nicekicks.com/sneaker-release-dates/",
      type: SourceType.HTML,
      retailer: "Nice Kicks",
      region: "US",
      notes: "Public release dates page."
    },
    {
      name: "KicksOnFire Release Dates",
      url: "https://www.kicksonfire.com/release-dates/",
      type: SourceType.HTML,
      retailer: "KicksOnFire",
      region: "US",
      notes: "Public release dates page."
    },
    {
      name: "Foot Locker Release Calendar",
      url: "https://www.footlocker.com/release-dates",
      type: SourceType.HTML,
      retailer: "Foot Locker",
      region: "US",
      notes: "Public release calendar. Manual checkout only."
    }
  ];

  for (const source of sources) {
    await prisma.source.upsert({
      where: { url: source.url },
      update: source,
      create: source
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
