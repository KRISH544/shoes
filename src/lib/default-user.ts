import { prisma } from "@/lib/db";

export async function getDefaultUser() {
  const existing = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      preferences: true,
      pushSubscriptions: true
    }
  });

  if (existing) return existing;

  const email = process.env.DEFAULT_USER_EMAIL || "you@example.com";
  const timezone = process.env.DEFAULT_TIMEZONE || "Pacific/Auckland";

  return prisma.user.create({
    data: {
      email,
      name: process.env.DEFAULT_USER_NAME || "Sneaker Desk",
      preferences: {
        create: { timezone }
      }
    },
    include: {
      preferences: true,
      pushSubscriptions: true
    }
  });
}
