import { NextResponse } from "next/server";
import OpenAI from "openai";

const fanar = new OpenAI({
  apiKey: process.env.FANAR_API_KEY,
  baseURL: process.env.OPENAI_API_BASE,   // Fanar endpoint
});
export const runtime = "edge";

export async function POST(req) {
  const { code, lang = "العربية" } = await req.json();
  if (!code?.trim()) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const sys =
    lang === "English"
      ? "You are a helpful assistant that explains Python code step by step in English."
      : "You are a helpful assistant that explains Python code step by step in Arabic.";

  const res = await fanar.chat.completions.create({
    model: "Fanar-S-1-7B",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: code },
    ],
    temperature: 0.3,
  });

  return NextResponse.json({ explanation: res.choices[0].message.content });
}
