// src/components/ArticleCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Article } from "@/lib/fetchFeeds";
import { getSummaryFromDB, saveSummaryToDB } from "@/lib/db";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  // Summary-related state
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);

  // On mount, try to load any existing summary from IndexedDB
  useEffect(() => {
    let isMounted = true;
    async function loadExistingSummary() {
      try {
        const cached = await getSummaryFromDB(article.id);
        if (isMounted && cached) {
          setSummary(cached);
        }
      } catch (err) {
        console.error("Error loading summary from DB:", err);
      }
    }
    loadExistingSummary();
    return () => {
      isMounted = false;
    };
  }, [article.id]);

  const handleSummarize = async () => {
    // If we already have a summary, do nothing
    if (summary) {
      return;
    }
    setLoadingSummary(true);
    setErrorSummary(null);

    // Fallback: use contentSnippet if available; otherwise tell user to wait
    const contentToSummarize =
      article.contentSnippet || `Article title: ${article.title}`;

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: article.id,
          content: contentToSummarize,
          URL: article.link,
        }),
      });

      if (res.status === 429) {
        const { retryAfter } = await res.json();
        setErrorSummary(
          `Rate limit exceeded. Please try again in ${
            retryAfter || "a minute"
          }.`
        );
        setLoadingSummary(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const newSummary: string = data.summary;
      setSummary(newSummary);
      // Save into IndexedDB
      try {
        await saveSummaryToDB(article.id, newSummary);
      } catch (dbErr) {
        console.error("Failed to save summary to DB:", dbErr);
      }
    } catch (err: any) {
      console.error("Error fetching summary:", err);
      setErrorSummary("Failed to generate summary.");
    } finally {
      setLoadingSummary(false);
    }
  };

  // Format publication date
  let displayDate = "Unknown date";
  if (article.isoDate) {
    try {
      displayDate = format(parseISO(article.isoDate), "PPP p");
    } catch {
      displayDate = article.pubDate;
    }
  } else if (article.pubDate) {
    displayDate = article.pubDate;
  }

  return (
    <article className="border-b border-gray-200 dark:border-gray-700 py-4">
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        <h2 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">
          {article.title}
        </h2>
      </a>
      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
        <span>{article.source}</span>
        <span className="mx-2">•</span>
        <time dateTime={article.isoDate || article.pubDate}>{displayDate}</time>
      </div>
      {article.contentSnippet && (
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          {article.contentSnippet}
        </p>
      )}

      {/* Summarization Section */}
      <div className="mt-3">
        {/* If summary exists, show “View Summary” and the text */}
        {summary ? (
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <h3 className="font-medium mb-1 text-gray-700 dark:text-gray-300">
              Summary:
            </h3>
            <p className="text-gray-800 dark:text-gray-200">{summary}</p>
          </div>
        ) : (
          <button
            onClick={handleSummarize}
            disabled={loadingSummary}
            className="inline-flex items-center px-3 py-1.5 bg-indigo-500 text-white text-sm font-medium rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            {loadingSummary ? "Summarizing…" : "Summarize"}
          </button>
        )}
        {errorSummary && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errorSummary}
          </p>
        )}
      </div>

      <div className="mt-2">
        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-indigo-500 hover:underline"
        >
          Read Online →
        </a>
      </div>
    </article>
  );
}
