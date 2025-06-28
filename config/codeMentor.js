/**
 * Configuration for Code Mentor feature
 */

export const CODE_MENTOR_CONFIG = {
  // Available analysis tabs
  TABS: [
    {
      id: "flowchart",
      label: "Flow Chart",
      icon: "GitBranch",
      description: "Visualize code flow with diagrams",
      available: true,
    },
    {
      id: "explain",
      label: "Explain",
      icon: "MessageSquare",
      description: "Get detailed code explanations",
      available: true,
    },
    {
      id: "annotate",
      label: "Annotate",
      icon: "FileText",
      description: "Add comments and documentation",
      available: true,
    },
    {
      id: "trace",
      label: "Trace Table",
      icon: "List",
      description: "Track variable changes step by step",
      available: true,
    },
    // {
    //   id: "challenges",
    //   label: "Challenges",
    //   icon: "Zap",
    //   description: "Interactive coding challenges",
    //   available: false,
    // },
    // {
    //   id: "convert",
    //   label: "Convert",
    //   icon: "RefreshCw",
    //   description: "Convert to other languages",
    //   available: false,
    // },
    // {
    //   id: "debug",
    //   label: "Debug",
    //   icon: "Bug",
    //   description: "AI-powered debugging help",
    //   available: false,
    // },
  ],

  // Supported languages
  LANGUAGES: [
    { code: "English", label: "English", rtl: false },
    { code: "العربية", label: "العربية", rtl: true },
  ],

  // Code editor settings
  EDITOR: {
    defaultLines: 25,
    theme: "dracula",
    fontSize: 14,
    tabSize: 4,
    lineNumbers: true,
    wordWrap: false,
    minimap: false,
    autoIndent: true,
    bracketMatching: true,
    autoCompletion: true,
  },

  // API endpoints
  API_ENDPOINTS: {
    flowchart: "/api/code-mentor/flowchart",
    explain: "/api/code-mentor/explain",
    annotate: "/api/code-mentor/annotate",
    trace: "/api/code-mentor/trace",
  },

  // Feature flags
  FEATURES: {
    codeSharing: true,
    downloadResults: true,
    codeSamples: true,
    autoSave: false,
    realTimeAnalysis: false,
  },

  // UI settings
  UI: {
    maxCodeLength: 10000,
    analysisTimeout: 30000, // 30 seconds
    showLineNumbers: true,
    enableKeyboardShortcuts: true,
    responsiveLayout: true,
  },

  // Error messages
  ERRORS: {
    emptyCode: "Please enter some Python code to analyze",
    invalidPython: "Please enter valid Python code",
    networkError: "Network error. Please check your connection and try again.",
    timeout: "Request timed out. Please try again.",
    generic: "An unexpected error occurred. Please try again.",
  },

  // Success messages
  SUCCESS: {
    codeAnalyzed: "Code analysis completed successfully",
    codeCopied: "Code copied to clipboard",
    codeCleared: "Code editor cleared",
    sampleLoaded: "Sample code loaded",
  },

  // Keyboard shortcuts
  SHORTCUTS: {
    analyze: "Ctrl+Enter",
    copy: "Ctrl+C",
    clear: "Ctrl+K",
    sample: "Ctrl+L",
  },
};

export default CODE_MENTOR_CONFIG;
