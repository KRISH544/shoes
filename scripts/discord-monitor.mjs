import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(rootDir, process.env.MONITOR_SOURCES_PATH || "config/discord-monitor.sources.json");
const keywordPath = resolve(rootDir, process.env.MONITOR_KEYWORDS_PATH || "config/discord-monitor.keywords.json");
const statePath = resolve(rootDir, process.env.MONITOR_STATE_PATH || ".monitor-state/seen.json");
const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
const sendInitialAlerts = process.env.SEND_INITIAL_ALERTS === "true";

const releaseWords =
  /\b(travis|cactus|jumpman|jordan|nike|snkrs|raffle|draw|release|restock|drop|dunk|sb|shoe|sneaker|low|high|retro)\b/i;

async function main() {
  const [sources, keywords, state] = await Promise.all([readJson(sourcePath, []), readJson(keywordPath, []), readJson(statePath, null)]);

  if (!Array.isArray(sources) || !sources.length) {
    throw new Error(`No sources found at ${sourcePath}`);
  }
  if (!Array.isArray(keywords) || !keywords.length) {
    throw new Error(`No keywords found at ${keywordPath}`);
  }

  const seen = new Set(state?.seen || []);
  const firstRun = state === null;
  const alerts = [];
  const checked = [];

  for (const source of sources) {
    try {
      const candidates = await fetchCandidates(source);
      checked.push({ name: source.name, candidates: candidates.length, ok: true });

      for (const candidate of candidates) {
        const matches = keywords.filter((keyword) => includesKeyword(candidate.searchText, keyword));
        if (!matches.length) continue;

        const id = candidate.id;
        const isNew = !seen.has(id);
        seen.add(id);

        if (isNew && (!firstRun || sendInitialAlerts)) {
          alerts.push({ ...candidate, matches, source });
        }
      }
    } catch (error) {
      checked.push({
        name: source.name || source.url,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  await saveJson(statePath, {
    updatedAt: new Date().toISOString(),
    seen: [...seen].slice(-4000),
    checked
  });

  if (alerts.length && webhookUrl) {
    await sendDiscordAlerts(alerts);
  }

  console.log(
    JSON.stringify(
      {
        checked: checked.length,
        alerts: alerts.length,
        firstRun,
        sentToDiscord: Boolean(alerts.length && webhookUrl),
        statePath
      },
      null,
      2
    )
  );

  if (alerts.length && !webhookUrl) {
    console.warn("Alerts were found, but DISCORD_WEBHOOK_URL is not set.");
  }
}

async function fetchCandidates(source) {
  const response = await fetch(source.url, {
    redirect: "follow",
    headers: {
      "User-Agent": "DropDeskDiscordMonitor/0.1 public-page-monitor",
      Accept: source.type === "rss" ? "application/rss+xml, application/xml, text/xml" : "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();
  return source.type === "rss" ? parseRss(text, source) : parseHtml(text, source);
}

function parseHtml(html, source) {
  const title = cleanText(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || source.name || source.url);
  const description = cleanText(
    matchFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      matchFirst(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i) ||
      ""
  );
  const bodyText = cleanText(stripTags(html)).slice(0, 900);
  const candidates = [
    {
      id: `page:${source.url}:${hash(`${title}|${description}|${bodyText}`)}`,
      title: title || source.name || source.url,
      url: source.url,
      snippet: bodyText || description,
      searchText: `${source.name} ${source.url} ${title} ${description} ${bodyText}`
    }
  ];

  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const href = absoluteUrl(match[1], source.url);
    if (!href) continue;

    const linkText = cleanText(stripTags(match[2]));
    const searchText = `${source.name} ${href} ${linkText}`;
    if (!releaseWords.test(searchText) && !hasAnyKeyword(searchText)) continue;

    candidates.push({
      id: `link:${href}:${hash(linkText || href)}`,
      title: linkText || href,
      url: href,
      snippet: source.notes || "",
      searchText
    });
  }

  return dedupeCandidates(candidates);
}

function parseRss(xml, source) {
  const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  return items
    .map(([, item]) => {
      const title = cleanText(readXmlTag(item, "title"));
      const link = cleanText(readXmlTag(item, "link")) || source.url;
      const description = cleanText(stripTags(readXmlTag(item, "description")));
      const pubDate = cleanText(readXmlTag(item, "pubDate"));
      const guid = cleanText(readXmlTag(item, "guid")) || link;

      return {
        id: `rss:${hash(`${guid}|${title}`)}`,
        title: title || source.name || source.url,
        url: absoluteUrl(link, source.url) || source.url,
        snippet: [description, pubDate].filter(Boolean).join(" "),
        searchText: `${source.name} ${link} ${title} ${description} ${pubDate}`
      };
    })
    .filter((candidate) => releaseWords.test(candidate.searchText) || hasAnyKeyword(candidate.searchText))
    .slice(0, 80);
}

async function sendDiscordAlerts(alerts) {
  const embeds = alerts.slice(0, 20).map((alert) => ({
    title: truncate(alert.title, 240),
    url: alert.url,
    description: truncate(alert.snippet || "Matching public release signal found.", 700),
    color: 0x2fb36d,
    fields: [
      { name: "Source", value: truncate(alert.source.name || alert.source.url, 120), inline: true },
      { name: "Matched", value: truncate(alert.matches.join(", "), 120), inline: true },
      { name: "Retailer", value: truncate(alert.source.retailer || "TBA", 120), inline: true }
    ],
    footer: { text: "Drop Desk monitor, manual checkout only" },
    timestamp: new Date().toISOString()
  }));

  for (let index = 0; index < embeds.length; index += 10) {
    await postDiscord({
      username: "Drop Desk",
      content: index === 0 ? `Found ${alerts.length} matching sneaker release signal${alerts.length === 1 ? "" : "s"}.` : undefined,
      embeds: embeds.slice(index, index + 10)
    });
  }
}

async function postDiscord(payload) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (response.status === 429) {
    const retry = await response.json().catch(() => null);
    const retryAfter = Math.ceil(Number(retry?.retry_after || 1) * 1000);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, retryAfter));
    return postDiscord(payload);
  }

  if (!response.ok) {
    throw new Error(`Discord webhook failed with HTTP ${response.status}: ${await response.text()}`);
  }
}

function includesKeyword(haystack, keyword) {
  const normalizedHaystack = normalize(haystack);
  const normalizedKeyword = normalize(keyword);
  return normalizedHaystack.includes(normalizedKeyword) || compact(normalizedHaystack).includes(compact(normalizedKeyword));
}

function hasAnyKeyword(value) {
  const lower = normalize(value);
  return /travis|cactus|jumpman|jordan|nike|snkrs/.test(lower);
}

function dedupeCandidates(candidates) {
  const seenIds = new Set();
  return candidates.filter((candidate) => {
    if (!candidate.title || seenIds.has(candidate.id)) return false;
    seenIds.add(candidate.id);
    return true;
  });
}

function readXmlTag(xml, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return decodeEntities(matchFirst(xml, new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i")) || "");
}

function matchFirst(value, pattern) {
  return value.match(pattern)?.[1] || "";
}

function stripTags(value) {
  return decodeEntities(value.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function decodeEntities(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function absoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function cleanText(value) {
  return decodeEntities(String(value || "")).replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return cleanText(value).toLowerCase();
}

function compact(value) {
  return value.replace(/[^a-z0-9]+/g, "");
}

function hash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 16);
}

function truncate(value, maxLength) {
  const text = cleanText(value);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
