// src/components/ArticleCard.tsx
import React from "react";
import { Article } from "@/lib/fetchFeeds";
import format from "date-fns/format";
import parseISO from "date-fns/parseISO";

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  // Convert isoDate/pubDate to a human-readable string
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
