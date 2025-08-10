import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import type { RecordingSession, Recording } from "../lib/recordingsService";
import { RECORDING_QUESTIONS } from "../constants/recordingQuestions";
import { CounterfactualFirebaseService } from "../lib/counterfactualFirebaseService";
import { useAuth } from "../contexts/AuthContext";
import { WeeklyPlanService } from "../lib/weeklyPlanService";
import type { WeeklyPlan } from "../types/weeklyPlan";

// Constants
const NUM_COUNTERFACTUALS = 6;
const NUM_QUESTIONS = RECORDING_QUESTIONS.length;

interface MentalModelViewerProps {
  session: RecordingSession;
  onClose: () => void;
  selectedQuestionIndex?: number;
  onQuestionSelect?: (index: number) => void;
  onRecordingSelect?: (recording: Recording) => void;
}

interface Node {
  id: string;
  x: number;
  y: number;
  size: string;
  type: string;
  questionIndex?: number;
  isCounterfactual?: boolean;
  text?: string;
}

interface Counterfactual {
  id: string;
  recordingId: string;
  stepNumber: number;
  originalText: string;
  counterfactualText: string;
  whichPhase: string;
  isSelected: boolean;
  createdAt: Date;
}

// Likert Scale Component
const LikertScale: React.FC<{
  rating: number | undefined;
  onRatingChange: (rating: number) => void;
  disabled?: boolean;
}> = ({ rating, onRatingChange, disabled = false }) => {
  const labels = [
    "Not feasible at all",
    "Slightly feasible",
    "Somewhat feasible",
    "Very feasible",
    "Extremely feasible",
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">
        How feasible do you think this alternative is?
      </p>
      <div className="flex items-center justify-between space-x-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => !disabled && onRatingChange(value)}
            disabled={disabled}
            className={`w-8 h-8 rounded-full transition-all flex items-center justify-center text-xs font-medium ${
              rating === value
                ? "bg-blue-500 text-white scale-110"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            title={labels[value - 1]}
          >
            {value}
          </button>
        ))}
      </div>
      {rating && (
        <p className="text-xs text-gray-500 text-center">
          {labels[rating - 1]}
        </p>
      )}
    </div>
  );
};

const MentalModelViewer: React.FC<MentalModelViewerProps> = ({
  session,
  onClose,
  selectedQuestionIndex,
  onQuestionSelect,
  onRecordingSelect,
}) => {
  const { userId } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [counterfactuals, setCounterfactuals] = useState<string[]>([]);
  const [showCounterfactuals, setShowCounterfactuals] = useState(false);
  const [selectedCounterfactual, setSelectedCounterfactual] = useState<{
    index: number;
    text: string;
    feasibilityRating?: number;
  } | null>(null);
  const [questionsWithCounterfactuals, setQuestionsWithCounterfactuals] =
    useState<Set<number>>(new Set());
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);

  // Load existing counterfactuals and selections when component mounts or question changes
  useEffect(() => {
    const loadExistingData = async () => {
      if (selectedQuestionIndex === undefined || !userId) return;

      try {
        const selectedRecording = session.recordings.find(
          (r) => r.stepNumber === selectedQuestionIndex
        );

        if (selectedRecording) {
          const existingData =
            await CounterfactualFirebaseService.getCounterfactuals(
              userId,
              selectedRecording.id,
              session.sessionId
            );

          if (existingData) {
            console.log(
              "📋 Loaded existing counterfactuals from Firebase:",
              existingData
            );

            // Load the generated alternatives
            setCounterfactuals(existingData.alternatives);
            setShowCounterfactuals(true);

            // Load the selected alternative if one exists
            if (existingData.selectedAlternative) {
              setSelectedCounterfactual({
                index: existingData.selectedAlternative.index,
                text: existingData.selectedAlternative.text,
                feasibilityRating: (
                  existingData.selectedAlternative as {
                    feasibilityRating?: number;
                  }
                ).feasibilityRating,
              });
            } else {
              setSelectedCounterfactual(null);
            }
          } else {
            // No existing counterfactuals found - this is normal for new users
            console.log(
              "📭 No existing counterfactuals found for this question"
            );
            setCounterfactuals([]);
            setShowCounterfactuals(false);
            setSelectedCounterfactual(null);
          }
        }
      } catch (error) {
        console.error("❌ Failed to load existing counterfactuals:", error);
        // Only show error toast for actual errors, not when no counterfactuals exist
        toast.error(
          "Failed to load counterfactuals. Please refresh and try again."
        );
      }
    };

    loadExistingData();
  }, [selectedQuestionIndex, session.recordings, userId]);

  // Check all questions for existing counterfactuals when component mounts
  useEffect(() => {
    const checkAllQuestionsForCounterfactuals = async () => {
      if (!userId) return;

      try {
        const questionsWithCf = new Set<number>();

        // Check each question (0-NUM_QUESTIONS-1) for existing counterfactuals
        for (
          let questionIndex = 0;
          questionIndex < NUM_QUESTIONS;
          questionIndex++
        ) {
          const recording = session.recordings.find(
            (r) => r.stepNumber === questionIndex
          );
          if (recording) {
            try {
              const existingData =
                await CounterfactualFirebaseService.getCounterfactuals(
                  userId,
                  recording.id,
                  session.sessionId
                );
              if (existingData && existingData.alternatives.length > 0) {
                questionsWithCf.add(questionIndex);
              }
            } catch (error) {
              // Log individual question errors but don't fail the entire check
              console.warn(
                `⚠️ Failed to check counterfactuals for question ${questionIndex}:`,
                error
              );
            }
          }
        }

        setQuestionsWithCounterfactuals(questionsWithCf);
        console.log(
          "📊 Questions with existing counterfactuals:",
          Array.from(questionsWithCf)
        );
      } catch (error) {
        console.error("❌ Failed to check existing counterfactuals:", error);
        // Only show error toast for critical failures, not when no counterfactuals exist
        toast.error(
          "Failed to check existing counterfactuals. Please refresh and try again."
        );
      }
    };

    checkAllQuestionsForCounterfactuals();
  }, [userId, session.recordings]);

  // Load weekly plan for this session's week
  useEffect(() => {
    const loadWeeklyPlan = async () => {
      if (!userId) return;

      try {
        // Get weekly plan for the week this session was completed
        const sessionDate = session.completedAt;
        const plan = await WeeklyPlanService.getWeeklyPlan(userId, sessionDate);

        if (plan) {
          console.log("📋 Loaded weekly plan for session:", plan);
          setWeeklyPlan(plan);
        } else {
          console.log("📭 No weekly plan found for session week");
          setWeeklyPlan(null);
        }
      } catch (error) {
        console.error("❌ Failed to load weekly plan:", error);
        setWeeklyPlan(null);
      }
    };

    loadWeeklyPlan();
  }, [userId, session.completedAt]);

  const handleFeasibilityRatingChange = async (rating: number) => {
    if (
      !userId ||
      selectedQuestionIndex === undefined ||
      !selectedCounterfactual
    )
      return;

    try {
      const selectedRecording = session.recordings.find(
        (r) => r.stepNumber === selectedQuestionIndex
      );

      if (selectedRecording) {
        // Update local state
        setSelectedCounterfactual((prev) =>
          prev ? { ...prev, feasibilityRating: rating } : null
        );

        // Save to Firebase
        await CounterfactualFirebaseService.saveFeasibilityRating(
          userId,
          selectedRecording.id,
          rating,
          session.sessionId
        );

        console.log("✅ Feasibility rating saved:", rating);
        toast.success("Feasibility rating saved!");
      }
    } catch (error) {
      console.error("❌ Failed to save feasibility rating:", error);
      toast.error("Failed to save rating. Please try again.");
    }
  };

  // Main NUM_QUESTIONS nodes representing the NUM_QUESTIONS questions
  const mainNodes: Node[] = [
    {
      id: "center",
      x: 50,
      y: 50,
      size: "large",
      type: selectedQuestionIndex === 0 ? "outline-blue" : "filled-blue",
      questionIndex: 0,
    },
    {
      id: "top",
      x: 50,
      y: 25,
      size: "large",
      type: selectedQuestionIndex === 1 ? "outline-blue" : "light-filled",
      questionIndex: 1,
    },
    {
      id: "right",
      x: 75,
      y: 50,
      size: "large",
      type: selectedQuestionIndex === 2 ? "outline-blue" : "light-filled",
      questionIndex: 2,
    },
    {
      id: "bottom",
      x: 50,
      y: 75,
      size: "large",
      type: selectedQuestionIndex === 3 ? "outline-blue" : "light-filled",
      questionIndex: 3,
    },
    {
      id: "left",
      x: 25,
      y: 50,
      size: "large",
      type: selectedQuestionIndex === 4 ? "outline-blue" : "light-filled",
      questionIndex: 4,
    },
  ];

  // Generate indicator nodes for questions that have existing counterfactuals
  const generateIndicatorNodes = (): Node[] => {
    const indicatorNodes: Node[] = [];

    questionsWithCounterfactuals.forEach((questionIndex) => {
      // Skip if this question is currently selected and expanded
      if (selectedQuestionIndex === questionIndex && showCounterfactuals)
        return;

      const questionNode = mainNodes.find(
        (n) => n.questionIndex === questionIndex
      );
      if (!questionNode) return;

      // Position indicator vertically above the main node
      const indicatorX = questionNode.x; // Same horizontal position
      const indicatorY = questionNode.y - 12; // 12% offset up

      indicatorNodes.push({
        id: `indicator-${questionIndex}`,
        x: Math.max(5, Math.min(95, indicatorX)),
        y: Math.max(5, Math.min(95, indicatorY)),
        size: "extra-small",
        type: "indicator",
        questionIndex,
        text: `Alternatives available`,
      });
    });

    return indicatorNodes;
  };

  // Generate counterfactual nodes around selected circle
  const generateCounterfactualNodes = (selectedNode: Node): Node[] => {
    console.log("generateCounterfactualNodes called:", {
      showCounterfactuals,
      counterfactualsLength: counterfactuals.length,
      selectedNode: selectedNode.id,
    });

    if (!showCounterfactuals || !counterfactuals.length) return [];

    const cfNodes: Node[] = [];
    const radius = 15; // Distance from selected node

    // Use the actual number of counterfactuals (up to NUM_COUNTERFACTUALS) for angle calculation
    const actualCounterfactuals = counterfactuals.slice(0, NUM_COUNTERFACTUALS);
    const numCfToShow = actualCounterfactuals.length;
    const angleStep = numCfToShow > 0 ? (2 * Math.PI) / numCfToShow : 0; // Dynamic angle step based on actual count

    actualCounterfactuals.forEach((cf, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const cfX = selectedNode.x + radius * Math.cos(angle);
      const cfY = selectedNode.y + radius * Math.sin(angle);

      cfNodes.push({
        id: `cf-${index}`,
        x: Math.max(5, Math.min(95, cfX)), // Keep within bounds
        y: Math.max(5, Math.min(95, cfY)),
        size: "extra-small",
        type: "counterfactual",
        isCounterfactual: true,
        text: cf,
      });
    });

    console.log("Generated CF nodes:", cfNodes);
    return cfNodes;
  };

  // Get all nodes (main + indicators + counterfactuals)
  const getAllNodes = (): Node[] => {
    const selectedNode = mainNodes.find(
      (n) => n.questionIndex === selectedQuestionIndex
    );
    const cfNodes = selectedNode
      ? generateCounterfactualNodes(selectedNode)
      : [];
    const indicatorNodes = generateIndicatorNodes();
    return [...mainNodes, ...indicatorNodes, ...cfNodes];
  };

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
    if (selectedQuestionIndex === undefined) {
      toast.error("Please select a question circle first!");
      return;
    }

    setIsGenerating(true);
    try {
      // Get transcriptions from session recordings for the NUM_QUESTIONS questions
      const questionResponses: string[] = [];

      for (let i = 0; i < NUM_QUESTIONS; i++) {
        const recording = session.recordings.find((r) => r.stepNumber === i);
        const transcription = recording?.transcription?.text || "";
        questionResponses.push(transcription);
      }

      console.log("Session recordings:", session.recordings);
      console.log("Question responses:", questionResponses);

      // Check if we have any actual transcriptions
      const hasTranscriptions = questionResponses.some(
        (response) => response.trim().length > 0
      );

      if (!hasTranscriptions) {
        toast.error(
          `No transcriptions available. Please ensure all ${NUM_QUESTIONS} questions have been recorded and transcribed before generating counterfactuals.`
        );
        setIsGenerating(false);
        return;
      }

      console.log("✅ Using actual transcriptions from recordings:", {
        totalResponses: questionResponses.length,
        nonEmptyResponses: questionResponses.filter((r) => r.trim().length > 0)
          .length,
        responseLengths: questionResponses.map((r) => r.length),
      });

      // Generate counterfactuals using direct API call with our questionResponses
      const requestData = {
        text: questionResponses.join("\n"),
        metadata: {
          sessionId: session.sessionId,
          userId: userId,
          questions: questionResponses.map((response, index) => ({
            stepNumber: index,
            question: RECORDING_QUESTIONS[index],
            transcription: response,
            recordingId: session.recordings.find((r) => r.stepNumber === index)
              ?.id,
          })),
          weeklyPlan: weeklyPlan
            ? {
                idealWeek: weeklyPlan.responses.idealWeek,
                obstacles: weeklyPlan.responses.obstacles,
                preventActions: weeklyPlan.responses.preventActions,
                actionDetails: weeklyPlan.responses.actionDetails,
                ifThenPlans: weeklyPlan.responses.ifThenPlans,
                weekStartDate: weeklyPlan.weekStartDate,
                weekEndDate: weeklyPlan.weekEndDate,
              }
            : null,
          selectedQuestionIndex: selectedQuestionIndex,
          timestamp: new Date().toISOString(),
        },
      };

      console.log("Sending full JSON to counterfactual API:", requestData);

      const API_BASE_URL =
        import.meta.env.VITE_COUNTERFACTUAL_API_URL ||
        (import.meta.env.DEV
          ? "http://localhost:8000"
          : "https://coping-counterfactual.fly.dev");

      const response = await fetch(`${API_BASE_URL}/counterfactual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Received enhanced response from API:", data);

      // Convert response to our expected format
      const result: { success: boolean; counterfactuals: Counterfactual[] } = {
        success: true,
        counterfactuals: data.counterfactuals.map(
          (cf: string, index: number): Counterfactual => ({
            id: `cf_${index}`,
            recordingId:
              session.recordings[index]?.id ||
              session.recordings[0]?.id ||
              "session",
            stepNumber: index,
            originalText: questionResponses[index] || "",
            counterfactualText: cf,
            whichPhase: [
              "situationSelection",
              "situationModification",
              "attentionalDeployment",
              "cognitiveChange",
              "responseModulation",
            ][index],
            isSelected: false,
            createdAt: new Date(),
          })
        ),
      };

      // Log processing metadata if available
      if (data.metadata) {
        console.log("✅ Processing metadata:", data.metadata);
        console.log(
          `📊 Processed ${data.metadata.questions_processed} questions for session ${data.metadata.session_id}`
        );
      }

      if (result.success && result.counterfactuals.length > 0) {
        // Show all NUM_COUNTERFACTUALS counterfactuals around the selected question
        const allCounterfactuals = result.counterfactuals
          .map((cf) => cf.counterfactualText)
          .slice(0, NUM_COUNTERFACTUALS);

        console.log("Setting counterfactuals:", allCounterfactuals);
        setCounterfactuals(allCounterfactuals);
        setShowCounterfactuals(true);

        // Save counterfactuals to Firebase
        try {
          const selectedRecording = session.recordings.find(
            (r) => r.stepNumber === selectedQuestionIndex
          );

          console.log("🔍 Debug info before saving:", {
            userId,
            selectedRecording: selectedRecording
              ? {
                  id: selectedRecording.id,
                  stepNumber: selectedRecording.stepNumber,
                  userId: selectedRecording.userId,
                }
              : null,
            selectedQuestionIndex,
            counterfactualsCount: allCounterfactuals.length,
          });

          if (selectedRecording && userId) {
            await CounterfactualFirebaseService.saveCounterfactuals(
              userId,
              selectedRecording.id,
              selectedQuestionIndex,
              allCounterfactuals,
              session.sessionId,
              data.cfLogs // Pass cfLogs from the API response
            );
            console.log("✅ Counterfactuals saved to Firebase");

            // Update the state to show this question now has counterfactuals
            setQuestionsWithCounterfactuals(
              (prev) => new Set([...prev, selectedQuestionIndex])
            );
          } else {
            console.error("❌ Cannot save counterfactuals:", {
              hasSelectedRecording: !!selectedRecording,
              hasUserId: !!userId,
              userId: userId,
            });
          }
        } catch (error) {
          console.error(
            "❌ Failed to save counterfactuals to Firebase:",
            error
          );
          toast.error(
            "Failed to save counterfactuals. Please check your connection and try again."
          );
        }
      } else {
        toast.error("Failed to generate counterfactuals. Please try again.");
      }
    } catch (error) {
      console.error("Error generating counterfactuals:", error);
      toast.error("Error generating counterfactuals. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNodeClick = (node: Node) => {
    if (node.type === "indicator" && node.questionIndex !== undefined) {
      // Handle indicator node click - load and show counterfactuals for this question
      console.log("Clicked indicator for question:", node.questionIndex);

      // Select the question and load its counterfactuals
      if (onQuestionSelect) {
        onQuestionSelect(node.questionIndex - 1);
      }

      // Also select the corresponding recording to keep the transcript in sync
      if (onRecordingSelect) {
        const correspondingRecording = session.recordings.find(
          (r) => r.stepNumber === node.questionIndex
        );
        if (correspondingRecording) {
          onRecordingSelect(correspondingRecording);
        }
      }

      // The useEffect will automatically load the counterfactuals when selectedQuestionIndex changes
    } else if (node.isCounterfactual && node.text) {
      // Handle counterfactual node click
      const cfIndex = parseInt(node.id.split("-")[1]); // Extract index from id like "cf-0"
      console.log("Clicked counterfactual:", cfIndex, node.text);

      setSelectedCounterfactual((prev) => {
        console.log("Previous selected:", prev);

        if (prev && prev.index === cfIndex) {
          // If already selected, unselect it
          console.log("Unselecting:", cfIndex);

          // Remove from Firebase
          const selectedRecording = session.recordings.find(
            (r) => r.stepNumber === selectedQuestionIndex
          );
          if (selectedRecording && userId) {
            CounterfactualFirebaseService.removeSelectedCounterfactual(
              userId,
              selectedRecording.id,
              session.sessionId
            )
              .then(() => console.log("✅ Selection removed from Firebase"))
              .catch((error) => {
                console.error(
                  "❌ Failed to remove selection from Firebase:",
                  error
                );
                toast.error("Failed to remove selection. Please try again.");
              });
          }

          return null;
        } else {
          // Select it (this automatically deselects any previous selection)
          console.log("Selecting:", cfIndex);
          const newSelection = { index: cfIndex, text: node.text! };
          console.log("New selected:", newSelection);

          // Save to Firebase
          const selectedRecording = session.recordings.find(
            (r) => r.stepNumber === selectedQuestionIndex
          );
          if (selectedRecording && userId) {
            CounterfactualFirebaseService.saveSelectedCounterfactual(
              userId,
              selectedRecording.id,
              cfIndex,
              node.text!,
              session.sessionId
            )
              .then(() => console.log("✅ Selection saved to Firebase"))
              .catch((error) => {
                console.error(
                  "❌ Failed to save selection to Firebase:",
                  error
                );
                toast.error("Failed to save selection. Please try again.");
              });
          }

          return newSelection;
        }
      });
    } else if (node.questionIndex !== undefined && onQuestionSelect) {
      onQuestionSelect(node.questionIndex);

      // Also select the corresponding recording to keep the transcript in sync
      if (onRecordingSelect) {
        const correspondingRecording = session.recordings.find(
          (r) => r.stepNumber === node.questionIndex
        );
        if (correspondingRecording) {
          onRecordingSelect(correspondingRecording);
        }
      }

      // Only clear if switching to a different question
      if (selectedQuestionIndex !== node.questionIndex) {
        setShowCounterfactuals(false); // Reset counterfactuals when switching questions
        setCounterfactuals([]);
        setSelectedCounterfactual(null); // Clear selected counterfactual
        console.log("Switched to different question, clearing selections");
      }
    }
  };

  const getNodeSize = (size: string) => {
    switch (size) {
      case "large":
        return { width: 50, height: 50 };
      case "medium":
        return { width: 40, height: 40 };
      case "small":
        return { width: 30, height: 30 };
      case "extra-small":
        return { width: 20, height: 20 };
      default:
        return { width: 40, height: 40 };
    }
  };

  const getNodeStyle = (type: string, nodeId?: string) => {
    const isSelectedCf =
      nodeId?.startsWith("cf-") &&
      selectedCounterfactual?.index === parseInt(nodeId.split("-")[1]);

    switch (type) {
      case "filled-blue":
        return { backgroundColor: "#3B82F6", border: "none" };
      case "outline-blue":
        return { backgroundColor: "#DBEAFE", border: "4px solid #3B82F6" };
      case "light-filled":
        return { backgroundColor: "#C7D2FE", border: "none" };
      case "counterfactual":
        return {
          backgroundColor: isSelectedCf ? "#1D4ED8" : "#60A5FA",
          border: isSelectedCf ? "3px solid #1E40AF" : "2px solid #3B82F6",
        };
      case "indicator":
        return {
          backgroundColor: "#FFFFFF",
          border: "2px solid #3B82F6",
        };
      default:
        return { backgroundColor: "#CBD5E1", border: "none" };
    }
  };

  const getNodeTitle = (node: Node): string => {
    if (node.type === "indicator") {
      return `💡 Click to view generated alternatives for:\n${
        RECORDING_QUESTIONS[node.questionIndex || 0]
      }`;
    }

    if (node.isCounterfactual) {
      const cfIndex = parseInt(node.id.split("-")[1]);
      const isSelected = selectedCounterfactual?.index === cfIndex;
      return `${isSelected ? "✓ Selected: " : "Click to select: "}${
        node.text || "Counterfactual suggestion"
      }`;
    }

    if (node.questionIndex !== undefined) {
      const question = RECORDING_QUESTIONS[node.questionIndex];
      const recording = session.recordings.find(
        (r) => r.stepNumber === node.questionIndex
      );
      const response = recording?.transcription?.text;

      return response ? `${question}\n\nResponse: ${response}` : question;
    }

    return "Click to select";
  };

  // Generate connection lines from selected node to counterfactual nodes
  const getCounterfactualConnections = () => {
    if (!showCounterfactuals || selectedQuestionIndex === undefined) return [];

    const selectedNode = mainNodes.find(
      (n) => n.questionIndex === selectedQuestionIndex
    );
    if (!selectedNode) return [];

    const cfNodes = allNodes.filter((n) => n.isCounterfactual);

    return cfNodes.map((cfNode) => ({
      from: selectedNode.id,
      to: cfNode.id,
      fromNode: selectedNode,
      toNode: cfNode,
    }));
  };

  // Generate connection lines from main nodes to their indicator nodes
  const getIndicatorConnections = () => {
    const indicatorConnections: Array<{
      from: string;
      to: string;
      fromNode: Node;
      toNode: Node;
    }> = [];

    questionsWithCounterfactuals.forEach((questionIndex) => {
      // Skip if this question is currently expanded
      if (selectedQuestionIndex === questionIndex && showCounterfactuals)
        return;

      const questionNode = mainNodes.find(
        (n) => n.questionIndex === questionIndex
      );
      const indicatorNode = allNodes.find(
        (n) => n.id === `indicator-${questionIndex}`
      );

      if (questionNode && indicatorNode) {
        indicatorConnections.push({
          from: questionNode.id,
          to: indicatorNode.id,
          fromNode: questionNode,
          toNode: indicatorNode,
        });
      }
    });

    return indicatorConnections;
  };

  const allNodes = getAllNodes();
  const counterfactualConnections = getCounterfactualConnections();
  const indicatorConnections = getIndicatorConnections();

  return (
    <div className="w-full h-full bg-white border rounded-lg flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start p-6 border-b">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "#545454" }}>
            Mental Model Viewer
          </h2>
          <p className="text-sm" style={{ color: "#b0b0b0" }}>
            Interactive mind map - Click circles to select questions
          </p>
          {/* Selected and debug info hidden */}
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
              const fromNode = allNodes.find((n) => n.id === connection.from);
              const toNode = allNodes.find((n) => n.id === connection.to);
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
            {/* Counterfactual connection lines */}
            {counterfactualConnections.map((connection, idx) => {
              return (
                <line
                  key={`cf-line-${idx}`}
                  x1={`${connection.fromNode.x}%`}
                  y1={`${connection.fromNode.y}%`}
                  x2={`${connection.toNode.x}%`}
                  y2={`${connection.toNode.y}%`}
                  stroke="#10B981"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
              );
            })}
            {/* Indicator connection lines */}
            {indicatorConnections.map((connection, idx) => {
              return (
                <line
                  key={`indicator-line-${idx}`}
                  x1={`${connection.fromNode.x}%`}
                  y1={`${connection.fromNode.y}%`}
                  x2={`${connection.toNode.x}%`}
                  y2={`${connection.toNode.y}%`}
                  stroke="#3B82F6"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {allNodes.map((node) => {
            const size = getNodeSize(node.size);
            const style = getNodeStyle(node.type, node.id);

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
                title={getNodeTitle(node)}
                onClick={() => handleNodeClick(node)}
              />
            );
          })}
        </div>
      </div>

      {/* Selected Counterfactual Display */}
      {selectedCounterfactual && (
        <div className="p-4 border-t bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {String.fromCharCode(65 + selectedCounterfactual.index)}
                </span>
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: "#545454" }}
              >
                Alternative{" "}
                {String.fromCharCode(65 + selectedCounterfactual.index)}
              </span>
            </div>
            <button
              onClick={() => setSelectedCounterfactual(null)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-sm leading-relaxed" style={{ color: "#666666" }}>
              {selectedCounterfactual.text}
            </p>
          </div>

          {/* Feasibility Rating */}
          <div className="mt-4 px-3">
            <LikertScale
              rating={selectedCounterfactual.feasibilityRating}
              onRatingChange={handleFeasibilityRatingChange}
            />
          </div>

          <div className="mt-3 flex justify-center">
            <button
              onClick={async () => {
                if (!userId || selectedQuestionIndex === undefined) return;

                try {
                  const selectedRecording = session.recordings.find(
                    (r) => r.stepNumber === selectedQuestionIndex
                  );
                  if (selectedRecording) {
                    await CounterfactualFirebaseService.saveSelectedCounterfactual(
                      userId,
                      selectedRecording.id,
                      selectedCounterfactual.index,
                      selectedCounterfactual.text,
                      session.sessionId
                    );
                    console.log("✅ Alternative confirmed and saved");
                    toast.success(
                      `Alternative ${String.fromCharCode(
                        65 + selectedCounterfactual.index
                      )} has been selected and saved!`
                    );
                  }
                } catch (error) {
                  console.error("❌ Failed to confirm selection:", error);
                  toast.error("Failed to save selection. Please try again.");
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Select This Alternative
            </button>
          </div>
        </div>
      )}

      {/* Footer with Generate Button */}
      <div className="p-6 border-t flex flex-col items-center space-y-2">
        <button
          onClick={handleGenerateAlternatives}
          disabled={isGenerating || selectedQuestionIndex === undefined}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ color: "#545454" }}
        >
          <span className="text-lg">✨</span>
          {isGenerating
            ? "Generating..."
            : 'Generate "What if..." alternatives'}
        </button>
        {selectedQuestionIndex === undefined && (
          <p className="text-xs" style={{ color: "#b0b0b0" }}>
            Select a question circle to generate alternatives
          </p>
        )}
        {showCounterfactuals && counterfactuals.length > 0 && (
          <p className="text-xs" style={{ color: "#3B82F6" }}>
            {counterfactuals.length} alternatives generated around selected
            question
            {selectedCounterfactual &&
              ` • Alternative ${String.fromCharCode(
                65 + selectedCounterfactual.index
              )} selected`}
          </p>
        )}
        {!showCounterfactuals && questionsWithCounterfactuals.size > 0 && (
          <p className="text-xs" style={{ color: "#3B82F6" }}>
            💡 {questionsWithCounterfactuals.size} question
            {questionsWithCounterfactuals.size > 1 ? "s" : ""} with generated
            alternatives • Click blue indicators to view
          </p>
        )}
        {weeklyPlan && (
          <p className="text-xs" style={{ color: "#059669" }}>
            📋 Weekly plan context available • Enhanced counterfactuals enabled
          </p>
        )}
      </div>
    </div>
  );
};

export default MentalModelViewer;
