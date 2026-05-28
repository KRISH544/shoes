# Sneaker Release Tracker

A safe sneaker release monitoring app for Travis Scott, Jordan, Nike, Nike SB, and related drops. It checks public release and sneaker news pages, matches your keywords, then sends alerts and calendar reminders.

This is not a checkout bot. It does not automate carts, queue access, CAPTCHA solving, account creation, raffle entries, or purchasing.

## Project Structure

```text
prisma/
  schema.prisma          Database schema
  seed.ts                Default user, keywords, and public sources
public/
  sw.js                  Web push service worker
src/
  app/                   Next.js UI pages and API routes
  components/            Dashboard, forms, tables, checklist
  lib/                   Prisma, scanner, parsers, notifications, calendar helpers
  scripts/               One-shot scan and 15-minute cron runner
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and adjust values:

```bash
copy .env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Create tables and seed starter sources:

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scanner Jobs

Run a one-time public source scan:

```bash
npm run scan
```

Run the local 15-minute scanner:

```bash
npm run cron
```

## Using The Travis Scott Shop

The seed data includes `https://shop.travisscott.com/` as an official public source. Keep `Travis Scott` and `Cactus Jack` active as keywords, then add exact model keywords when rumors become concrete, for example `Jumpman Jack`, `Jordan 1 Low`, or a colorway name.

If the shop is on a password or coming-soon page, the tracker can only read the public HTML that is visible without logging in. Use Nike SNKRS, official raffle pages, and sneaker news sources alongside the shop URL for release date, raffle link, price, and retailer details.

## No-Database Discord Monitor

If you cannot install PostgreSQL or Docker, use the lightweight Discord monitor instead:

```powershell
$env:DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
node scripts/discord-monitor.mjs
```

For hosted 15-minute checks, push the repo to GitHub and add `DISCORD_WEBHOOK_URL` as an Actions secret. The workflow at `.github/workflows/discord-monitor.yml` will post matching releases into Discord.

See `docs/discord-monitor.md` for the full setup.

For hosted cron, call:

```text
POST /api/cron/scan
Authorization: Bearer <CRON_SECRET>
```

## Alerts

- Email alerts use SendGrid.
- SMS alerts use Twilio.
- Push alerts use Web Push VAPID keys and the browser service worker.

If credentials are missing, notifications are recorded as skipped instead of sent.
