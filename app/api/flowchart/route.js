/*  app/api/flowchart/route.js
    ───────────────────────────────────────────────────────────
    • English or Arabic labels, depending on body.lang
    • IDs remain ASCII (safe for Mermaid)
    • Sanitiser escapes %, : and " if they slip through
*/

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request) {
  try {
    /* ---------- parse request ---------- */
    const { pythonCode, lang = "English" } = await request.json();
    if (!pythonCode?.trim()) {
      return NextResponse.json({ error: "Python code is required" }, { status: 400 });
    }

    /* ---------- prompt ---------- */
    const makePrompt = (targetLang) => `
      You are an expert at translating Python code into a clear, valid Mermaid flowchart. Convert this Python code to Mermaid **flowchart TD**.

      RULES:
      • Node syntax:   id["Label"]   or   id[/"Label"/]
        • **id** only letters/digits/underscores (no spaces, %, :, quotes …)
        • Put the human label inside the quotes.
      • Show Start and End, show every path, use --> arrows.
      ${
        targetLang === "العربية"
          ? "• Translate every Label string to Arabic. IDs stay Latin/ASCII."
          : "• Write labels in English."
      }
      • Output raw Mermaid only – no markdown fences.

      PYTHON CODE:
      ${pythonCode}
      `
    ;

    const prompt = makePrompt(lang);

    const resp = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0.1,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    /* ---------- Mermaid string ---------- */
    let mermaid = resp.choices[0].message.content
      .replace(/```mermaid|```/gi, "")
      .trim();

    /* ---------- sanitize IDs & labels ---------- */
    mermaid = mermaid
      // escape " inside labels
      .replace(/"\s*([^"\n]*?)\s*"/g, (_, txt) => `"${txt.replace(/"/g, "&quot;")}"`)
      // replace % or : that may have crept into IDs
      .replace(/([A-Za-z0-9_][A-Za-z0-9_:%-]*)(?=[\\[{])/g, id =>
        id.replace(/[%:]/g, "_")
      );

    return NextResponse.json({ mermaidCode: mermaid });
  } catch (err) {
    console.error("Flowchart generation error:", err);
    return NextResponse.json(
      { error: "Flow-chart generation failed." },
      { status: 500 }
    );
  }
}
// good
