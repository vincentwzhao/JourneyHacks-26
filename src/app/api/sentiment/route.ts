import { NextResponse } from "next/server";
import { SENTIMENT_LABELS, type SentimentResult } from "@/lib/sentiment";

export async function POST(request: Request) {
  let text: unknown;
  try {
    ({ text } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "'text' is required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  const prompt = `You are the sentiment-analysis engine for "Sidequests", a gamified wellbeing companion \
for SFU students. A student just journaled how they're feeling. Analyze the emotional sentiment of their \
entry and respond with a short, warm, one-sentence reflection back to them (max 25 words) — supportive, \
never clinical or preachy.

Student entry:
"""
${text.trim().slice(0, 4000)}
"""`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                label: { type: "string", enum: SENTIMENT_LABELS },
                score: { type: "number" },
                insight: { type: "string" },
              },
              required: ["label", "score", "insight"],
            },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      console.error(`Gemini API error (${geminiRes.status}) [model=${model}]:`, detail);
      return NextResponse.json(
        { error: `Gemini API error (${geminiRes.status})`, detail },
        { status: 502 }
      );
    }

    const data = await geminiRes.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof raw !== "string") {
      return NextResponse.json(
        { error: "Gemini API returned an unexpected response shape" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(raw) as SentimentResult;
    if (
      !SENTIMENT_LABELS.includes(parsed.label) ||
      typeof parsed.score !== "number" ||
      typeof parsed.insight !== "string"
    ) {
      return NextResponse.json(
        { error: "Gemini API returned malformed sentiment data" },
        { status: 502 }
      );
    }

    const score = Math.max(-1, Math.min(1, parsed.score));
    return NextResponse.json({ ...parsed, score } satisfies SentimentResult);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to analyze sentiment", detail: String(err) },
      { status: 500 }
    );
  }
}
