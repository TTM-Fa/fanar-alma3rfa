import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request) {
  try {
    const { pythonCode, lang = "English" } = await request.json();

    if (!pythonCode?.trim()) {
      return NextResponse.json(
        { error: "Python code is required" },
        { status: 400 }
      );
    }

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
      `;

    const prompt = makePrompt(lang);

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0.1,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    let mermaidCode = response.choices[0].message.content
      .replace(/```mermaid|```/gi, "")
      .trim();

    // Sanitize IDs & labels
    mermaidCode = mermaidCode
      // Escape quotes inside labels
      .replace(
        /"\s*([^"\n]*?)\s*"/g,
        (_, txt) => `"${txt.replace(/"/g, "&quot;")}"`
      )
      // Replace % or : that may have crept into IDs
      .replace(/([A-Za-z0-9_][A-Za-z0-9_:%-]*)(?=[\\[{])/g, (id) =>
        id.replace(/[%:]/g, "_")
      );

    return NextResponse.json({ mermaidCode });
  } catch (error) {
    console.error("Flowchart generation error:", error);
    return NextResponse.json(
      { error: "Flowchart generation failed. Please try again." },
      { status: 500 }
    );
  }
}
