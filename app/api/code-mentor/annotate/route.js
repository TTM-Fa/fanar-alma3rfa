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

    // Step 1: Annotate in English with Fanar-S
    const annotationResponse = await fanar.chat.completions.create({
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

    // Strip any markdown fences that the model might add
    let annotated = annotationResponse.choices[0].message.content;
    annotated = annotated.replace(/^```.*$/gm, "").trim();

    // If the user wants English, we're done
    if (lang !== "العربية") {
      return NextResponse.json({ comments: annotated });
    }

    // Step 2: Extract only comment/docstring lines
    const lines = annotated.split("\n");
    const commentIndices = [];
    let inDocstring = false;

    lines.forEach((line, index) => {
      const trimmedLine = line.trimStart();
      if (trimmedLine.startsWith('"""') || trimmedLine.startsWith("'''")) {
        commentIndices.push(index);
        inDocstring = !inDocstring;
        return;
      }
      if (inDocstring || trimmedLine.startsWith("#")) {
        commentIndices.push(index);
      }
    });

    // If no comments found, just return the full annotated text
    if (!commentIndices.length) {
      return NextResponse.json({ comments: annotated });
    }

    // Build a chunk of just the comments/docstrings
    const commentChunk = commentIndices.map((i) => lines[i]).join("\n");

    // Step 3: Translate comments only with Fanar-C
    const translationResponse = await fanar.chat.completions.create({
      model: "Fanar-C-1-8.7B",
      messages: [
        {
          role: "system",
          content: [
            "You are a professional translator specialized in code comments.",
            "Translate ONLY the natural-language text in these Python comments and docstrings into Arabic.",
            "Preserve all syntax exactly: keep the leading `#`, quotation marks, indentation, and **always** leave `.` and `:` at the ends of sentences or words just as in the original.",
            "Do NOT change any code logic or formatting.",
          ].join(" "),
        },
        { role: "user", content: commentChunk },
      ],
      temperature: 0.2,
    });

    // Splice the translated lines back into the original
    const translatedLines =
      translationResponse.choices[0].message.content.split("\n");
    if (translatedLines.length === commentIndices.length) {
      commentIndices.forEach((originalIndex, translatedIndex) => {
        lines[originalIndex] = translatedLines[translatedIndex];
      });
    }

    annotated = lines.join("\n");

    return NextResponse.json({ comments: annotated });
  } catch (error) {
    console.error("Annotation error:", error);
    return NextResponse.json(
      { error: "Failed to annotate code. Please try again." },
      { status: 500 }
    );
  }
}
