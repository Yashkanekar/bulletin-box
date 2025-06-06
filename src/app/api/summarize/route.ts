// src/app/api/summarize/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in environment");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SummarizeRequest {
  id: string;
  content: string;
}

export async function POST(request: Request) {
  try {
    const body: SummarizeRequest = await request.json();
    const { id, content } = body;

    if (!id || !content) {
      return NextResponse.json(
        { error: "Both id and content are required." },
        { status: 400 }
      );
    }

    // Build a prompt for summarization.
    const systemPrompt = `
You are an AI assistant specialized in summarizing news articles. 
When given the article content, produce a concise summary (3–4 sentences) that captures the main points.
`;

    const userPrompt = `
Please summarize the following news content in 3–4 sentences:

"${content}"
`;

    // Call OpenAI’s chat completion endpoint
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() },
      ],
      temperature: 0.5,
      max_tokens: 150,
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (!summary) {
      throw new Error("No summary returned from OpenAI");
    }

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("[/api/summarize] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate summary." },
      { status: 500 }
    );
  }
}
