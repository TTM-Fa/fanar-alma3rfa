import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FlowchartModal({ mermaidCode, onClose }) {
  const mermaidRef = useRef(null);
  const [renderError, setRenderError] = useState(null);
  const [isRendered, setIsRendered] = useState(false);

  // Simple direct rendering approach
  const renderDiagram = async () => {
    if (!mermaidRef.current || !mermaidCode) return;

    try {
      console.log("Attempting to render diagram with code:", mermaidCode);

      // Reset state
      setRenderError(null);
      mermaidRef.current.innerHTML = "";

      // Initialize mermaid with consistent settings
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "default",
        flowchart: {
          htmlLabels: true,
          useMaxWidth: true,
          diagramPadding: 20,
        },
      });

      try {
        // Generate a unique id for each render to avoid conflicts
        const uniqueId = `mermaid-modal-diagram-${Date.now()}`;

        // Render the diagram
        const { svg } = await mermaid.render(uniqueId, mermaidCode);

        // Set the SVG content
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
          setIsRendered(true);
          console.log("Modal diagram rendered successfully");
        }
      } catch (renderError) {
        throw renderError;
      }
    } catch (error) {
      console.error("Failed to render diagram:", error);
      setRenderError(error.message || "Failed to render flowchart");

      if (mermaidRef.current) {
        mermaidRef.current.innerHTML = `
          <div class="text-center p-4">
            <div class="text-red-500 font-medium">Rendering Error</div>
            <div class="text-gray-700 mt-2">${
              error.message || "Unknown error"
            }</div>
          </div>
        `;
      }
    }
  };

  // Render when component mounts and when code changes
  useEffect(() => {
    console.log(
      "FlowchartModal: Rendering with code available:",
      !!mermaidCode
    );

    // Add a small delay to ensure the DOM is ready
    const timer = setTimeout(() => {
      renderDiagram();
    }, 100);

    return () => {
      clearTimeout(timer);
      console.log("FlowchartModal: Unmounting");
    };
  }, [mermaidCode]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            Expanded Flowchart
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-full w-8 h-8 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
          <div className="flex justify-center items-center min-h-[500px]">
            {!mermaidCode ? (
              <div className="text-center">
                <p className="text-red-500 font-medium">
                  No diagram data available
                </p>
                <p className="text-gray-500 mt-2 text-sm">
                  Try running the flowchart analysis again
                </p>
              </div>
            ) : renderError ? (
              <div className="text-center">
                <p className="text-red-500 font-medium">
                  Failed to render flowchart
                </p>
                <p className="text-gray-700 mt-2">{renderError}</p>
                <pre className="mt-4 text-left text-xs bg-gray-50 p-3 rounded border max-w-full overflow-x-auto">
                  {typeof mermaidCode === "string"
                    ? mermaidCode.substring(0, 100) + "..."
                    : "Invalid mermaid code"}
                </pre>
              </div>
            ) : (
              <div ref={mermaidRef} className="w-full max-w-[1000px]" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
