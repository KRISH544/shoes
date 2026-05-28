import { createHash } from "node:crypto";
import { isValid, parse } from "date-fns";

const DATE_FORMATS = [
  "MMMM d, yyyy",
  "MMM d, yyyy",
  "MMMM d yyyy",
  "MMM d yyyy",
  "yyyy-MM-dd",
  "M/d/yyyy",
  "MM/dd/yyyy"
];

const MONTH_PATTERN =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

export function normalizeKeyword(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function includesKeyword(haystack: string, keyword: string) {
  const normalizedHaystack = normalizeKeyword(haystack);
  const normalizedKeyword = normalizeKeyword(keyword);

  return (
    normalizedHaystack.includes(normalizedKeyword) ||
    compactComparable(normalizedHaystack).includes(compactComparable(normalizedKeyword))
  );
}

export function slugify(value: string) {
  const slug = normalizeKeyword(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
  return slug || "release";
}

export function shortHash(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

export function cleanText(value?: string | null) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function compactComparable(value: string) {
  return value.replace(/[^a-z0-9]+/g, "");
}

export function absoluteUrl(href: string, baseUrl: string) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

export function extractPrice(text: string) {
  const match = text.match(/(?:USD\s*)?\$\s?\d{2,4}(?:\.\d{2})?|\bUSD\s?\d{2,4}(?:\.\d{2})?/i);
  return match ? match[0].replace(/\s+/g, " ").trim() : null;
}

export function extractDateText(text: string) {
  const monthMatch = text.match(new RegExp(`${MONTH_PATTERN}\\s+\\d{1,2}(?:,?\\s+20\\d{2})?`, "i"));
  if (monthMatch) return monthMatch[0].replace(/\s+/g, " ");

  const isoMatch = text.match(/\b20\d{2}-\d{1,2}-\d{1,2}\b/);
  if (isoMatch) return isoMatch[0];

  const usMatch = text.match(/\b\d{1,2}\/\d{1,2}\/20\d{2}\b/);
  if (usMatch) return usMatch[0];

  return null;
}

export function parseReleaseDate(text?: string | null) {
  if (!text) return null;

  const cleaned = cleanText(text).replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  const candidates = /\b20\d{2}\b/.test(cleaned)
    ? [cleaned]
    : [`${cleaned}, ${new Date().getFullYear()}`];

  for (const candidate of candidates) {
    for (const formatString of DATE_FORMATS) {
      const parsed = parse(candidate, formatString, new Date());
      if (isValid(parsed)) {
        const now = new Date();
        if (parsed.getTime() < now.getTime() - 1000 * 60 * 60 * 24 * 30) {
          parsed.setFullYear(parsed.getFullYear() + 1);
        }
        return parsed;
      }
    }

    const nativeParsed = new Date(candidate);
    if (!Number.isNaN(nativeParsed.getTime())) return nativeParsed;
  }

  return null;
}

export function inferRetailerFromUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const [name] = hostname.split(".");
    return name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  } catch {
    return null;
  }
}

export function isLikelyRaffle(text: string) {
  return /\b(raffle|draw|drawing|enter now|launch draw)\b/i.test(text);
}
