// src/app/api/summarize/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY in environment");
}
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: Request) {
  try {
    const { id, content, URL } = await request.json();
    console.log(id, content, URL);

    if (!id || !content) {
      return NextResponse.json(
        { error: "Missing id or content in request body" },
        { status: 400 }
      );
    }

    // Use the free-tier text model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const chat = model.startChat({ history: [] });
    const prompt = `Summarize this news article link in 2–3 sentences:\n\n${URL}`;
    console.log("Prompt:", prompt);

    // Attempt to send the summarization request
    let result;
    try {
      result = await chat.sendMessage(prompt);
    } catch (err: any) {
      // If Gemini SDK throws an error object with HTTP details:
      const status = err.statusCode || err.response?.status;
      // Check if it’s a 429
      if (status === 429) {
        // Try to read the Retry-After header (in seconds)
        const retryHeader = err.response?.headers?.get("retry-after");
        const retryAfterSec = retryHeader ? Number(retryHeader) : 60;
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Please retry later.",
            retryAfter: retryAfterSec,
          },
          { status: 429 }
        );
      }
      // For any other error, rethrow
      throw err;
    }

    // If we got here, chat.sendMessage succeeded
    const response = await result.response;
    const summary = response.text();
    if (!summary) {
      throw new Error("Empty summary returned from Gemini");
    }

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("[/api/summarize] Gemini summarize error:", err);

    // If it wasn’t already handled as 429, respond with 500
    return NextResponse.json(
      { error: "Failed to generate summary." },
      { status: 500 }
    );
  }
}
