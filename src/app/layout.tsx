// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Offline News AI",
  description: "PWA News Reader with AI Summarizer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        {/* Theme color for the address bar/status bar */}
        <meta name="theme-color" content="#6366f1" />

        {/* Fallback icons */}
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-white text-black dark:bg-zinc-900 dark:text-white">
        {/* Register service worker on the client */}
        <ServiceWorkerRegistration />

        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
