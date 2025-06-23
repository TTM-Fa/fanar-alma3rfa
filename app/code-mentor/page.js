// app/code-mentor/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import mermaid from "mermaid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// dynamically load CodeMirror on the client only
const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
});
import { python } from "@codemirror/lang-python";
import { dracula } from "@uiw/codemirror-theme-dracula";

const TABS = [
  "Flow chart",
  "Explain",
  "Annotate",
  "Trace Table",
  "Challenges",
  "Convert",
  "Debug",
];
const LANGS = ["English","العربية"];

const BLANK_26 = Array(26).fill("").join("\n");
const BLANK_30 = Array(30).fill("").join("\n");

export default function CodeMentor() {
  const [tab, setTab] = useState(TABS[0]);
  const [lang, setLang] = useState(LANGS[0]);
  const [code, setCode] = useState(BLANK_26);
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const svgRef = useRef(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "default",
      flowchart: { htmlLabels: true, useMaxWidth: false, diagramPadding: 20 },
    });
  }, []);

  useEffect(() => {
    if (tab === "Flow chart" && out && svgRef.current) {
      try {
        svgRef.current.innerHTML = out;
        mermaid.init(undefined, svgRef.current);
      } catch {
        setErr("Failed to render flowchart");
      }
    }
  }, [tab, out]);

  useEffect(() => {
    setOut("");
    setErr("");
  }, [tab, lang]);

  // helper to pad code to 26 lines
  const padToLines = (src, target = 26) => {
    const lines = src.split("\n");
    while (lines.length < target) lines.push("");
    return lines.join("\n");
  };

  // your sample snippets
  const SAMPLES = [
    `# FizzBuzz
for i in range(1, 21):
    if i % 3 == 0 and i % 5 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)`,
    `# Check Even/Odd
def check_even(num):
    return "Even" if num % 2 == 0 else "Odd"
print(check_even(7))`,
    `# Fibonacci sequence
def fibonacci(n):
    a, b = 0, 1
    seq = []
    while len(seq) < n:
        seq.append(a)
        a, b = b, a + b
    return seq

print(fibonacci(10))`,
  ];

  const run = async () => {
    setBusy(true);
    setErr("");
    setOut("");

    // simple “am I Python?” check
    const pythonish =
      /^\s*def\s+\w+\s*\(.*\)\s*:/m.test(code) ||
      /^\s*import\s+\w+/m.test(code) ||
      /:\s*(#.*)?$/m.test(code);

    if (!pythonish) {
      setErr("Please Python ONLY");
      setBusy(false);
      return;
    }

    const routes = {
      "Flow chart": "/api/flowchart",
      Explain: "/api/explain",
      Annotate: "/api/comments",
      "Trace Table": "/api/trace",
    };
    const route = routes[tab];

    const body =
      tab === "Flow chart" ? { pythonCode: code, lang } : { code, lang };

    try {
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API failed");

      switch (tab) {
        case "Flow chart":
          setOut(data.mermaidCode);
          break;
        case "Explain":
          setOut(data.explanation);
          break;
        case "Annotate":
          setOut(data.comments);
          break;
        case "Trace Table":
          setOut(data.tableHtml);
          break;
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-1">&lt;&gt; Code Mentor</h1>
        <p className="text-gray-600 mb-8">
          Analyze, understand, and visualize your Python code
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/*** LEFT PANEL ***/}
          <div className="bg-white rounded-lg shadow flex flex-col h-[600px] lg:col-span-1">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-medium">Code Editor</h2>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-auto">
              <CodeMirror
                value={code}
                height="100%"
                extensions={[python()]}
                theme={dracula}
                onChange={setCode}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: true,
                }}
              />
            </div>

            <div className="p-4 border-t flex space-x-2">
              <button
                onClick={() => {
                  const snippet =
                    SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
                  setCode(padToLines(snippet, 26));
                }}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                Load Sample
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                Copy
              </button>
              <button
                onClick={() => setCode(BLANK_26)}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                Clear
              </button>
              <button
                onClick={run}
                disabled={busy}
                className={`ml-auto px-4 py-1 text-white rounded text-sm font-medium ${
                  busy ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {busy ? "Analyzing…" : "Analyze Code"}
              </button>
            </div>
          </div>

          {/*** RIGHT PANEL ***/}
          <div className="bg-white rounded-lg shadow flex flex-col h-[600px] lg:col-span-2">
            <div className="flex space-x-2 p-4 border-b">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1 rounded-full text-sm ${
                    tab === t
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {err && <div className="p-4 text-red-600">{err}</div>}
            <div className="flex-1 overflow-auto p-4 border-t">
              {tab === "Flow chart" && out && (
                <div ref={svgRef} className="mermaid mx-auto" />
              )}
              {tab === "Explain" && (
                <div
                  dir={lang === "العربية" ? "rtl" : "ltr"}
                  className="prose max-w-none"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {out}
                  </ReactMarkdown>
                </div>
              )}
              {tab === "Annotate" && (
                <div dir="ltr" className="h-full">
                  <CodeMirror
                    value={out || BLANK_30}
                    height="100%"
                    extensions={[python()]}
                    theme={dracula}
                    readOnly
                    basicSetup={{ lineNumbers: true }}
                  />
                </div>
              )}
              {tab === "Trace Table" && out && (
                <div
                  className="trace-table-wrapper flex-1 overflow-auto p-4 border-t"
                  dir={lang === "العربية" ? "rtl" : "ltr"}
                >
                  <div
                    className="prose prose-sm trace-table-content"
                    dangerouslySetInnerHTML={{ __html: out }}
                  />
                </div>
              )}
              {["Challenges", "Convert", "Debug"].includes(tab) && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-600 text-lg">Stay tuned ---</p>
                </div>
              )}
              {!out &&
                !err &&
                !["Challenges", "Convert", "Debug"].includes(tab) && (
                  <p className="text-gray-400">
                    {tab} results will appear here
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


//mm