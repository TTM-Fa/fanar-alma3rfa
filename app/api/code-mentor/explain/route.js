import { NextResponse } from "next/server";
import OpenAI from "openai";

const fanar = new OpenAI({
  apiKey: process.env.FANAR_API_KEY,
  baseURL: "https://api.fanar.qa/v1",
});

export const runtime = "edge";

export async function POST(req) {
  try {
    const { code, lang = "العربية" } = await req.json();

    if (!code?.trim()) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const systemPrompt =
      lang === "English"
        ? "You are a helpful assistant that explains Python code step by step in English. Provide clear, detailed explanations that help beginners understand the code. Format your response using Markdown without complex tables or HTML."
        : "You are a helpful assistant that explains Python code step by step in Arabic. Provide clear, detailed explanations that help beginners understand the code. Format your response using Markdown without complex tables or HTML.";

    const response = await fanar.chat.completions.create({
      model: "Fanar-S-1-7B",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: code },
      ],
      temperature: 0.3,
    });

    // Ensure we have valid content
    const explanation =
      response.choices[0]?.message?.content ||
      "Sorry, couldn't generate an explanation.";

    return NextResponse.json({
      explanation,
    });
  } catch (error) {
    console.error("Explanation error:", error);
    return NextResponse.json(
      { error: "Failed to explain code. Please try again." },
      { status: 500 }
    );
  }
}
