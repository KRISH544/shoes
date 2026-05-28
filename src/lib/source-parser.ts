import type { Source } from "@prisma/client";
import { SourceType } from "@prisma/client";
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import {
  absoluteUrl,
  cleanText,
  extractDateText,
  extractPrice,
  inferRetailerFromUrl,
  parseReleaseDate
} from "@/lib/normalize";

export type ReleaseCandidate = {
  title: string;
  url: string;
  snippet?: string | null;
  releaseDate?: Date | null;
  price?: string | null;
  imageUrl?: string | null;
  raffleUrl?: string | null;
  retailer?: string | null;
};

type JsonRecord = Record<string, unknown>;

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "SneakerReleaseTracker/0.1 public-page-monitor"
  }
});

const releaseLikePattern =
  /\b(release|release date|raffle|draw|sneaker|sneakers|jordan|nike|travis|dunk|sb|air max|retro|launch|snkrs|shoe|shoes)\b/i;

export async function parseSource(source: Source) {
  if (source.type === SourceType.RSS) {
    return parseRssSource(source);
  }

  return parseHtmlSource(source);
}

async function parseRssSource(source: Source): Promise<ReleaseCandidate[]> {
  const feed = await parser.parseURL(source.url);
  return feed.items
    .map((item) => {
      const title = cleanText(item.title);
      const snippet = cleanText(item.contentSnippet || item.content || "");
      const url = item.link || source.url;
      const dateText = extractDateText(`${title} ${snippet}`);

      return {
        title,
        url,
        snippet,
        releaseDate: parseReleaseDate(dateText || item.isoDate || item.pubDate),
        price: extractPrice(snippet),
        imageUrl: getRssImage(item),
        retailer: source.retailer || inferRetailerFromUrl(url)
      };
    })
    .filter((candidate) => candidate.title && releaseLikePattern.test(`${candidate.title} ${candidate.snippet}`))
    .slice(0, 80);
}

async function parseHtmlSource(source: Source): Promise<ReleaseCandidate[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SneakerReleaseTracker/0.1 public-page-monitor",
        Accept: "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const candidates = new Map<string, ReleaseCandidate>();

    collectJsonLdCandidates($, source).forEach((candidate) => {
      candidates.set(candidate.url, candidate);
    });

    $("a[href]").each((_, element) => {
      const anchor = $(element);
      const title = cleanText(anchor.text() || anchor.attr("aria-label") || anchor.attr("title"));
      if (title.length < 4 || title.length > 180) return;

      const url = absoluteUrl(anchor.attr("href") || "", source.url);
      if (!url) return;

      const containerText = cleanText(anchor.closest("article, li, section, div").text()).slice(0, 700);
      const combined = `${title} ${containerText} ${url}`;
      if (!releaseLikePattern.test(combined)) return;

      const imageUrl =
        absoluteUrl(anchor.find("img").first().attr("src") || anchor.closest("article, li, section").find("img").first().attr("src") || "", source.url) ||
        null;
      const dateText = extractDateText(containerText || title);
      const existing = candidates.get(url);

      candidates.set(url, {
        title: existing?.title || title,
        url,
        snippet: existing?.snippet || containerText,
        releaseDate: existing?.releaseDate || parseReleaseDate(dateText),
        price: existing?.price || extractPrice(containerText),
        imageUrl: existing?.imageUrl || imageUrl,
        raffleUrl: /\b(raffle|draw)\b/i.test(combined) ? url : existing?.raffleUrl || null,
        retailer: existing?.retailer || source.retailer || inferRetailerFromUrl(url)
      });
    });

    return [...candidates.values()].slice(0, 120);
  } finally {
    clearTimeout(timeout);
  }
}

function collectJsonLdCandidates($: cheerio.CheerioAPI, source: Source) {
  const candidates: ReleaseCandidate[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      flattenJsonLd(parsed).forEach((item) => {
        const offers = asRecord(item.offers);
        const title = cleanText(getString(item.name) || getString(item.headline));
        const url = absoluteUrl(getString(item.url) || getString(offers?.url) || "", source.url);
        if (!title || !url) return;

        const description = getString(item.description);
        const text = cleanText(`${title} ${description}`);
        if (!releaseLikePattern.test(text)) return;

        const offerPrice = offers?.price ? `$${String(offers.price)}` : null;
        const image = Array.isArray(item.image) ? item.image[0] : item.image;
        const imageUrl = getString(image);

        candidates.push({
          title,
          url,
          snippet: cleanText(description),
          releaseDate: parseReleaseDate(getString(item.releaseDate) || getString(item.startDate) || extractDateText(text)),
          price: offerPrice || extractPrice(text),
          imageUrl: imageUrl ? absoluteUrl(imageUrl, source.url) : null,
          raffleUrl: /\b(raffle|draw)\b/i.test(text) ? url : null,
          retailer: source.retailer || inferRetailerFromUrl(url)
        });
      });
    } catch {
      // Ignore invalid JSON-LD blocks from third-party pages.
    }
  });

  return candidates;
}

function flattenJsonLd(value: unknown): JsonRecord[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== "object") return [];

  const record = value as JsonRecord;
  const graph = record["@graph"] ? flattenJsonLd(record["@graph"]) : [];
  return [record, ...graph];
}

function getRssImage(item: JsonRecord) {
  const enclosure = asRecord(item.enclosure);
  const enclosureUrl = getString(enclosure?.url);
  if (enclosureUrl) return enclosureUrl;

  const mediaContent = asRecord(item["media:content"]);
  const mediaThumbnail = asRecord(item["media:thumbnail"]);
  const mediaContentAttrs = asRecord(mediaContent?.$);
  const mediaThumbnailAttrs = asRecord(mediaThumbnail?.$);
  return getString(mediaContentAttrs?.url) || getString(mediaThumbnailAttrs?.url) || null;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}
