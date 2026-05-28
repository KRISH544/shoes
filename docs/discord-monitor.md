# Discord Sneaker Monitor

This is the lightweight version of Drop Desk. It does not need PostgreSQL, Docker, SendGrid, Twilio, or the Next.js app. It checks public pages and RSS feeds, matches your keywords, and posts alerts to a Discord channel through a webhook.

It is not a checkout bot. It does not cart products, bypass queues, solve CAPTCHA, create accounts, enter raffles, or purchase anything.

## What People Usually Mean By Monitor

Sneaker groups usually split the system into two parts:

- Monitors: watch official shops, release calendars, raffle pages, RSS feeds, social posts, and public product pages.
- Checkout bots: automate carts, accounts, queues, CAPTCHA solving, payment, and proxy rotation.

This repo only implements the monitor side. The useful part for you is speed: Discord pings you with the link and matching keyword so you can open the release manually.

## Discord Setup

1. Create a private Discord server or channel.
2. Open the channel settings.
3. Go to `Integrations` then `Webhooks`.
4. Create a webhook and copy the webhook URL.
5. Keep that URL private. Anyone with it can post to that channel.

## Run Once Locally

This only needs Node.js. No database.

PowerShell:

```powershell
$env:DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
node scripts/discord-monitor.mjs
```

By default, the first run records what already exists and does not spam old links. To send test alerts for existing matches:

```powershell
$env:SEND_INITIAL_ALERTS="true"
node scripts/discord-monitor.mjs
```

## Run Every 15 Minutes On GitHub

1. Push this folder to a private GitHub repo.
2. In GitHub, go to `Settings` then `Secrets and variables` then `Actions`.
3. Add a repository secret named `DISCORD_WEBHOOK_URL`.
4. Open the `Actions` tab.
5. Enable and run `Discord Sneaker Monitor`.

The workflow in `.github/workflows/discord-monitor.yml` runs every 15 minutes and stores duplicate-prevention state in GitHub Actions cache.

## Edit Keywords

Update `config/discord-monitor.keywords.json`.

Good Travis terms:

```json
[
  "Travis Scott",
  "Cactus Jack",
  "Jumpman Jack",
  "Jordan 1 Low",
  "Nike SB"
]
```

## Edit Sources

Update `config/discord-monitor.sources.json`.

The official Travis Scott shop is already included:

```json
{
  "name": "Travis Scott Shop",
  "url": "https://shop.travisscott.com/",
  "type": "html",
  "retailer": "Travis Scott"
}
```

If the page is password protected, the monitor only sees the public coming-soon page. It can detect visible page changes, but it cannot see hidden products.

The default source bundle also includes public sneaker news feeds, release calendars, and official launch or raffle pages. Newly added sources are bootstrapped silently by default so Discord does not get spammed with old posts. To intentionally alert on everything from a new source, set `SEND_NEW_SOURCE_ALERTS=true` for one run.

## What This Cannot Monitor

- Private Discord servers or paid cook-group channels unless you own them and add a legitimate webhook/source.
- Password-protected shop inventory.
- Hidden Shopify endpoints, bot APIs, carts, queues, or CAPTCHA flows.
- Anything that requires logging into someone else's account or bypassing access controls.
