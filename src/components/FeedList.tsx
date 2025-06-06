// src/components/FeedList.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import ArticleCard from "./ArticleCard";
import { Article } from "@/lib/fetchFeeds";
import { getAllArticlesFromDB, saveArticlesToDB } from "@/lib/db";

export default function FeedList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // How many articles to show so far
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // A ref to the “sentinel” div at the bottom
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // — Helper: dedupe by “id::source” —
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
          const uniqueFetched = dedupeArticles(fetched);
          setArticles(uniqueFetched);
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

  // 3. IntersectionObserver to increment visibleCount when sentinel is visible
  const onIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const first = entries[0];
      if (first.isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + 10, articles.length));
      }
    },
    [articles.length]
  );

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(onIntersection, {
      root: null,
      rootMargin: "0px",
      threshold: 1.0,
    });
    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [onIntersection]);

  // The subset of articles to render right now
  const visibleArticles = articles.slice(0, visibleCount);

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

      {visibleArticles.length === 0 && !isLoading && (
        <p className="text-gray-600 dark:text-gray-400">
          No articles to show. You might be offline or have no cached items.
        </p>
      )}

      <div>
        {visibleArticles.map((article) => {
          const reactKey = `${article.id}::${article.source}`;
          return <ArticleCard key={reactKey} article={article} />;
        })}
      </div>

      {/* Sentinel div for infinite scroll */}
      <div ref={sentinelRef} className="h-8" />

      {/* If not loading, and there are more articles to load, show a “Loading more…” indicator */}
      {!isLoading && visibleCount < articles.length && (
        <p className="mt-4 text-center text-gray-500">Loading more…</p>
      )}
    </section>
  );
}
