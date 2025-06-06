import Parser from "rss-parser";
import { FEEDS, FeedConfig } from "./feeds";

export interface Article {
  id: string; // unique ID (link + timestamp)
  title: string;
  link: string;
  pubDate: string; // original string;"Mon, 02 Jun 2025 12:34:56 GMT"
  isoDate: string; // ISO-formatted date (if available)
  contentSnippet?: string;
  source: string;
}

const parser = new Parser<{
  title: string;
  link: string;
  pubDate: string;
  isoDate: string;
  contentSnippet?: string;
}>();

/**
 * Fetch and parse a single RSS feed URL,
 * returning an array of normalized Article objects.
 */
export async function fetchFeed(feedConfig: FeedConfig): Promise<Article[]> {
  const { url, source } = feedConfig;
  try {
    const feed = await parser.parseURL(url);

    // Map each item into Article type
    const articles: Article[] = feed.items.map((item) => {
      // Create a deterministic ID: e.g. base64 of link + isoDate (fallback to pubDate)
      const rawId = `${item.link || ""}::${item.isoDate || item.pubDate || ""}`;
      const id = Buffer.from(rawId).toString("base64");
      if (source === "Hacker News") console.log(item.contentSnippet, item);
      return {
        id,
        title: item.title || "No title",
        link: item.link || "",
        pubDate: item.pubDate || "",
        isoDate: item.isoDate || "",
        contentSnippet: item.contentSnippet,
        source,
      };
    });

    return articles;
  } catch (err) {
    console.error(`Error fetching/parsing feed ${source} (${url}):`, err);
    return [];
  }
}

/**
 * Fetch all configured feeds in parallel,
 * then flatten into one array and sort by descending date.
 */
export async function fetchAllFeeds(): Promise<Article[]> {
  // Kick off all fetches at once
  const arraysOfArticles = await Promise.all(
    FEEDS.map((feedCfg) => fetchFeed(feedCfg))
  );
  //   console.log(`Fetched ${arraysOfArticles} feeds`);
  // Flatten into a single array
  const all = arraysOfArticles.flat();
  //   console.log(`flat array`,all);

  // Sort by most recent first (use isoDate if available; otherwise parse pubDate)
  all.sort((a, b) => {
    const dateA = a.isoDate ? new Date(a.isoDate) : new Date(a.pubDate);
    const dateB = b.isoDate ? new Date(b.isoDate) : new Date(b.pubDate);
    return dateB.getTime() - dateA.getTime();
  });

  return all;
}
