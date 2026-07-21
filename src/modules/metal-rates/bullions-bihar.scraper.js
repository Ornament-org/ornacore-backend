/* global AbortController, fetch */
import { AppError } from "../../shared/errors/AppError.js";

const SOURCE_NAME = "bullions.co.in";

const htmlToText = (html) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8377;|&#x20B9;|& #8377;/gi, "₹")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const parseMoney = (value) => Number(String(value).replace(/,/g, ""));

const matchNumber = (text, pattern, label) => {
  const match = text.match(pattern);
  if (!match) {
    throw new AppError(`Unable to parse ${label} from Bullions Bihar page`, {
      statusCode: 502,
      code: "BULLIONS_PARSE_FAILED",
    });
  }
  return parseMoney(match[1]);
};

export const parseBullionsBiharRates = (html, { sourceUrl, location = "Bihar" } = {}) => {
  const text = htmlToText(html);
  const sourceRawUpdate =
    text.match(/Gold Rate Today in Bihar Last Update\s*:\s*([^]+?)\s+Name 1 Gram/i)?.[1]?.trim() ??
    text.match(/Last Update\s*:\s*([^]+?)\s+Name 1 Gram/i)?.[1]?.trim() ??
    null;

  const goldPerGram = matchNumber(
    text,
    /Gold\s+24\s+Karat\b[^\d]+([\d,]+)\s+[\d,]+/i,
    "Gold 24 Karat 1 Gram",
  );
  const silverPerKilogram = matchNumber(
    text,
    /Silver\s+999\s+Fine\b[^\d]+[\d,]+\s+[\d,]+\s+[\d,]+\s+([\d,]+)/i,
    "Silver 999 1 Kilogram",
  );

  return {
    sourceName: SOURCE_NAME,
    sourceLocation: location,
    sourceUrl,
    sourceRawUpdate,
    fetchedAt: new Date(),
    rates: [
      {
        metalCode: "GOLD",
        purity: "24K",
        basePricePerGram: Number(goldPerGram.toFixed(2)),
      },
      {
        metalCode: "SILVER",
        purity: "999",
        basePricePerGram: Number((silverPerKilogram / 1000).toFixed(2)),
      },
    ],
  };
};

export const fetchBullionsBiharRates = async ({ sourceUrl, location, timeoutMs = 15000 } = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "OrnaCore metal-rate sync (+https://ornacore.local)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new AppError(`Bullions responded with HTTP ${response.status}`, {
        statusCode: 502,
        code: "BULLIONS_FETCH_FAILED",
      });
    }

    return parseBullionsBiharRates(await response.text(), { sourceUrl, location });
  } finally {
    clearTimeout(timeout);
  }
};
