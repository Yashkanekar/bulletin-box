
import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Article } from "./fetchFeeds";

interface OfflineNewsDB extends DBSchema {
  articles: {
    key: string; // article.id
    value: Article;
    // We’ll index by pubDate for quick sorting if needed (optional)
    indexes: { "by-pubDate": string };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineNewsDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineNewsDB>("offline-news-db", 1, {
      upgrade(db) {
        // Create an "articles" store, keyed by Article.id
        const store = db.createObjectStore("articles", {
          keyPath: "id",
        });
        // Create an index on pubDate (string), helps if we want to query sorted
        store.createIndex("by-pubDate", "pubDate");
      },
    });
  }
  return dbPromise;
}

/**
 * Save (or overwrite) an array of articles into IndexedDB.
 * This clears the existing store first, then adds all.
 */
export async function saveArticlesToDB(articles: Article[]) {
  const db = await getDB();
  const tx = db.transaction("articles", "readwrite");
  await tx.store.clear();
  for (const article of articles) {
    await tx.store.put(article);
  }
  return tx.done;
}

/**
 * Retrieve all articles from IndexedDB, sorted by pubDate descending.
 */
export async function getAllArticlesFromDB(): Promise<Article[]> {
  const db = await getDB();
  // Get all articles (it returns in insertion order, but we want sorted by date)
  const all = await db.getAll("articles");
  // Sort descending by date (use isoDate if available)
  all.sort((a, b) => {
    const dateA = a.isoDate ? new Date(a.isoDate) : new Date(a.pubDate);
    const dateB = b.isoDate ? new Date(b.isoDate) : new Date(b.pubDate);
    return dateB.getTime() - dateA.getTime();
  });
  return all;
}
