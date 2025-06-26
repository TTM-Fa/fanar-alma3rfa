// app/chat-content/page.js
"use client";

import { useState, useEffect } from 'react';

export default function ChatWithStatic() {
  const [chatLog, setChatLog]     = useState([]);
  const [question, setQuestion]   = useState('');
  const [isAsking, setIsAsking]   = useState(false);
  const [ready, setReady]         = useState(false);

  // on mount → ingest the static PDF
  useEffect(() => {
    fetch('/api/upload', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setChatLog([{ type:'system', content:`Loaded Content.. → ${data.chunkCount} chunks` }]);
        setReady(true);
      })
      .catch(err => {
        setChatLog([{ type:'error', content:`Failed to load doc: ${err.message}` }]);
      });
  }, []);

  // ask a question
  const send = async () => {
    if (!question.trim() || !ready) return;
    setIsAsking(true);
    setChatLog(log => [...log, { type:'user', content: question }]);
    try {
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ question })
      });
      const { answer, references, error } = await res.json();
      if (error) throw new Error(error);
      setChatLog(log => [...log, { type:'ai', content: answer, references }]);
      setQuestion('');
    } catch (err) {
      setChatLog(log => [...log, { type:'error', content: err.message }]);
    } finally {
      setIsAsking(false);
    }
  };

  // Clear chat history
  const clearChat = () => {
    setChatLog([]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-12 bg-[var(--background)]">
      <div className="w-full max-w-4xl mx-auto p-4">
        <main className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-[var(--gray-600)]">Document-Based QA (Static)</h1>
            <button 
              onClick={clearChat}
              disabled={chatLog.length === 0}
              className="px-3 py-1 text-sm bg-[var(--blue-500)] text-white rounded hover:bg-[var(--blue-600)] disabled:opacity-50 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Chat history */}
          <div className="border rounded-lg p-4 h-[700px] overflow-y-auto bg-[var(--gray-100)] shadow-sm">
            {chatLog.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-[var(--gray-400)] italic">No messages yet. Ask a question to start!</p>
              </div>
            ) : (
              chatLog.map((e,i) => (
                <div key={i} className="mb-4 last:mb-0">
                  {e.type === 'system' && (
                    <p className="italic text-[var(--gray-600)] text-sm">{e.content}</p>
                  )}
                  {e.type === 'user'   && (
                    <div className="text-right ml-8">
                      <p className="inline-block bg-[var(--blue-500)] text-white rounded-lg px-4 py-2">
                        {e.content}
                      </p>
                    </div>
                  )}
                  {e.type === 'ai'     && (
                    <div className="mr-8">
                      <p className="font-medium text-[var(--gray-600)]">Assistant:</p>
                      <p className="bg-white text-[var(--foreground)] rounded-lg px-4 py-2 mt-1 border border-[var(--gray-200)]">
                        {e.content}
                      </p>
                      {e.references && (
                        <ul className="text-xs list-disc list-inside text-[var(--gray-400)] mt-2 pl-4">
                          {e.references.map((r,j) => (
                            <li key={j} className="mb-1">[Source {j+1}]: {r.text}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {e.type === 'error'  && (
                    <p className="text-red-600 bg-red-50 px-3 py-2 rounded-md">
                      {e.content}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Question input */}
          <div className="flex gap-2">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={ready ? "Ask about the content" : "Loading document..."}
              className="flex-1 border border-[var(--gray-300)] rounded-lg p-3 focus:ring-2 focus:ring-[var(--blue-500)] focus:outline-none bg-[var(--background)] text-[var(--foreground)]"
              disabled={!ready || isAsking}
              onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
            />
            <button
              onClick={send}
              disabled={!ready || isAsking || !question.trim()}
              className="px-4 py-2 bg-[var(--blue-500)] hover:bg-[var(--blue-600)] text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              {isAsking ? 'Thinking…' : 'Ask'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}