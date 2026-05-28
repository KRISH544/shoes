import { spawn } from "node:child_process";

const intervalMs = Number(process.env.DISCORD_WATCH_INTERVAL_MS || 60_000);
let running = false;

console.log(`Drop Desk Discord watcher running every ${Math.round(intervalMs / 1000)} seconds.`);

runOnce();
setInterval(runOnce, intervalMs);

function runOnce() {
  if (running) {
    console.log(`[${new Date().toISOString()}] previous monitor run still active, skipping this tick`);
    return;
  }

  running = true;
  const child = spawn(process.execPath, ["scripts/discord-monitor.mjs"], {
    stdio: "inherit",
    env: process.env,
    shell: false
  });

  child.on("exit", (code) => {
    running = false;
    if (code !== 0) {
      console.error(`[${new Date().toISOString()}] monitor exited with code ${code}`);
    }
  });
}
