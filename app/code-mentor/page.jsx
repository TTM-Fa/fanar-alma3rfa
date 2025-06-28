"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import mermaid from "mermaid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Dynamically load Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      Loading editor...
    </div>
  ),
});

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Services
import CodeMentorService from "@/utils/CodeMentorService";
import MonacoCodeSamples from "@/components/code-mentor/MonacoCodeSamples";
import TraceTable from "@/components/code-mentor/TraceTable";
import {
  AnalysisStatus,
  AnalysisHistory,
} from "@/components/code-mentor/AnalysisStatus";
import FlowchartModal from "@/components/code-mentor/FlowchartModal";
import SimpleFlowchartModal from "@/components/code-mentor/SimpleFlowchartModal";

// Icons
import {
  Code2,
  Play,
  Copy,
  RotateCcw,
  Shuffle,
  FileText,
  MessageSquare,
  GitBranch,
  List,
  Zap,
  Bug,
  RefreshCw,
  BookOpen,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Share2,
  Library,
  Maximize2,
  ArrowLeft,
} from "lucide-react";

// Analysis features
const ANALYSIS_FEATURES = [
  {
    id: "flowchart",
    title: "Flow Chart",
    description: "Visual diagram of code flow and logic",
    icon: GitBranch,
    color: "bg-blue-500",
    available: true,
  },
  {
    id: "explain",
    title: "Explain",
    description: "Step-by-step code explanation",
    icon: MessageSquare,
    color: "bg-green-500",
    available: true,
  },
  {
    id: "annotate",
    title: "Annotate",
    description: "Add comments and documentation",
    icon: FileText,
    color: "bg-purple-500",
    available: true,
  },
  {
    id: "trace",
    title: "Trace Table",
    description: "Variable state tracking",
    icon: List,
    color: "bg-orange-500",
    available: true,
  },
  //   {
  //     id: "challenges",
  //     title: "Challenges",
  //     description: "Interactive coding exercises",
  //     icon: Zap,
  //     color: "bg-yellow-500",
  //     available: false,
  //   },
  //   {
  //     id: "convert",
  //     title: "Convert",
  //     description: "Transform to other languages",
  //     icon: RefreshCw,
  //     color: "bg-indigo-500",
  //     available: false,
  //   },
  //   {
  //     id: "debug",
  //     title: "Debug",
  //     description: "AI-powered debugging help",
  //     icon: Bug,
  //     color: "bg-red-500",
  //     available: false,
  //   },
];

const LANGUAGES = ["English", "العربية"];

// Sample code snippets with metadata
const SAMPLE_CODES = [
  {
    title: "FizzBuzz Challenge",
    description: "Classic programming interview problem",
    difficulty: "Beginner",
    tags: [
      { name: "loops", color: "bg-blue-100 text-blue-800" },
      { name: "conditionals", color: "bg-green-100 text-green-800" },
      { name: "modulo", color: "bg-purple-100 text-purple-800" },
    ],
    code: `# FizzBuzz Challenge
for i in range(1, 21):
    if i % 3 == 0 and i % 5 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)`,
  },
  {
    title: "Check Even/Odd",
    description: "Simple function to determine number parity",
    difficulty: "Beginner",
    tags: [
      { name: "functions", color: "bg-indigo-100 text-indigo-800" },
      { name: "conditionals", color: "bg-green-100 text-green-800" },
      { name: "modulo", color: "bg-purple-100 text-purple-800" },
    ],
    code: `# Check Even/Odd
def check_even(num):
    """Check if a number is even or odd"""
    return "Even" if num % 2 == 0 else "Odd"

result = check_even(7)
print(f"The number 7 is {result}")`,
  },
  {
    title: "Fibonacci Sequence",
    description: "Generate fibonacci numbers using iterative approach",
    difficulty: "Intermediate",
    tags: [
      { name: "algorithms", color: "bg-red-100 text-red-800" },
      { name: "sequences", color: "bg-yellow-100 text-yellow-800" },
      { name: "loops", color: "bg-blue-100 text-blue-800" },
    ],
    code: `# Fibonacci Sequence
def fibonacci(n):
    """Generate fibonacci sequence up to n terms"""
    a, b = 0, 1
    sequence = []
    while len(sequence) < n:
        sequence.append(a)
        a, b = b, a + b
    return sequence

fib_nums = fibonacci(10)
print("First 10 Fibonacci numbers:", fib_nums)`,
  },
  {
    title: "Simple Calculator",
    description: "Basic arithmetic operations with error handling",
    difficulty: "Intermediate",
    tags: [
      { name: "functions", color: "bg-indigo-100 text-indigo-800" },
      { name: "error-handling", color: "bg-orange-100 text-orange-800" },
      { name: "arithmetic", color: "bg-pink-100 text-pink-800" },
    ],
    code: `# Simple Calculator
def calculator(a, b, operation):
    """Perform basic arithmetic operations"""
    if operation == '+':
        return a + b
    elif operation == '-':
        return a - b
    elif operation == '*':
        return a * b
    elif operation == '/':
        return a / b if b != 0 else "Error: Division by zero"
    else:
        return "Invalid operation"

print(calculator(10, 5, '+'))
print(calculator(10, 0, '/'))`,
  },
];

