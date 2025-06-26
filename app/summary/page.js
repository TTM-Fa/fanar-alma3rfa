// app/summary/page.js
'use client'

import { useState, useEffect } from 'react'
import { rawContent } from './rawContent'

export default function SummaryPage() {
  const [content, setContent]               = useState(rawContent)
  const [language, setLanguage]             = useState('English')
  const [level, setLevel]                   = useState('College')
  const [includeExample, setIncludeExample] = useState(true)
  const [summary, setSummary]               = useState('')
  const [example, setExample]               = useState('')
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')

  // <-- new: whenever one of these inputs changes, clear out previous output
  useEffect(() => {
    setSummary('')
    setExample('')
    setError('')
  }, [language, level, includeExample])

  const handleSummarize = async () => {
    setLoading(true)
    setError('')
    setSummary('')
    setExample('')

    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          language,
          level,
          includeExample
        })
      })

      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || 'Failed to summarize')
      }

      const { summary: sum, example: ex } = await res.json()
      setSummary(sum)
      setExample(ex)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Document Summary</h1>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <label>
          Language:
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            style={{ marginLeft: '.5rem' }}
          >
            <option>English</option>
            <option>Arabic</option>
          </select>
        </label>

        <label>
          Study Level:
          <select
            value={level}
            onChange={e => setLevel(e.target.value)}
            style={{ marginLeft: '.5rem' }}
          >
            <option>Primary</option>
            <option>Middle</option>
            <option>High</option>
            <option>College</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={includeExample}
            onChange={e => setIncludeExample(e.target.checked)}
            style={{ marginRight: '.25rem' }}
          />
          Cultural Example
        </label>
      </div>

      {/* Content Editor */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={12}
        style={{ width: '100%', fontFamily: 'monospace' }}
      />

      <button
        onClick={handleSummarize}
        disabled={loading || !content.trim()}
        style={{ marginTop: '1rem', padding: '.5rem 1rem' }}
      >
        {loading ? 'Working…' : 'Summarize'}
      </button>

      {/* Errors */}
      {error && (
        <p style={{ color: 'crimson', marginTop: '1rem' }}>
          Error: {error}
        </p>
      )}

      {/* Summary */}
      {summary && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Summary</h2>
          <div
            style={{ whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{
              __html:
                language === 'Arabic'
                  ? `<div dir="rtl">${summary}</div>`
                  : summary
            }}
          />
        </section>
      )}

      {/* Cultural Example */}
      {includeExample && example && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Culturally Relevant Example</h2>
          <div
            style={{ whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{
              __html:
                language === 'Arabic'
                  ? `<div dir="rtl">${example}</div>`
                  : example
            }}
          />
        </section>
      )}
    </main>
  )
}
