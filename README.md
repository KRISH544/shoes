# Sneaker Release Tracker

A safe sneaker release monitoring app for Travis Scott Nike/Jordan releases and highly anticipated drops. It checks public release pages, matches your keywords, then sends alerts and calendar reminders.

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

## Alert Focus

The Discord monitor is tuned for Travis Scott Nike/Jordan releases first, then a smaller set of highly anticipated collaborations such as Nike SB Dunk, Kobe Protro, Fragment, Off-White, Union, A Ma Maniere, Trophy Room, Supreme, NOCTA, Patta, and Nigel Sylvester drops.

The official Travis Scott shop is not monitored by default because NZ shoe shipping is not reliably confirmable there. Add it back only if a specific drop clearly supports New Zealand delivery.

## No-Database Discord Monitor

If you cannot install PostgreSQL or Docker, use the lightweight Discord monitor instead:

```powershell
$env:DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
node scripts/discord-monitor.mjs
```

For hosted 5-minute checks, push the repo to GitHub and add `DISCORD_WEBHOOK_URL` as an Actions secret. The workflow at `.github/workflows/discord-monitor.yml` will post matching releases into Discord.

See `docs/discord-monitor.md` for the full setup.

The Discord monitor is filtered to NZ-buyable sources: New Zealand retailers plus END launches, which ships to New Zealand. It intentionally avoids private Discord scraping, hidden inventory endpoints, queue bypassing, checkout automation, CAPTCHA flows, and account automation.

GitHub Actions scheduled workflows run at a shortest interval of 5 minutes. For 1-minute checks, run `npm run discord:watch` locally with `DISCORD_WEBHOOK_URL` set and keep the terminal open.

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
