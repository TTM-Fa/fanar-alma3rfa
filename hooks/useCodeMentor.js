import { useState, useEffect, useRef } from "react";
import mermaid from "mermaid";
import CodeMentorService from "@/utils/CodeMentorService";

/**
 * Custom hook for managing Code Mentor functionality
 */
export function useCodeMentor() {
  const [activeTab, setActiveTab] = useState("flowchart");
  const [language, setLanguage] = useState("English");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const mermaidRef = useRef(null);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "default",
      flowchart: {
        htmlLabels: true,
        useMaxWidth: false,
        diagramPadding: 20,
      },
    });
  }, []);

  // Handle Mermaid rendering for flowchart
  useEffect(() => {
    if (activeTab === "flowchart" && output && mermaidRef.current) {
      try {
        mermaidRef.current.innerHTML = output;
        mermaid.init(undefined, mermaidRef.current);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError("Failed to render flowchart");
      }
    }
  }, [activeTab, output]);

  // Clear output and error when tab or language changes
  useEffect(() => {
    setOutput("");
    setError("");
  }, [activeTab, language]);

  // Analyze code function
  const analyzeCode = async () => {
    if (!code.trim()) {
      setError("Please enter some Python code to analyze");
      return;
    }

    if (!CodeMentorService.isPythonCode(code)) {
      setError("Please enter valid Python code");
      return;
    }

    setIsLoading(true);
    setError("");
    setOutput("");

    try {
      let result;

      switch (activeTab) {
        case "flowchart":
          result = await CodeMentorService.generateFlowchart(code, language);
          break;
        case "explain":
          result = await CodeMentorService.explainCode(code, language);
          break;
        case "annotate":
          result = await CodeMentorService.annotateCode(code, language);
          break;
        case "trace":
          result = await CodeMentorService.generateTrace(code, language);
          break;
        default:
          setError("This feature is coming soon!");
          return;
      }

      setOutput(result);
    } catch (err) {
      console.error("Analysis error:", err);
      setError(CodeMentorService.formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error
  const clearError = () => setError("");

  // Reset all state
  const reset = () => {
    setOutput("");
    setError("");
    setCode("");
  };

  return {
    // State
    activeTab,
    language,
    code,
    output,
    isLoading,
    error,
    mermaidRef,

    // Actions
    setActiveTab,
    setLanguage,
    setCode,
    setOutput,
    analyzeCode,
    clearError,
    reset,
  };
}