export default function CodeMentorPage() {
  const [activeFeature, setActiveFeature] = useState("flowchart");
  const [language, setLanguage] = useState("English");
  const [code, setCode] = useState(SAMPLE_CODES[0].code);
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [showSamples, setShowSamples] = useState(false);
  const [showFlowchartModal, setShowFlowchartModal] = useState(false);
  const mermaidRef = useRef(null);

  // Initialize Mermaid
  useEffect(() => {
    try {
      console.log("Initializing mermaid in main component");
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "default",
        flowchart: {
          htmlLabels: true,
          //   useMaxWidth: true,
          //   diagramPadding: 20,
        },
      });
    } catch (err) {
      console.error("Error initializing mermaid:", err);
    }
  }, []);

  // Handle Mermaid rendering for flowchart
  useEffect(() => {
    if (activeFeature === "flowchart" && output && mermaidRef.current) {
      try {
        console.log(
          "Attempting to render flowchart in main view with code:",
          output
        );
        mermaidRef.current.innerHTML = "";
        mermaid
          .render("mermaid-graph", output)
          .then(({ svg }) => {
            mermaidRef.current.innerHTML = svg;
            console.log("Flowchart rendered successfully in main view");
          })
          .catch((err) => {
            console.error("Mermaid render error (promise):", err);
            setError("Failed to render flowchart: " + err.message);
          });
      } catch (err) {
        console.error("Mermaid render error (try/catch):", err);
        setError("Failed to render flowchart: " + err.message);
      }
    }
  }, [activeFeature, output]);

  // Clear output and error when feature or language changes
  useEffect(() => {
    setOutput("");
    setError("");
  }, [activeFeature, language]);

  // Handle code analysis
  const analyzeCode = async () => {
    if (!code.trim()) {
      setError("Please enter some Python code to analyze");
      return;
    }

    if (!CodeMentorService.isPythonCode(code)) {
      setError("Please enter valid Python code");
      return;
    }

    const feature = ANALYSIS_FEATURES.find((f) => f.id === activeFeature);
    if (!feature?.available) {
      setError("This feature is coming soon!");
      return;
    }

    setIsLoading(true);
    setError("");
    setOutput("");

    const startTime = Date.now();

    try {
      let result;

      switch (activeFeature) {
        case "flowchart":
          result = await CodeMentorService.generateFlowchart(code, language);
          console.log("Flowchart generated:", result);

          // Validate mermaid code
          if (!result || typeof result !== "string" || !result.trim()) {
            throw new Error("Invalid flowchart code returned from service");
          }
          break;
        case "explain":
          result = await CodeMentorService.explainCode(code, language);
          break;
        case "annotate":
          result = await CodeMentorService.annotateCode(code, language);
          break;
        case "trace":
          console.log("=== FRONTEND: Starting trace analysis ===");
          console.log("Code to trace:", code);
          result = await CodeMentorService.generateTrace(code, language);
          console.log("=== FRONTEND: Trace result received ===", result);
          break;
        default:
          throw new Error("Feature not implemented");
      }

      setOutput(result);

      // Add to analysis history
      const analysisTime = Date.now() - startTime;
      setAnalysisHistory((prev) => [
        {
          id: Date.now(),
          feature: activeFeature,
          language,
          timestamp: new Date(),
          duration: analysisTime,
          success: true,
        },
        ...prev.slice(0, 4),
      ]); // Keep last 5 analyses
    } catch (err) {
      console.error("Analysis error:", err);
      setError(CodeMentorService.formatError(err));

      const analysisTime = Date.now() - startTime;
      setAnalysisHistory((prev) => [
        {
          id: Date.now(),
          feature: activeFeature,
          language,
          timestamp: new Date(),
          duration: analysisTime,
          success: false,
          error: err.message,
        },
        ...prev.slice(0, 4),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sample code loading
  const loadSampleCode = () => {
    const randomSample =
      SAMPLE_CODES[Math.floor(Math.random() * SAMPLE_CODES.length)];
    setCode(randomSample.code);
  };

  // Handle code copying
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  // Clear code
  const clearCode = () => {
    setCode("");
  };

  const currentFeature = ANALYSIS_FEATURES.find((f) => f.id === activeFeature);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (window.location.href = "/")}
                className="gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-sm">
                  <Code2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Code Mentor
                  </h1>
                  <p className="text-xs text-gray-600">
                    AI-powered Python code analysis
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-none">
        <div className="flex gap-4 h-[calc(100vh-160px)] max-h-[calc(100vh-160px)]">
          {/* Code Editor - Left Side */}
          <div className="w-1/2 flex flex-col">
            <Card className="h-full flex flex-col shadow-lg border-0 bg-white">
              <CardHeader className="pb-3 px-4 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5" />
                    Python Editor
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <AnalysisStatus
                      isLoading={isLoading}
                      hasOutput={!!output}
                      error={error}
                      activeFeature={activeFeature}
                      analysisHistory={analysisHistory}
                    />
                    <Badge variant="outline" className="text-xs">
                      {code.split("\n").length} lines
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                <div className="flex-1 min-h-0">
                  <Editor
                    height="100%"
                    defaultLanguage="python"
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      wordWrap: "on",
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      folding: true,
                      renderLineHighlight: "line",
                      selectOnLineNumbers: true,
                      roundedSelection: false,
                      readOnly: false,
                      cursorStyle: "line",
                      contextmenu: true,
                    }}
                  />
                </div>

                {/* Editor Controls */}
                <div className="border-t bg-gray-50/50 p-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSamples(true)}
                      className="gap-2 text-xs"
                      disabled={isLoading}
                    >
                      <Library className="h-3 w-3" />
                      Examples
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyCode}
                      className="gap-2 text-xs"
                      disabled={isLoading}
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCode}
                      className="gap-2 text-xs"
                      disabled={isLoading}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Clear
                    </Button>

                    <div className="flex-1" />

                    <Button
                      onClick={analyzeCode}
                      disabled={isLoading || !currentFeature?.available}
                      size="sm"
                      className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          Analyze
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Panel - Right Side */}
          <div className="w-1/2 flex flex-col gap-4">
            {/* Feature Selection */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="pb-3 px-4 py-3">
                <CardTitle className="text-lg">Analysis Features</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="grid grid-cols-2 gap-2">
                  {ANALYSIS_FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    const isActive = activeFeature === feature.id;

                    return (
                      <button
                        key={feature.id}
                        onClick={() => setActiveFeature(feature.id)}
                        disabled={!feature.available}
                        className={`
                          relative p-3 rounded-lg border-2 transition-all duration-200 text-left
                          ${
                            isActive
                              ? "border-blue-500 bg-blue-50 shadow-md"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }
                          ${
                            !feature.available
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer hover:shadow-sm"
                          }
                        `}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`p-1.5 rounded-lg ${feature.color} ${
                              !feature.available ? "grayscale" : ""
                            }`}
                          >
                            <Icon className="h-3 w-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-gray-900">
                              {feature.title}
                            </h3>
                            <p className="text-xs text-gray-600 mt-0.5 leading-tight">
                              {feature.description}
                            </p>
                            {!feature.available && (
                              <Badge
                                variant="secondary"
                                className="mt-1 text-xs h-4"
                              >
                                Coming Soon
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isActive && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="h-3 w-3 text-blue-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <Card className="flex-1 shadow-lg border-0 bg-white overflow-hidden flex flex-col">
              <CardHeader className="pb-3 px-4 py-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {currentFeature && (
                      <currentFeature.icon className="h-5 w-5" />
                    )}
                    {currentFeature?.title} Results
                  </CardTitle>
                  {output && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                      >
                        <Share2 className="h-3 w-3" />
                        Share
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                      >
                        <Download className="h-3 w-3" />
                        Export
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 flex items-center gap-2 text-sm flex-shrink-0">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <div className="overflow-auto flex-1">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                        <p className="text-gray-600">Analyzing your code...</p>
                      </div>
                    </div>
                  ) : output ? (
                    <div className="h-full">
                      {activeFeature === "flowchart" && (
                        <div className="h-full flex items-center justify-center p-4">
                          <div>
                            {output ? (
                              <div
                                ref={mermaidRef}
                                className="max-w-full w-full"
                              />
                            ) : (
                              <div className="text-center text-gray-500">
                                <p>No flowchart generated yet</p>
                              </div>
                            )}
                            {output && (
                              <div className="mt-4 text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => {
                                    console.log(
                                      "Opening modal with code:",
                                      output
                                    );
                                    // Make sure output is ready before showing modal
                                    if (output && output.trim()) {
                                      setShowFlowchartModal(true);
                                    }
                                  }}
                                >
                                  <Maximize2 className="h-3 w-3 mr-1" />
                                  View Full Screen
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeFeature === "explain" && (
                        <div
                          dir={language === "العربية" ? "rtl" : "ltr"}
                          className="prose prose-sm max-w-none h-full p-4"
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            skipHtml={true}
                          >
                            {output || ""}
                          </ReactMarkdown>
                        </div>
                      )}

                      {activeFeature === "annotate" && (
                        <div className="h-full">
                          <Editor
                            height="100%"
                            defaultLanguage="python"
                            value={output}
                            theme="vs-light"
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              fontSize: 14,
                              lineNumbers: "on",
                              wordWrap: "on",
                              automaticLayout: true,
                              scrollBeyondLastLine: false,
                              folding: true,
                              renderLineHighlight: "none",
                              hideCursorInOverviewRuler: true,
                              overviewRulerBorder: false,
                              scrollbar: {
                                vertical: "auto",
                                horizontal: "auto",
                              },
                            }}
                          />
                        </div>
                      )}

                      {activeFeature === "trace" && (
                        <div
                          className="h-full p-4"
                          dir={language === "العربية" ? "rtl" : "ltr"}
                        >
                          <TraceTable traceData={output} language={language} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <currentFeature.icon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">
                          Ready to analyze
                        </p>
                        <p className="text-sm">
                          Click "Analyze" to see{" "}
                          {currentFeature?.title.toLowerCase()} results
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Code Samples Modal */}
      {showSamples && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Code Examples
                </h2>
                <p className="text-sm text-gray-600">
                  Choose from our curated Python examples
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSamples(false)}
                className="rounded-full w-8 h-8 p-0"
              >
                ×
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="grid gap-4">
                {SAMPLE_CODES.map((sample, index) => {
                  const getDifficultyColor = (difficulty) => {
                    switch (difficulty) {
                      case "Beginner":
                        return "bg-green-100 text-green-800 border-green-200";
                      case "Intermediate":
                        return "bg-yellow-100 text-yellow-800 border-yellow-200";
                      case "Advanced":
                        return "bg-red-100 text-red-800 border-red-200";
                      default:
                        return "bg-gray-100 text-gray-800 border-gray-200";
                    }
                  };

                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 cursor-pointer transition-all duration-200 bg-white"
                      onClick={() => {
                        setCode(sample.code);
                        setShowSamples(false);
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 mb-1">
                            {sample.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {sample.description}
                          </p>
                        </div>
                        <Badge
                          className={`ml-2 text-xs px-2 py-1 border ${getDifficultyColor(
                            sample.difficulty
                          )}`}
                        >
                          {sample.difficulty}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {sample.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${tag.color}`}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <pre className="text-xs text-gray-700 overflow-x-auto font-mono">
                          {sample.code.split("\n").slice(0, 6).join("\n")}
                          {sample.code.split("\n").length > 6 && "\n..."}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flowchart Modal */}
      {showFlowchartModal && activeFeature === "flowchart" && output && (
        <FlowchartModal
          key={`flowchart-modal-${Date.now()}`} /* Add a key to force re-render */
          mermaidCode={output}
          onClose={() => setShowFlowchartModal(false)}
        />
      )}
    </div>
  );
}
