// src/components/FeedList.tsx
"use client";

import React, { useEffect, useState } from "react";
import ArticleCard from "./ArticleCard";
import { Article } from "@/lib/fetchFeeds";
import { getAllArticlesFromDB, saveArticlesToDB } from "@/lib/db";

export default function FeedList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ----- Helper: dedupe an array of articles by "id::source" -----
  function dedupeArticles(input: Article[]): Article[] {
    const seen = new Set<string>();
    const output: Article[] = [];
    for (const a of input) {
      const key = `${a.id}::${a.source}`;
      if (!seen.has(key)) {
        seen.add(key);
        output.push(a);
      }
    }
    return output;
  }

  // 1. On mount, load from IndexedDB first
  useEffect(() => {
    async function loadCached() {
      try {
        const cached = await getAllArticlesFromDB();
        if (cached.length > 0) {
          // Dedupe before setting state
          const uniqueCached = dedupeArticles(cached);
          setArticles(uniqueCached);
        }
      } catch (err) {
        console.error("Failed to load cached articles:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCached();
  }, []);

  // 2. Then fetch fresh from /api/feeds
  useEffect(() => {
    async function fetchAndCache() {
      try {
        const res = await fetch("/api/feeds");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        const fetched: Article[] = Array.isArray(json.articles)
          ? json.articles
          : [];

        if (fetched.length > 0) {
          // Dedupe fetched list
          const uniqueFetched = dedupeArticles(fetched);

          setArticles(uniqueFetched);

          // Save deduped array to IndexedDB
          try {
            await saveArticlesToDB(uniqueFetched);
          } catch (dbErr) {
            console.error("Failed to save articles to DB:", dbErr);
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch /api/feeds:", err);
        setError("Unable to fetch latest articles. Showing cached results.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAndCache();
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Latest News</h1>
        {isLoading && <span className="text-sm text-gray-500">Loading…</span>}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
          {error}
        </div>
      )}

      {articles.length === 0 && !isLoading && (
        <p className="text-gray-600 dark:text-gray-400">
          No articles to show. You might be offline or have no cached items.
        </p>
      )}

      <div>
        {articles.map((article) => {
          // Use exactly the same dedupe key as the React key:
          const reactKey = `${article.id}::${article.source}`;
          return <ArticleCard key={reactKey} article={article} />;
        })}
      </div>
    </section>
  );
}
