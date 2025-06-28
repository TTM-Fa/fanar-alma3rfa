import { Button } from "@/components/ui/button";
import {
  Play,
  Shuffle,
  Copy,
  RotateCcw,
  Download,
  Share2,
  Settings,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export function CodeEditorActions({
  onAnalyze,
  onLoadSample,
  onCopy,
  onClear,
  isLoading = false,
  className = "",
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Sample Code */}
      <Button
        variant="outline"
        size="sm"
        onClick={onLoadSample}
        className="gap-2"
        disabled={isLoading}
      >
        <Shuffle className="h-4 w-4" />
        <span className="hidden sm:inline">Sample</span>
      </Button>

      {/* Copy Code */}
      <Button
        variant="outline"
        size="sm"
        onClick={onCopy}
        className="gap-2"
        disabled={isLoading}
      >
        <Copy className="h-4 w-4" />
        <span className="hidden sm:inline">Copy</span>
      </Button>

      {/* Clear Code */}
      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        className="gap-2"
        disabled={isLoading}
      >
        <RotateCcw className="h-4 w-4" />
        <span className="hidden sm:inline">Clear</span>
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Analyze Button - Primary Action */}
      <Button
        onClick={onAnalyze}
        disabled={isLoading}
        className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
      >
        {isLoading ? (
          <>
            <Spinner className="h-4 w-4" />
            <span className="hidden sm:inline">Analyzing...</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Analyze Code</span>
            <span className="sm:hidden">Analyze</span>
          </>
        )}
      </Button>
    </div>
  );
}

export function ResultActions({
  onShare,
  onDownload,
  onSettings,
  hasOutput = false,
  className = "",
}) {
  if (!hasOutput) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Share Results */}
      <Button variant="outline" size="sm" onClick={onShare} className="gap-2">
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </Button>

      {/* Download Results */}
      <Button
        variant="outline"
        size="sm"
        onClick={onDownload}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Download</span>
      </Button>

      {/* Settings */}
      <Button variant="ghost" size="sm" onClick={onSettings} className="gap-2">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}
