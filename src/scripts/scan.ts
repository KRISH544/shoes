import { runReleaseScan } from "@/lib/scanner";
import { prisma } from "@/lib/db";

async function main() {
  const summary = await runReleaseScan();
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
