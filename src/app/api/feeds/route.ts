
import { NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/fetchFeeds";

export async function GET() {
  try {
    const articles = await fetchAllFeeds();
    return NextResponse.json({ articles });
  } catch (err) {
    console.error("Error in /api/feeds:", err);
    return NextResponse.json(
      { error: "Failed to fetch feeds." },
      { status: 500 }
    );
  }
}
