/**
 * Code Mentor API Service
 * Provides methods to interact with the Code Mentor API endpoints
 */

class CodeMentorService {
  /**
   * Analyze code with flowchart generation
   * @param {string} pythonCode - The Python code to analyze
   * @param {string} lang - Language preference ("English" or "العربية")
   * @returns {Promise<string>} - Mermaid flowchart code
   */
  static async generateFlowchart(pythonCode, lang = "English") {
    try {
      console.log(
        "Generating flowchart for code:",
        pythonCode.substring(0, 50) + "..."
      );

      const response = await fetch("/api/code-mentor/flowchart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pythonCode, lang }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Flowchart generation failed");
      }

      const data = await response.json();

      if (!data.mermaidCode) {
        throw new Error("No mermaid code returned from API");
      }

      console.log(
        "Received mermaid code:",
        data.mermaidCode.substring(0, 50) + "..."
      );

      // Make sure it starts with flowchart syntax
      if (!data.mermaidCode.trim().startsWith("flowchart")) {
        console.log("Adding flowchart TD prefix");
        return "flowchart TD\n" + data.mermaidCode;
      }

      return data.mermaidCode;
    } catch (err) {
      console.error("Error in generateFlowchart:", err);
      throw err;
    }
  }

  /**
   * Explain Python code
   * @param {string} code - The Python code to explain
   * @param {string} lang - Language preference ("English" or "العربية")
   * @returns {Promise<string>} - Code explanation
   */
  static async explainCode(code, lang = "English") {
    const response = await fetch("/api/code-mentor/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, lang }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Code explanation failed");
    }

    const data = await response.json();
    return data.explanation;
  }

  /**
   * Annotate Python code with comments
   * @param {string} code - The Python code to annotate
   * @param {string} lang - Language preference ("English" or "العربية")
   * @returns {Promise<string>} - Annotated code
   */
  static async annotateCode(code, lang = "English") {
    const response = await fetch("/api/code-mentor/annotate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, lang }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Code annotation failed");
    }

    const data = await response.json();
    return data.comments;
  }

  /**
   * Generate execution trace table
   * @param {string} code - The Python code to trace
   * @param {string} lang - Language preference ("English" or "العربية")
   * @returns {Promise<Object>} - Trace data object with headers and steps
   */
  static async generateTrace(code, lang = "English") {
    console.log("=== CodeMentorService.generateTrace called ===");
    console.log("Code length:", code?.length);
    console.log("Language:", lang);

    try {
      // Use the real trace endpoint
      const response = await fetch("/api/code-mentor/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, lang }),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);

        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error || "Trace generation failed");
        } catch (parseError) {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }

      const data = await response.json();
      console.log("Success! Data received:", {
        hasHeaders: !!data.headers,
        hasTraceSteps: !!data.traceSteps,
        traceStepsCount: data.traceSteps?.length,
      });

      return data; // Return the full data object with headers and traceSteps
    } catch (error) {
      console.error("Service error:", error);
      throw error;
    }
  }

  /**
   * Validate if code appears to be Python
   * @param {string} code - Code to validate
   * @returns {boolean} - True if code appears to be Python
   */
  static isPythonCode(code) {
    if (!code?.trim()) return false;

    // Check for common Python patterns
    const pythonPatterns = [
      /^\s*def\s+\w+\s*\(.*\)\s*:/m, // Function definitions
      /^\s*class\s+\w+.*:/m, // Class definitions
      /^\s*import\s+\w+/m, // Import statements
      /^\s*from\s+\w+\s+import/m, // From imports
      /:\s*(#.*)?$/m, // Colon endings (if, for, while, etc.)
      /^\s*(if|for|while|elif|else|try|except|finally|with)\s+/m, // Control structures
      /^\s*print\s*\(/m, // Print statements
      /^\s*#/m, // Comments
    ];

    return pythonPatterns.some((pattern) => pattern.test(code));
  }

  /**
   * Format error messages for display
   * @param {Error} error - The error object
   * @returns {string} - Formatted error message
   */
  static formatError(error) {
    if (error.message.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }
    if (error.message.includes("timeout")) {
      return "Request timed out. Please try again.";
    }
    return error.message || "An unexpected error occurred.";
  }
}

export default CodeMentorService;
