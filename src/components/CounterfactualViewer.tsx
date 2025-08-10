import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { CounterfactualService } from "../lib/counterfactualService";
import type { Recording } from "../lib/recordingsService";
import { RECORDING_QUESTIONS } from "../constants/recordingQuestions";
import { CounterfactualFirebaseService } from "../lib/counterfactualFirebaseService";

interface CounterfactualViewerProps {
  recordings: Recording[];
  userId: string;
  sessionId: string;
  onCounterfactualSelected?: (
    recordingId: string,
    counterfactual: string
  ) => void;
}

interface StepCounterfactuals {
  stepNumber: number;
  question: string;
  originalText: string;
  counterfactuals: Counterfactual[];
  selectedCounterfactual?: string;
  feasibilityRating?: number;
  humanFeasibilityRating?: number[]; // Array of ratings for each counterfactual (-1 indicates no rating)
  isLoading: boolean;
  error?: string;
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

  // Only show selected state if rating is a valid value (1-5)
  const isValidRating = rating && rating >= 1 && rating <= 5;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-blue-900">
        How feasible do you think this alternative is?
      </p>
      <div className="flex items-center justify-between space-x-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => !disabled && onRatingChange(value)}
            disabled={disabled}
            className={`w-8 h-8 rounded-full transition-all flex items-center justify-center text-xs font-medium ${
              isValidRating && rating === value
                ? "bg-blue-600 text-white scale-110"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            title={labels[value - 1]}
          >
            {value}
          </button>
        ))}
      </div>
      {isValidRating && (
        <p className="text-xs text-blue-600 text-center">
          {labels[rating - 1]}
        </p>
      )}
    </div>
  );
};

export const CounterfactualViewer: React.FC<CounterfactualViewerProps> = ({
  recordings,
  userId,
  sessionId,
  onCounterfactualSelected,
}) => {
  const [stepData, setStepData] = useState<StepCounterfactuals[]>([]);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [serviceAvailable, setServiceAvailable] = useState<boolean>(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cfLogsData, setCfLogsData] = useState<Record<string, any>>({});
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);

  useEffect(() => {
    // Check if counterfactual service is available
    CounterfactualService.checkHealth().then(setServiceAvailable);

    // Initialize step data
    const initialData = Array.from({ length: 5 }, (_, index) => ({
      stepNumber: index,
      question: RECORDING_QUESTIONS[index],
      originalText: recordings[index]?.transcription?.text || "",
      counterfactuals: [],
      selectedCounterfactual: undefined,
      feasibilityRating: undefined,
      humanFeasibilityRating: undefined,
      isLoading: false,
      error: undefined,
    }));
    setStepData(initialData);
  }, [recordings]);

  // Load existing counterfactual data including feasibility ratings
  useEffect(() => {
    const loadExistingCounterfactualData = async () => {
      if (!userId) return;

      try {
        // Load existing data for each step
        for (let stepNumber = 0; stepNumber < recordings.length; stepNumber++) {
          const recording = recordings[stepNumber];
          if (!recording) continue;

          try {
            const existingData =
              await CounterfactualFirebaseService.getCounterfactuals(
                userId,
                recording.id,
                sessionId
              );

            if (existingData) {
              console.log(
                `📋 Loaded existing counterfactual data for step ${stepNumber}:`,
                existingData
              );

              // Validate and fix humanFeasibilityRating array integrity
              await CounterfactualFirebaseService.validateAndFixHumanFeasibilityRatings(
                userId,
                recording.id,
                sessionId
              );

              // Re-fetch the data after validation to get the fixed version
              const validatedData =
                await CounterfactualFirebaseService.getCounterfactuals(
                  userId,
                  recording.id,
                  sessionId
                );

              if (!validatedData) {
                console.warn(
                  `⚠️ No validated data found for step ${stepNumber}`
                );
                continue;
              }

              // Ensure humanFeasibilityRating array length matches generatedCfTexts length
              let humanFeasibilityRating = validatedData.humanFeasibilityRating;
              if (
                !humanFeasibilityRating ||
                humanFeasibilityRating.length !==
                  validatedData.generatedCfTexts.length
              ) {
                console.log(
                  `🔄 Fixing humanFeasibilityRating array length for step ${stepNumber}`
                );
                humanFeasibilityRating = new Array(
                  validatedData.generatedCfTexts.length
                ).fill(-1);

                // Preserve existing ratings if possible
                if (validatedData.humanFeasibilityRating) {
                  for (
                    let i = 0;
                    i <
                    Math.min(
                      validatedData.humanFeasibilityRating.length,
                      validatedData.generatedCfTexts.length
                    );
                    i++
                  ) {
                    humanFeasibilityRating[i] =
                      validatedData.humanFeasibilityRating[i];
                  }
                }
              }

              // Update step data with existing counterfactuals and ratings
              setStepData((prev) =>
                prev.map((step) =>
                  step.stepNumber === stepNumber
                    ? {
                        ...step,
                        counterfactuals: validatedData.generatedCfTexts.map(
                          (text, index) => ({
                            id: `cf-${stepNumber}-${index}`,
                            recordingId: recording.id,
                            stepNumber,
                            originalText: recording.transcription?.text || "",
                            counterfactualText: text,
                            whichPhase: "generated",
                            isSelected: false,
                            createdAt: new Date(),
                          })
                        ),
                        selectedCounterfactual:
                          validatedData.selectedAlternative?.text,
                        feasibilityRating:
                          validatedData.selectedAlternative?.feasibilityRating,
                        humanFeasibilityRating: humanFeasibilityRating,
                      }
                    : step
                )
              );
            }
          } catch (error) {
            // Log individual step errors but don't fail the entire load
            console.warn(
              `⚠️ Failed to load existing counterfactual data for step ${stepNumber}:`,
              error
            );
          }
        }
      } catch (error) {
        console.error("❌ Failed to load existing counterfactual data:", error);
      }
    };

    loadExistingCounterfactualData();
  }, [userId, recordings, sessionId]);

  const generateCounterfactualsForStep = async (stepNumber: number) => {
    const recording = recordings[stepNumber];
    if (!recording || !recording.transcription?.text) {
      setStepData((prev) =>
        prev.map((step) =>
          step.stepNumber === stepNumber
            ? { ...step, error: "No transcription available" }
            : step
        )
      );
      return;
    }

    setStepData((prev) =>
      prev.map((step) =>
        step.stepNumber === stepNumber
          ? { ...step, isLoading: true, error: undefined }
          : step
      )
    );

    try {
      const result = await CounterfactualService.generateCounterfactuals({
        userId,
        sessionId: recording.id, // Use recording id as session id for single recording
        recordings: [recording],
      });

      if (result.success) {
        const stepCounterfactuals =
          CounterfactualService.getCounterfactualsForStep(
            result.counterfactuals,
            stepNumber
          );

        setStepData((prev) =>
          prev.map((step) =>
            step.stepNumber === stepNumber
              ? {
                  ...step,
                  counterfactuals: stepCounterfactuals,
                  isLoading: false,
                }
              : step
          )
        );

        // Store cfLogs data if available
        if (result.cfLogs) {
          setCfLogsData((prev) => ({
            ...prev,
            [`${sessionId}_step_${stepNumber}`]: result.cfLogs,
          }));
          console.log(
            "📊 CF Logs data stored for step:",
            stepNumber,
            result.cfLogs
          );
        }
      } else {
        setStepData((prev) =>
          prev.map((step) =>
            step.stepNumber === stepNumber
              ? { ...step, error: result.error, isLoading: false }
              : step
          )
        );
      }
    } catch {
      setStepData((prev) =>
        prev.map((step) =>
          step.stepNumber === stepNumber
            ? {
                ...step,
                error: "Failed to generate counterfactuals",
                isLoading: false,
              }
            : step
        )
      );
    }
  };

  const selectCounterfactual = (
    stepNumber: number,
    counterfactualText: string
  ) => {
    setStepData((prev) =>
      prev.map((step) =>
        step.stepNumber === stepNumber
          ? { ...step, selectedCounterfactual: counterfactualText }
          : step
      )
    );

    const recording = recordings[stepNumber];
    if (recording && onCounterfactualSelected) {
      onCounterfactualSelected(recording.id, counterfactualText);
    }
  };

  const handleFeasibilityRatingChange = async (
    stepNumber: number,
    counterfactualIndex: number,
    rating: number
  ) => {
    const recording = recordings[stepNumber];
    if (!recording) {
      console.error("❌ No recording found for step:", stepNumber);
      return;
    }

    try {
      // First, get the current Firebase data to ensure we have the correct array length
      const existingData =
        await CounterfactualFirebaseService.getCounterfactuals(
          userId,
          recording.id,
          sessionId
        );

      if (!existingData?.generatedCfTexts) {
        console.error("❌ No counterfactual data found in Firebase");
        toast.error(
          "No counterfactual data found. Please regenerate alternatives."
        );
        return;
      }

      // Ensure the counterfactual index is within bounds
      if (counterfactualIndex >= existingData.generatedCfTexts.length) {
        console.error("❌ Counterfactual index out of bounds");
        toast.error(
          "Invalid counterfactual index. Please refresh and try again."
        );
        return;
      }

      // Initialize ratings array based on Firebase data length
      const currentRatings =
        existingData.humanFeasibilityRating ||
        new Array(existingData.generatedCfTexts.length).fill(-1);

      // Update the specific rating
      const updatedRatings = [...currentRatings];
      updatedRatings[counterfactualIndex] = rating;

      // Update local state with the correct array length
      setStepData((prev) =>
        prev.map((step) =>
          step.stepNumber === stepNumber
            ? {
                ...step,
                humanFeasibilityRating: updatedRatings,
              }
            : step
        )
      );

      console.log("🔍 Debug - Current step data after update:", {
        stepNumber,
        counterfactualIndex,
        rating,
        updatedRatings,
        existingDataLength: existingData.generatedCfTexts.length,
        ratingsLength: updatedRatings.length,
      });

      // Save to Firebase
      await CounterfactualFirebaseService.saveHumanFeasibilityRating(
        userId,
        recording.id,
        counterfactualIndex,
        rating,
        sessionId
      );

      console.log(
        `✅ Human feasibility rating ${rating} saved for step ${
          stepNumber + 1
        }, counterfactual ${counterfactualIndex}`
      );
      toast.success("Feasibility rating saved!");
    } catch (error) {
      console.error("❌ Failed to save feasibility rating:", error);
      toast.error("Failed to save rating. Please try again.");
    }
  };

  const generateAllCounterfactuals = async () => {
    const completeRecordings = recordings.filter((r) => r.transcription?.text);
    if (completeRecordings.length === 0) {
      toast.error("Please complete transcriptions for all recordings first.");
      return;
    }

    setStepData((prev) => prev.map((step) => ({ ...step, isLoading: true })));

    try {
      const result = await CounterfactualService.generateCounterfactuals({
        userId,
        sessionId,
        recordings: completeRecordings,
      });

      if (result.success) {
        setStepData((prev) =>
          prev.map((step) => ({
            ...step,
            counterfactuals: CounterfactualService.getCounterfactualsForStep(
              result.counterfactuals,
              step.stepNumber
            ),
            isLoading: false,
          }))
        );

        // Store cfLogs data if available
        if (result.cfLogs) {
          setCfLogsData((prev) => ({
            ...prev,
            [sessionId]: result.cfLogs,
          }));
          console.log("📊 CF Logs data stored:", result.cfLogs);
        }
      } else {
        setStepData((prev) =>
          prev.map((step) => ({
            ...step,
            error: result.error,
            isLoading: false,
          }))
        );
      }
    } catch {
      setStepData((prev) =>
        prev.map((step) => ({
          ...step,
          error: "Failed to generate counterfactuals",
          isLoading: false,
        }))
      );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {!serviceAvailable && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700 text-sm">
            Counterfactual service is not available. Please ensure the FastAPI
            server is running on localhost:8000
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          What If Alternatives
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            {showDebugInfo ? "Hide" : "Show"} Debug Info
          </button>
          <button
            onClick={generateAllCounterfactuals}
            disabled={!serviceAvailable}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Generate All Alternatives
          </button>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-2">
          {stepData.map((step) => (
            <button
              key={step.stepNumber}
              onClick={() => setActiveStep(step.stepNumber)}
              className={`w-4 h-4 rounded-full transition-all ${
                activeStep === step.stepNumber
                  ? "bg-blue-600 scale-125"
                  : step.counterfactuals.length > 0
                  ? "bg-green-500"
                  : step.isLoading
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-gray-300"
              }`}
              title={`Step ${step.stepNumber + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Debug Info Section */}
      {showDebugInfo && cfLogsData[sessionId] && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Debug Information
          </h3>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-700 mb-1">
                CF Logs Analysis
              </h4>
              {(() => {
                const analysis = CounterfactualService.analyzeCfLogs(
                  cfLogsData[sessionId]
                );
                return (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Total Generated: {analysis.totalGenerated}</p>
                    <p>
                      Average Feasibility Score:{" "}
                      {analysis.averageFeasibilityScore.toFixed(3)}
                    </p>
                    <p>
                      Average Similarity Score:{" "}
                      {analysis.averageSimilarityScore.toFixed(3)}
                    </p>
                    <p>
                      Chosen Categories: Similar (
                      {analysis.chosenCounts.similar}), Neutral (
                      {analysis.chosenCounts.neutral}), Different (
                      {analysis.chosenCounts.different})
                    </p>
                    <div className="mt-2">
                      <p className="font-medium">Insights:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {analysis.insights.map((insight, index) => (
                          <li key={index}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-1">
                Raw CF Logs Data
              </h4>
              <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                {JSON.stringify(cfLogsData[sessionId], null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Current Step Display */}
      {stepData[activeStep] && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Step {activeStep + 1}: {stepData[activeStep].question}
            </h3>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600">Original:</p>
              <p className="text-gray-900">
                {stepData[activeStep].originalText}
              </p>
            </div>
          </div>

          {stepData[activeStep].isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : stepData[activeStep].error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{stepData[activeStep].error}</p>
              <button
                onClick={() => generateCounterfactualsForStep(activeStep)}
                className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : stepData[activeStep].counterfactuals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                No alternatives generated yet
              </p>
              <button
                onClick={() => generateCounterfactualsForStep(activeStep)}
                disabled={
                  !serviceAvailable || !stepData[activeStep].originalText
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                Generate Alternatives
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                Alternative Responses:
              </h4>
              {stepData[activeStep].counterfactuals.map((cf, index) => (
                <div
                  key={cf.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    stepData[activeStep].selectedCounterfactual ===
                    cf.counterfactualText
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() =>
                    selectCounterfactual(activeStep, cf.counterfactualText)
                  }
                >
                  <p className="text-gray-900">{cf.counterfactualText}</p>

                  {/* Feasibility Rating for this counterfactual */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <LikertScale
                      rating={
                        stepData[activeStep].humanFeasibilityRating?.[index]
                      }
                      onRatingChange={(rating) =>
                        handleFeasibilityRatingChange(activeStep, index, rating)
                      }
                    />
                  </div>

                  {stepData[activeStep].selectedCounterfactual ===
                    cf.counterfactualText && (
                    <div className="mt-2 flex items-center">
                      <svg
                        className="w-4 h-4 text-blue-600 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-blue-600 font-medium">
                        Selected
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Selected Alternative Display */}
          {stepData[activeStep].selectedCounterfactual && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Your Selected Alternative:
              </p>
              <p className="text-blue-800">
                {stepData[activeStep].selectedCounterfactual}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
