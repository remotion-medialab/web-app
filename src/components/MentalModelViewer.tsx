import React, { useState } from "react";
import type { Recording } from "../lib/recordingsService";

interface MentalModelViewerProps {
  recording: Recording;
  onClose: () => void;
}

const MentalModelViewer: React.FC<MentalModelViewerProps> = ({
  recording,
  onClose,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const nodes = [
    { id: "center", x: 50, y: 50, size: "large", type: "filled-blue" },
    { id: "top", x: 50, y: 25, size: "large", type: "light-filled" },
    { id: "left", x: 25, y: 50, size: "large", type: "outline-blue" },
    { id: "right", x: 75, y: 50, size: "large", type: "light-filled" },
    { id: "bottom", x: 50, y: 75, size: "large", type: "light-filled" },
  ];

  const connections = [
    { from: "center", to: "top" },
    { from: "center", to: "left" },
    { from: "center", to: "right" },
    { from: "center", to: "bottom" },
    { from: "left", to: "bottom" },
    { from: "right", to: "bottom" },
    { from: "top", to: "left" },
    { from: "top", to: "right" },
  ];

  const handleGenerateAlternatives = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsGenerating(false);
    alert(
      'Generated "What if..." alternatives! (This would show actual suggestions)'
    );
  };

  const getNodeSize = (size: string) => {
    switch (size) {
      case "large":
        return { width: 50, height: 50 };
      case "medium":
        return { width: 40, height: 40 };
      case "small":
        return { width: 30, height: 30 };
      default:
        return { width: 40, height: 40 };
    }
  };

  const getNodeStyle = (type: string) => {
    switch (type) {
      case "filled-blue":
        return { backgroundColor: "#3B82F6", border: "none" };
      case "outline-blue":
        return { backgroundColor: "#DBEAFE", border: "4px solid #3B82F6" };
      case "light-filled":
        return { backgroundColor: "#C7D2FE", border: "none" };
      default:
        return { backgroundColor: "#CBD5E1", border: "none" };
    }
  };

  return (
    <div className="w-full h-full bg-white border rounded-lg flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start p-6 border-b">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "#545454" }}>
            Mental Model Viewer
          </h2>
          <p className="text-sm" style={{ color: "#b0b0b0" }}>
            Interactive mind map
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>
      </div>

      {/* Mind Map Visualization */}
      <div className="flex-1 p-6 relative">
        <div className="w-full h-full relative bg-gray-50 rounded-lg">
          {/* SVG for connections */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            {connections.map((connection, idx) => {
              const fromNode = nodes.find((n) => n.id === connection.from);
              const toNode = nodes.find((n) => n.id === connection.to);
              if (!fromNode || !toNode) return null;

              return (
                <line
                  key={idx}
                  x1={`${fromNode.x}%`}
                  y1={`${fromNode.y}%`}
                  x2={`${toNode.x}%`}
                  y2={`${toNode.y}%`}
                  stroke="#E2E8F0"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const size = getNodeSize(node.size);
            const style = getNodeStyle(node.type);

            return (
              <div
                key={node.id}
                className="absolute rounded-full cursor-pointer hover:scale-105 transition-transform"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  width: size.width,
                  height: size.height,
                  ...style,
                  transform: "translate(-50%, -50%)",
                  zIndex: 2,
                }}
                title={
                  node.type === "filled-blue"
                    ? "Current situation"
                    : node.type === "outline-blue"
                    ? "Related concept (selected)"
                    : "Related concept"
                }
              />
            );
          })}
        </div>
      </div>

      {/* Footer with Generate Button */}
      <div className="p-6 border-t flex justify-center">
        <button
          onClick={handleGenerateAlternatives}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ color: "#545454" }}
        >
          <span className="text-lg">✨</span>
          {isGenerating
            ? "Generating..."
            : 'Generate "What if..." alternatives'}
        </button>
      </div>
    </div>
  );
};

export default MentalModelViewer;
