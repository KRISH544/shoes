import cron from "node-cron";
import { runReleaseScan } from "@/lib/scanner";

async function scan() {
  const summary = await runReleaseScan();
  console.log(`[${new Date().toISOString()}] scan complete`, summary);
}

console.log("Sneaker release scanner running every 15 minutes.");
void scan();

cron.schedule("*/15 * * * *", () => {
  void scan().catch((error) => {
    console.error(`[${new Date().toISOString()}] scan failed`, error);
  });
});
