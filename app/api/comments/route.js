// app/api/comments/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";

const fanar = new OpenAI({
  apiKey: process.env.FANAR_API_KEY,
  baseURL: process.env.OPENAI_API_BASE,
});
export const runtime = "edge";

export async function POST(req) {
  const { code, lang = "العربية" } = await req.json();
  if (!code?.trim()) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  /* 1️⃣  Annotate in English with Fanar-S */
  const ann = await fanar.chat.completions.create({
    model: "Fanar-S-1-7B",
    messages: [
      {
        role: "system",
        content:
          "You are an expert Python code annotator. Insert a top-level docstring and clear inline comments in English. " +
          "Do NOT change any code logic.",
      },
      { role: "user", content: code },
    ],
    temperature: 0.3,
  });

  // ← ← ← strip any markdown fences that the model might add ← ← ←
  let annotated = ann.choices[0].message.content;
  annotated = annotated.replace(/^```.*$/gm, "").trim();

  // if the user wants English, we’re done
  if (lang !== "العربية") {
    return NextResponse.json({ comments: annotated });
  }

  /* 2️⃣  Extract only comment/docstring lines */
  const lines = annotated.split("\n");
  const idx = [];
  let inDoc = false;
  lines.forEach((ln, i) => {
    const s = ln.trimStart();
    if (s.startsWith('"""') || s.startsWith("'''")) {
      idx.push(i);
      inDoc = !inDoc;
      return;
    }
    if (inDoc || s.startsWith("#")) {
      idx.push(i);
    }
  });

  // if no comments found, just return the full annotated text
  if (!idx.length) {
    return NextResponse.json({ comments: annotated });
  }

  // build a chunk of just the comments/docstrings
  const chunk = idx.map((i) => lines[i]).join("\n");

  /* 3️⃣  Translate comments only with Fanar-C */
  const tr = await fanar.chat.completions.create({
    model: "Fanar-C-1-8.7B",
    messages: [
      {
        role: "system",
        content: [
          "You are a professional translator specialized in code comments.",
          "Translate ONLY the natural-language text in these Python comments and docstrings into Arabic.",
          "Preserve all syntax exactly: keep the leading `#`, quotation marks, indentation, and **always** leave `.` and `:` at the ends of sentences or words just as in the original.",
          "Do NOT change any code logic or formatting."
        ].join(" ")
      },
      { role: "user", content: chunk },
    ],
    temperature: 0.2,
  });

  // splice the translated lines back into the original
  const trLines = tr.choices[0].message.content.split("\n");
  if (trLines.length === idx.length) {
    idx.forEach((i, k) => {
      lines[i] = trLines[k];
    });
  }
  annotated = lines.join("\n");

  return NextResponse.json({ comments: annotated });
}
