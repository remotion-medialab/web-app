import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import type { Counterfactual } from "../lib/counterfactualService";
import { CounterfactualService } from "../lib/counterfactualService";
import type { Recording } from "../lib/recordingsService";
import { RECORDING_QUESTIONS } from "../constants/recordingQuestions";

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
  isLoading: boolean;
  error?: string;
}

export const CounterfactualViewer: React.FC<CounterfactualViewerProps> = ({
  recordings,
  userId,
  sessionId,
  onCounterfactualSelected,
}) => {
  const [stepData, setStepData] = useState<StepCounterfactuals[]>([]);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [serviceAvailable, setServiceAvailable] = useState<boolean>(true);

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
      isLoading: false,
      error: undefined,
    }));
    setStepData(initialData);
  }, [recordings]);

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
      } else {
        setStepData((prev) =>
          prev.map((step) =>
            step.stepNumber === stepNumber
              ? { ...step, error: result.error, isLoading: false }
              : step
          )
        );
      }
    } catch (error) {
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
      } else {
        setStepData((prev) =>
          prev.map((step) => ({
            ...step,
            error: result.error,
            isLoading: false,
          }))
        );
      }
    } catch (error) {
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
        <button
          onClick={generateAllCounterfactuals}
          disabled={!serviceAvailable}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Generate All Alternatives
        </button>
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
              {stepData[activeStep].counterfactuals.map((cf) => (
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
