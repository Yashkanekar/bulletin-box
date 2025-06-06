
import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Article } from "./fetchFeeds";

interface OfflineNewsDB extends DBSchema {
  articles: {
    key: string; // article.id
    value: Article;
    indexes: { "by-pubDate": string };
  };
  summaries: {
    key: string; // article.id
    value: { id: string; summary: string };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineNewsDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineNewsDB>("offline-news-db", 1, {
      upgrade(db) {
        // "articles" store
        if (!db.objectStoreNames.contains("articles")) {
          const store = db.createObjectStore("articles", {
            keyPath: "id",
          });
          store.createIndex("by-pubDate", "pubDate");
        }
        //"summaries" store
        if (!db.objectStoreNames.contains("summaries")) {
          db.createObjectStore("summaries", {
            keyPath: "id",
          });
        }
      },
    });
  }
  return dbPromise;
}

/** Clear then save a batch of articles into IndexedDB. */
export async function saveArticlesToDB(articles: Article[]) {
  const db = await getDB();
  const tx = db.transaction("articles", "readwrite");
  await tx.store.clear();
  for (const article of articles) {
    await tx.store.put(article);
  }
  return tx.done;
}

/** Get all articles from IndexedDB, sorted by date desc. */
export async function getAllArticlesFromDB(): Promise<Article[]> {
  const db = await getDB();
  const all = await db.getAll("articles");
  all.sort((a, b) => {
    const dateA = a.isoDate ? new Date(a.isoDate) : new Date(a.pubDate);
    const dateB = b.isoDate ? new Date(b.isoDate) : new Date(b.pubDate);
    return dateB.getTime() - dateA.getTime();
  });
  return all;
}

/** Save a summary for a given article ID. */
export async function saveSummaryToDB(id: string, summary: string) {
  const db = await getDB();
  await db.put("summaries", { id, summary });
}

/** Get a summary (if any) by article ID. */
export async function getSummaryFromDB(
  id: string
): Promise<string | undefined> {
  const db = await getDB();
  const record = await db.get("summaries", id);
  return record?.summary;
}
