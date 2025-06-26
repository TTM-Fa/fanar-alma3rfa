// app/api/summary/route.js
import { NextResponse } from 'next/server'

const FANAR_URL = process.env.OPENAI_API_BASE    // e.g. "https://api.fanar.qa/v1"
const FANAR_KEY = process.env.FANAR_API_KEY

export async function POST(request) {
  try {
    // Destructure user inputs, with sensible defaults
    const {
      text,
      language = 'English',
      level = 'College',
      includeExample = false
    } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // 1) Split the raw content into page‐sized chunks
    const pages = text.split(/(?=<page-\d+>)/g).filter(p => p.trim())

    // 2) Get a short summary for each chunk
    const partials = []
    for (let page of pages) {
      const resp = await fetch(`${FANAR_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${FANAR_KEY}`,
        },
        body: JSON.stringify({
          model: 'Fanar-S-1-7B',
          messages: [
            { role: 'system', content: 'You are a concise summarizer.' },
            {
              role: 'user',
              content: `Summarize this page in 2–3 sentences (${language}, ${level} level):\n\n${page}`
            }
          ]
        })
      })
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data.error || JSON.stringify(data))
      }
      partials.push(data.choices[0].message.content.trim())
    }

    // 3) Stitch them together into one markdown‐friendly summary
    const combined = partials
      .map((s,i) => `Page ${i+1} summary:\n${s}`)
      .join('\n\n')

    const Summary_prompt = `
        Based on the following study material, create a comprehensive summary in **Markdown** format for a **${level}-level** student, in **${language}**.

        **Study Material:**
        ${combined}

        **Requirements:**
        1. Give a suitable Title to the Summary.  
        2. Structure the summary with clear headings (using markdown # syntax) for main topics.  
        3. Use subheadings (##, ###) for subtopics.  
        4. Include bullet points for key concepts.  
        5. Include examples where appropriate.  
        6. Explain complex ideas clearly.  
        7. Format the output in well-structured markdown.  
        8. Include a brief summary at the beginning.  
        9. Group related concepts together.  
        10. Use bold and italic formatting to highlight key terms.
`

    const finalRes = await fetch(`${FANAR_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${FANAR_KEY}`,
      },
      body: JSON.stringify({
        model: 'Fanar-S-1-7B',
        messages: [
          { role: 'system', content: 'You are a clear, cohesive summarizer who is expert in summarizing.' },
          { role: 'user',   content: Summary_prompt }
        ]
      })
    })
    const finalData = await finalRes.json()
    if (!finalRes.ok) {
      throw new Error(finalData.error || JSON.stringify(finalData))
    }
    const summary = finalData.choices[0].message.content.trim()

    // 4) Optionally generate a culturally‐relevant example
    let example = ''
    if (includeExample) {
      const cultural_prompt = `
        Based on the summary below, 
        give one concrete example rooted in Qatari/GCC culture for a **${level}-level** ${language} reader.
        Use a local tradition, familiar scenario, or real-world practice to illustrate the key concepts.
        "${summary}"
`
      const exRes = await fetch(`${FANAR_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${FANAR_KEY}`,
        },
        body: JSON.stringify({
          model: 'Fanar-S-1-7B',
          messages: [
            { role: 'system', content: 'You are Fanar, a bilingual Gulf-aware summarizer.' },
            { role: 'user',   content: cultural_prompt }
          ]
        })
      })
      const exData = await exRes.json()
      if (!exRes.ok) {
        throw new Error(exData.error || JSON.stringify(exData))
      }
      example = exData.choices[0].message.content.trim()
    }

    // 5) Return both summary and example
    return NextResponse.json({ summary, example })

  } catch (err) {
    console.error('Summarization error:', err)
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
