import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Simple standalone modal for testing
export default function SimpleFlowchartModal({ mermaidCode, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Debug Modal</h2>
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
          <div className="min-h-[500px]">
            <h3 className="text-lg font-semibold mb-4">Received Code:</h3>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[400px] text-sm">
              {mermaidCode || "No code provided"}
            </pre>
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Code Type:</h3>
              <p>{typeof mermaidCode}</p>
              <h3 className="text-lg font-semibold mb-2 mt-4">Code Length:</h3>
              <p>{mermaidCode ? mermaidCode.length : 0} characters</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
