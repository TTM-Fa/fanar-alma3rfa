import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";
import { filterContentByTopics } from "@/utils/fileProcessors";

const FANAR_API_KEY = process.env.FANAR_API_KEY;
const FANAR_API_URL = "https://api.fanar.qa/v1/chat/completions";
const FANAR_MODEL = "Fanar-S-1-7B";

export async function POST(request) {
  try {
    // Validate API configuration
    if (!FANAR_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Fanar API key not configured" },
        { status: 500 }
      );
    }    const { 
      materialId, 
      title, 
      language = 'English', 
      level = 'College', 
      includeExample = false,
      selectedTopics = []
    } = await request.json();

    // Validate input
    if (!materialId) {
      return NextResponse.json(
        { success: false, error: "Material ID is required" },
        { status: 400 }
      );
    }

    // Get the material with raw content
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    if (!material.rawContent) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Material does not have any content to generate a summary from",
        },
        { status: 400 }
      );    }

    console.log(`📖 Content length: ${material.rawContent.length} characters`);

    // Filter content by selected topics if any topics are specified
    let contentToProcess = material.rawContent;
    if (selectedTopics && selectedTopics.length > 0) {
      console.log(
        `🎯 Filtering content by ${
          selectedTopics.length
        } selected topics: ${selectedTopics.join(", ")}`
      );
      contentToProcess = filterContentByTopics(
        material.rawContent,
        selectedTopics
      );
      console.log(
        `📖 Filtered content length: ${
          contentToProcess.length
        } characters (${Math.round(
          (contentToProcess.length / material.rawContent.length) * 100
        )}% of original)`
      );

      if (contentToProcess.length < 100) {
        return NextResponse.json(
          {
            success: false,
            error: `No content found for the selected topics: ${selectedTopics.join(", ")}. Please try selecting different topics or include all content.`,
          },
          { status: 400 }
        );
      }
    }

    // Generate summary using Fanar API
    const summaryData = await generateSummary(
      contentToProcess,
      title || `Summary of ${material.title || "Study Material"}`,
      language,
      level,
      includeExample);

    // Create the summary in the database
    const summaryRecord = await prisma.summary.create({
      data: {
        title: title || `Summary of ${material.title || "Study Material"}`,
        content: summaryData.summary,
        example: summaryData.example || null,
        materialId: material.id,
      },
    });

    return NextResponse.json({
      success: true,
      summary: summaryRecord,
      example: summaryData.example,
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate summary",
      },
      { status: 500 }
    );
  }
}

/**
 * Generate summary using Fanar API
 */
async function generateSummary(content, title, language, level, includeExample) {
  if (!content?.trim()) {
    throw new Error('No content provided for summary generation');
  }

  // 1) Try to split the raw content into page‐sized chunks, fallback to simple chunking
  let pages = content.split(/(?=<page-\d+>)/g).filter(p => p.trim());
  
  // If no page markers found, create chunks manually
  if (pages.length <= 1) {
    const maxChunkSize = 3000; // chars per chunk
    const chunks = [];
    for (let i = 0; i < content.length; i += maxChunkSize) {
      const chunk = content.slice(i, i + maxChunkSize);
      if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
    }
    pages = chunks.length > 0 ? chunks : [content];
  }  // 2) Get a short summary for each chunk
  const partials = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    
    // Add delay between requests to avoid rate limiting
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const resp = await fetch(FANAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FANAR_API_KEY}`,
      },
      body: JSON.stringify({
        model: FANAR_MODEL,
        messages: [
          { role: 'system', content: 'You are a concise summarizer.' },
          {
            role: 'user',
            content: `Summarize this page in 2–3 sentences (${language}, ${level} level):\n\n${page}`
          }
        ]
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('Fanar API error:', data);
      throw new Error(data.error?.message || data.error || 'Failed to generate partial summary');
    }
    partials.push(data.choices[0].message.content.trim());
  }

  // 3) Stitch them together into one markdown‐friendly summary
  const combined = partials
    .map((s, i) => `Page ${i + 1} summary:\n${s}`)
    .join('\n\n');

  const summaryPrompt = `
    Based on the following study material, create a comprehensive summary in **Markdown** format for a **${level}-level** student, in **${language}**.

    **Study Material:**
    ${combined}

    **Requirements:**
    1. Give a suitable Title: ${title}
    2. Structure the summary with clear headings (using markdown # syntax) for main topics.  
    3. Use subheadings (##, ###) for subtopics.  
    4. Include bullet points for key concepts.  
    5. Include examples where appropriate.  
    6. Explain complex ideas clearly.  
    7. Format the output in well-structured markdown.  
    8. Include a brief summary at the beginning.  
    9. Group related concepts together.  
    10. Use bold and italic formatting to highlight key terms.
  `;
  const finalRes = await fetch(FANAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FANAR_API_KEY}`,
    },
    body: JSON.stringify({
      model: FANAR_MODEL,
      messages: [
        { role: 'system', content: 'You are a clear, cohesive summarizer who is expert in summarizing.' },
        { role: 'user', content: summaryPrompt }
      ]
    })
  });
  const finalData = await finalRes.json();
  if (!finalRes.ok) {
    console.error('Fanar API error for final summary:', finalData);
    throw new Error(finalData.error?.message || finalData.error || 'Failed to generate final summary');
  }
  const summary = finalData.choices[0].message.content.trim();

  // 4) Optionally generate a culturally‐relevant example
  let example = '';
  if (includeExample) {
    const culturalPrompt = `
      Based on the summary below, 
      give one concrete example rooted in Qatari/GCC culture for a **${level}-level** ${language} reader.
      Use a local tradition, familiar scenario, or real-world practice to illustrate the key concepts.
      "${summary}"
    `;    const exRes = await fetch(FANAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FANAR_API_KEY}`,
      },
      body: JSON.stringify({
        model: FANAR_MODEL,
        messages: [
          { role: 'system', content: 'You are Fanar, a bilingual Gulf-aware summarizer.' },
          { role: 'user', content: culturalPrompt }
        ]
      })
    });    const exData = await exRes.json();
    if (!exRes.ok) {
      console.error('Fanar API error for cultural example:', exData);
      throw new Error(exData.error?.message || exData.error || 'Failed to generate cultural example');
    }
    example = exData.choices[0].message.content.trim();
  }

  // 5) Return both summary and example
  return { summary, example };
}
