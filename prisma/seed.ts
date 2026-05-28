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

  const keywords = [
    "Travis Scott",
    "Cactus Jack",
    "Travis Scott x Nike",
    "Travis Scott x Jordan",
    "Travis Scott x Air Jordan",
    "CJ1",
    "T-Rexx",
    "Jumpman Jack",
    "Reverse Swoosh",
    "Air Jordan 1 Low OG SP",
    "Air Jordan 1 Low OG",
    "Nike SB Dunk",
    "SB Dunk",
    "Kobe Protro",
    "Nigel Sylvester",
    "Fragment",
    "Off-White",
    "Union",
    "A Ma Maniere",
    "Trophy Room",
    "Supreme",
    "NOCTA",
    "Patta"
  ];
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
      name: "Travis Scott Official Shop",
      url: "https://shop.travisscott.com/",
      type: SourceType.HTML,
      retailer: "Travis Scott",
      region: "GLOBAL",
      notes: "Official public shop. Watches visible page changes and drop links; check New Zealand shipping manually."
    },
    {
      name: "Nike NZ SNKRS Upcoming",
      url: "https://www.nike.com/nz/launch?s=upcoming",
      type: SourceType.HTML,
      retailer: "Nike New Zealand",
      region: "NZ",
      notes: "Nike New Zealand launch page. Manual checkout only."
    },
    {
      name: "Nike NZ New & Upcoming Drops",
      url: "https://www.nike.com/nz/w/new-upcoming-drops-k0gk",
      type: SourceType.HTML,
      retailer: "Nike New Zealand",
      region: "NZ",
      notes: "Nike New Zealand product drops. Manual checkout only."
    },
    {
      name: "Loaded NZ Releases",
      url: "https://loadednz.com/collections/releases",
      type: SourceType.HTML,
      retailer: "Loaded NZ",
      region: "NZ",
      notes: "New Zealand retailer. Special release rules apply."
    },
    {
      name: "Loaded NZ Home",
      url: "https://loadednz.com/",
      type: SourceType.HTML,
      retailer: "Loaded NZ",
      region: "NZ",
      notes: "New Zealand retailer homepage for raffle banners."
    },
    {
      name: "SUBTYPE NZ Raffles & Releases",
      url: "https://www.subtypestore.com/nz/categories/raffles",
      type: SourceType.HTML,
      retailer: "SUBTYPE New Zealand",
      region: "NZ",
      notes: "New Zealand raffle and release page."
    },
    {
      name: "JD Sports NZ Launches",
      url: "https://www.jdsports.co.nz/campaign/Launch/?facet-availability=launch",
      type: SourceType.HTML,
      retailer: "JD Sports New Zealand",
      region: "NZ",
      notes: "New Zealand launch products."
    },
    {
      name: "JD Sports NZ Launch Hub",
      url: "https://www.jdsports.co.nz/page/launch-hub/",
      type: SourceType.HTML,
      retailer: "JD Sports New Zealand",
      region: "NZ",
      notes: "New Zealand launch information."
    },
    {
      name: "JD Sports NZ Launch Blog",
      url: "https://blog.jdsports.co.nz/category/launches/",
      type: SourceType.HTML,
      retailer: "JD Sports New Zealand",
      region: "NZ",
      notes: "New Zealand launch announcements."
    },
    {
      name: "Hype DC NZ Limited Releases",
      url: "https://www.hypedc.com/nz/categories/new/limited-release",
      type: SourceType.HTML,
      retailer: "Hype DC New Zealand",
      region: "NZ",
      notes: "New Zealand limited releases."
    },
    {
      name: "Hype DC NZ New Arrivals",
      url: "https://www.hypedc.com/nz/categories/new",
      type: SourceType.HTML,
      retailer: "Hype DC New Zealand",
      region: "NZ",
      notes: "New Zealand new arrivals and restocks."
    },
    {
      name: "Foot Locker NZ New Arrivals",
      url: "https://www.footlocker.co.nz/en/category/collection/new-arrivals",
      type: SourceType.HTML,
      retailer: "Foot Locker New Zealand",
      region: "NZ",
      notes: "New Zealand new arrivals."
    },
    {
      name: "Foot Locker NZ Jordan",
      url: "https://www.footlocker.co.nz/en/category/brands/jordan",
      type: SourceType.HTML,
      retailer: "Foot Locker New Zealand",
      region: "NZ",
      notes: "New Zealand Jordan products."
    },
    {
      name: "Foot Locker NZ Nike",
      url: "https://www.footlocker.co.nz/en/category/brands/nike",
      type: SourceType.HTML,
      retailer: "Foot Locker New Zealand",
      region: "NZ",
      notes: "New Zealand Nike products."
    },
    {
      name: "END Launches NZ Delivery",
      url: "https://launches.endclothing.com/",
      type: SourceType.HTML,
      retailer: "END",
      region: "NZ",
      notes: "Ships to New Zealand from the UK. Duties and taxes may apply."
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
