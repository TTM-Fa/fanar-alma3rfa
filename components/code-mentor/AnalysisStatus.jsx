import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  FileText,
  MessageSquare,
  GitBranch,
  List,
} from "lucide-react";

const FEATURE_ICONS = {
  flowchart: GitBranch,
  explain: MessageSquare,
  annotate: FileText,
  trace: List,
};

export function AnalysisStatus({
  isLoading,
  hasOutput,
  error,
  activeFeature,
  analysisHistory = [],
}) {
  const Icon = FEATURE_ICONS[activeFeature] || FileText;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-blue-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">Analyzing...</span>
        <Badge variant="outline" className="text-xs">
          {activeFeature}
        </Badge>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Analysis failed</span>
        <Badge variant="destructive" className="text-xs">
          Error
        </Badge>
      </div>
    );
  }

  if (hasOutput) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-medium">Analysis complete</span>
        <Badge className="text-xs bg-green-100 text-green-800">
          <Icon className="h-3 w-3 mr-1" />
          {activeFeature}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-gray-500">
      <Clock className="h-4 w-4" />
      <span className="text-sm font-medium">Ready to analyze</span>
      <Badge variant="outline" className="text-xs">
        <Icon className="h-3 w-3 mr-1" />
        {activeFeature}
      </Badge>
    </div>
  );
}

export function AnalysisHistory({ history = [] }) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Recent Analysis</h4>
      <div className="space-y-1">
        {history.slice(0, 3).map((item) => {
          const Icon = FEATURE_ICONS[item.feature] || FileText;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded p-2"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-3 w-3" />
                <span>{item.feature}</span>
                <span>•</span>
                <span>{item.language}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.success ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-red-600" />
                )}
                <span>{item.duration}ms</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
