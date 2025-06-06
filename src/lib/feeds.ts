// src/lib/feeds.ts
export interface FeedConfig {
  url: string;
  source: string;
}

export const FEEDS: FeedConfig[] = [
  {
    url: "https://feeds.bbci.co.uk/news/rss.xml",
    source: "BBC News",
  },
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
    source: "NYTimes Tech",
  },
  {
    url: "https://hnrss.org/frontpage",
    source: "Hacker News",
  },
  // — you can add more feeds here as-needed —
];
