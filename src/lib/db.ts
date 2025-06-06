// src/lib/db.ts
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
    // Bump version from 1 → 2 to force the upgrade() callback
    dbPromise = openDB<OfflineNewsDB>("offline-news-db", 2, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // If coming from a version < 1, create "articles"
        if (oldVersion < 1) {
          const articlesStore = db.createObjectStore("articles", {
            keyPath: "id",
          });
          articlesStore.createIndex("by-pubDate", "pubDate");
        }

        // If coming from a version < 2, create "summaries"
        if (oldVersion < 2) {
          db.createObjectStore("summaries", {
            keyPath: "id",
          });
        }

        // (If you later bump to version 3+, you can handle additional upgrades here)
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
