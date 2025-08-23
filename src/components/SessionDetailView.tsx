import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type {
  RecordingSession,
  Recording,
  CounterfactualData,
} from "../lib/recordingsService";
import { getQuestionForStep } from "../constants/recordingQuestions";
import MentalModelViewer from "./MentalModelViewer";
import { CounterfactualFirebaseService } from "../lib/counterfactualFirebaseService";
import { useAuth } from "../contexts/AuthContext";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { UserAnswersService, type UserAnswer } from "../lib/userAnswersService";

interface SessionDetailViewProps {
  session: RecordingSession;
  selectedRecording?: Recording | null;
  onClose: () => void;
  onRecordingSelect?: (recording: Recording) => void;
  showMentalModel?: boolean;
  selectedQuestionIndex?: number;
  onQuestionSelect?: (index: number) => void;
}

const SessionDetailView: React.FC<SessionDetailViewProps> = ({
  session,
  selectedRecording,
  onClose,
  onRecordingSelect,
  showMentalModel,
  selectedQuestionIndex,
  onQuestionSelect,
}) => {
  const { userId, condition } = useAuth();
  const [recordingCounterfactuals, setRecordingCounterfactuals] = useState<
    Record<string, CounterfactualData>
  >({});
  const [retryingTranscriptions, setRetryingTranscriptions] = useState<
    Set<string>
  >(new Set());

  // For audio playback control
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(
    null
  );

  // User answers functionality
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>(
    {}
  );
  const [newAnswers, setNewAnswers] = useState<Record<string, string[]>>({});
  const [currentInputs, setCurrentInputs] = useState<Record<string, string>>(
    {}
  );
  const [editingExistingAnswers, setEditingExistingAnswers] = useState<
    Record<string, Record<number, string>>
  >({});
  const [savingAnswers, setSavingAnswers] = useState(false);

  // Helper function to render text with bold formatting
  const renderBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        // Remove the ** markers and make it bold
        const boldText = part.slice(2, -2);
        return <strong key={index}>{boldText}</strong>;
      }
      return part;
    });
  };

  // Questions for user answers (in order from top to bottom)
  const userAnswerQuestions = [
    "How could you have **engaged/avoided** differently?",
    "How could you have **impacted** differently?",
    "How could you have **focused** on different elements of the situation?",
    "How could you have **interpreted** differently?",
    "How could you have **reacted** differently?",
  ];

  // Stop all audio on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach((a) => {
        try {
          a.pause();
        } catch (error) {
          console.error("Error pausing audio:", error);
        }
      });
    };
  }, []);

  // Calculate transcription progress
  const transcriptionProgress = React.useMemo(() => {
    const total = session.recordings.length;
    const completed = session.recordings.filter(
      (r) => r.transcriptionStatus === "completed" && r.transcription?.text
    ).length;
    const processing = session.recordings.filter(
      (r) => r.transcriptionStatus === "processing"
    ).length;
    const failed = session.recordings.filter(
      (r) => r.transcriptionStatus === "failed"
    ).length;

    return {
      total,
      completed,
      processing,
      failed,
      isTranscribing: processing > 0,
      percentage: Math.round((completed / total) * 100),
    };
  }, [session.recordings]);

  // Load user answers for all recordings in the session
  useEffect(() => {
    const loadUserAnswers = async () => {
      if (!userId || !session.sessionId) return;

      try {
        // Get all recording IDs from the session
        const recordingIds = session.recordings.map(
          (recording) => recording.id
        );

        // Fetch user answers for all recordings
        const answers = await UserAnswersService.getRecordingsUserAnswers(
          userId,
          session.sessionId,
          recordingIds
        );

        setUserAnswers(answers);
        console.log("✅ Loaded user answers for recordings:", answers);
      } catch (error) {
        console.error("Error loading user answers:", error);
      }
    };

    loadUserAnswers();
  }, [userId, session.sessionId, session.recordings]);

  // Clear all unsaved inputs when session changes
  useEffect(() => {
    setCurrentInputs({});
    setNewAnswers({});
    setEditingExistingAnswers({});
  }, [session.sessionId]);

  // Load counterfactuals for all recordings in the session
  useEffect(() => {
    const loadAllCounterfactuals = async () => {
      if (!userId) return;

      try {
        const counterfactualData: Record<string, CounterfactualData> = {};

        for (const recording of session.recordings) {
          const data = await CounterfactualFirebaseService.getCounterfactuals(
            userId,
            recording.id,
            session.sessionId
          );
          if (data) {
            counterfactualData[recording.id] = data;
          }
        }

        setRecordingCounterfactuals(counterfactualData);
        console.log(
          "📋 Loaded counterfactuals for session:",
          counterfactualData
        );
      } catch (error) {
        console.error("❌ Failed to load session counterfactuals:", error);
      }
    };

    loadAllCounterfactuals();
  }, [userId, session.recordings]);

  const retryTranscription = async (recording: Recording) => {
    if (!userId || retryingTranscriptions.has(recording.id)) return;

    setRetryingTranscriptions((prev) => new Set(prev).add(recording.id));

    try {
      const retryFunction = httpsCallable(functions, "retryTranscription");
      const result = await retryFunction({
        recordingId: recording.id,
      });

      console.log("✅ Transcription retry result:", result.data);

      // Show success message
      toast.success(
        `Transcription retry started for "${recording.title}". Please refresh to see the updated status.`
      );
    } catch (error) {
      console.error("❌ Failed to retry transcription:", error);
      toast.error("Failed to retry transcription. Please try again.");
    } finally {
      setRetryingTranscriptions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(recording.id);
        return newSet;
      });
    }
  };

  const handleAddAnswer = (recordingId: string) => {
    const currentInput = currentInputs[recordingId] || "";
    if (!currentInput.trim()) return;

    // Add the current input to the list of new answers
    setNewAnswers((prev) => ({
      ...prev,
      [recordingId]: [...(prev[recordingId] || []), currentInput.trim()],
    }));

    // Clear the current input
    setCurrentInputs((prev) => ({
      ...prev,
      [recordingId]: "",
    }));
  };

  const handleEditExistingAnswer = (
    recordingId: string,
    answerIndex: number,
    value: string
  ) => {
    setEditingExistingAnswers((prev) => ({
      ...prev,
      [recordingId]: {
        ...(prev[recordingId] || {}),
        [answerIndex]: value,
      },
    }));
  };

  const handleSaveAllAnswers = async () => {
    if (!userId || !session.sessionId) return;

    setSavingAnswers(true);
    try {
      // First, save all new answers for each recording
      for (const [recordingId, answers] of Object.entries(newAnswers)) {
        const validAnswers = answers.filter((answer) => answer.trim() !== "");

        if (validAnswers.length === 0) continue;

        const question =
          userAnswerQuestions[
            session.recordings.find((r) => r.id === recordingId)?.stepNumber ??
              0
          ];

        // Get existing answers for this recording
        const existingAnswers = userAnswers[recordingId]?.answers || [];

        // Combine existing and new answers
        const allAnswers = [...existingAnswers, ...validAnswers];

        // Save all answers for this recording
        const recording = session.recordings.find((r) => r.id === recordingId);
        const stepNumber = recording?.stepNumber ?? 0;

        const savedAnswer = await UserAnswersService.saveUserAnswers(
          userId,
          session.sessionId,
          recordingId,
          stepNumber,
          question,
          allAnswers
        );

        setUserAnswers((prev) => ({
          ...prev,
          [recordingId]: savedAnswer,
        }));
      }

      // Then, save any current inputs that have content
      for (const [recordingId, input] of Object.entries(currentInputs)) {
        if (!input.trim()) continue;

        const question =
          userAnswerQuestions[
            session.recordings.find((r) => r.id === recordingId)?.stepNumber ??
              0
          ];

        // Get existing answers for this recording
        const existingAnswers = userAnswers[recordingId]?.answers || [];

        // Add the current input to existing answers
        const allAnswers = [...existingAnswers, input.trim()];

        // Save all answers for this recording
        const recording = session.recordings.find((r) => r.id === recordingId);
        const stepNumber = recording?.stepNumber ?? 0;

        const savedAnswer = await UserAnswersService.saveUserAnswers(
          userId,
          session.sessionId,
          recordingId,
          stepNumber,
          question,
          allAnswers
        );

        setUserAnswers((prev) => ({
          ...prev,
          [recordingId]: savedAnswer,
        }));
      }

      // Then, save any edited existing answers
      for (const [recordingId, edits] of Object.entries(
        editingExistingAnswers
      )) {
        if (Object.keys(edits).length === 0) continue;

        const question =
          userAnswerQuestions[
            session.recordings.find((r) => r.id === recordingId)?.stepNumber ??
              0
          ];

        // Get existing answers for this recording
        const existingAnswers = userAnswers[recordingId]?.answers || [];

        // Create updated answers array with edited values
        const updatedAnswers = existingAnswers.map((answer, index) => {
          return edits[index] !== undefined ? edits[index] : answer;
        });

        // Save updated answers for this recording
        const recording = session.recordings.find((r) => r.id === recordingId);
        const stepNumber = recording?.stepNumber ?? 0;

        const savedAnswer = await UserAnswersService.saveUserAnswers(
          userId,
          session.sessionId,
          recordingId,
          stepNumber,
          question,
          updatedAnswers
        );

        setUserAnswers((prev) => ({
          ...prev,
          [recordingId]: savedAnswer,
        }));
      }

      // Finally, save all existing answers that haven't been modified (to ensure everything is saved)
      for (const recording of session.recordings) {
        const existingAnswers = userAnswers[recording.id]?.answers || [];
        if (existingAnswers.length > 0) {
          const question =
            userAnswerQuestions[recording.stepNumber] ||
            "How could you have acted differently?";

          // Only save if we haven't already saved this recording in the previous steps
          const hasBeenSaved =
            newAnswers[recording.id]?.length > 0 ||
            currentInputs[recording.id]?.trim() ||
            editingExistingAnswers[recording.id];

          if (!hasBeenSaved) {
            await UserAnswersService.saveUserAnswers(
              userId,
              session.sessionId,
              recording.id,
              recording.stepNumber,
              question,
              existingAnswers
            );
          }
        }
      }

      // Clear all new answers, current inputs, and editing state
      setNewAnswers({});
      setCurrentInputs({});
      setEditingExistingAnswers({});

      toast.success("All answers saved successfully!");
    } catch (error) {
      console.error("Error saving answers:", error);
      toast.error("Failed to save answers. Please try again.");
    } finally {
      setSavingAnswers(false);
    }
  };

  // Function to save current input for a specific recording before navigating
  const saveCurrentInputForRecording = async (recordingId: string) => {
    if (!userId || !session.sessionId) return;

    const currentInput = currentInputs[recordingId];
    if (!currentInput || !currentInput.trim()) return;

    try {
      const question =
        userAnswerQuestions[
          session.recordings.find((r) => r.id === recordingId)?.stepNumber ?? 0
        ];

      // Get existing answers for this recording
      const existingAnswers = userAnswers[recordingId]?.answers || [];

      // Add the current input to existing answers
      const allAnswers = [...existingAnswers, currentInput.trim()];

      // Save all answers for this recording
      const recording = session.recordings.find((r) => r.id === recordingId);
      const stepNumber = recording?.stepNumber ?? 0;

      const savedAnswer = await UserAnswersService.saveUserAnswers(
        userId,
        session.sessionId,
        recordingId,
        stepNumber,
        question,
        allAnswers
      );

      setUserAnswers((prev) => ({
        ...prev,
        [recordingId]: savedAnswer,
      }));

      // Clear the current input for this recording
      setCurrentInputs((prev) => ({
        ...prev,
        [recordingId]: "",
      }));

      console.log("✅ Auto-saved input for recording:", recordingId);
    } catch (error) {
      console.error(
        "Error auto-saving input for recording:",
        recordingId,
        error
      );
      // Don't show toast error for auto-save to avoid interrupting user flow
    }
  };

  const handlePlayToggle = (
    e: React.MouseEvent,
    recordingId: string,
    uri: string
  ) => {
    e.stopPropagation();

    if (!audioRefs.current[recordingId]) {
      const a = new Audio(uri);
      a.addEventListener("ended", () => {
        setCurrentlyPlayingId((prev) => (prev === recordingId ? null : prev));
      });
      audioRefs.current[recordingId] = a;
    }

    const audio = audioRefs.current[recordingId];

    // If clicking the one that's currently playing
    if (currentlyPlayingId === recordingId) {
      if (!audio.paused) {
        audio.pause(); // just pause (no reset)
      } else {
        audio.play().catch(console.error); // resume
      }
      return;
    }

    // If another recording is playing, pause it
    if (currentlyPlayingId && currentlyPlayingId !== recordingId) {
      const prev = audioRefs.current[currentlyPlayingId];
      if (prev) {
        try {
          prev.pause();
        } catch (error) {
          console.error("Error pausing previous audio:", error);
        }
      }
    }

    // Play this one from start
    audio
      .play()
      .then(() => {
        setCurrentlyPlayingId(recordingId);
      })
      .catch(console.error);
  };

  // Hide mental model panel for condition A
  if (showMentalModel && condition !== "A") {
    return (
      <MentalModelViewer
        session={session}
        onClose={onClose}
        selectedQuestionIndex={selectedQuestionIndex}
        onQuestionSelect={onQuestionSelect}
        onRecordingSelect={onRecordingSelect}
      />
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "#545454" }}>
            {format(session.completedAt, "EEEE, MMMM d, yyyy h:mm a")}
          </h2>
          <p className="text-sm" style={{ color: "#b0b0b0" }}>
            Voice entry transcript
          </p>
          {transcriptionProgress.isTranscribing && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-blue-600">
                Transcribing... ({transcriptionProgress.completed} of{" "}
                {transcriptionProgress.total} complete)
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          title="Close transcript view"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Transcription Progress Bar */}
      {transcriptionProgress.isTranscribing && (
        <div className="mb-6 bg-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: "#545454" }}>
              Transcription Progress
            </span>
            <span className="text-sm" style={{ color: "#b0b0b0" }}>
              {transcriptionProgress.completed}/{transcriptionProgress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${transcriptionProgress.percentage}%` }}
            ></div>
          </div>
          <div
            className="flex items-center space-x-4 text-xs"
            style={{ color: "#b0b0b0" }}
          >
            <span>✅ {transcriptionProgress.completed} completed</span>
            {transcriptionProgress.processing > 0 && (
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>{transcriptionProgress.processing} processing</span>
              </span>
            )}
            {transcriptionProgress.failed > 0 && (
              <span>❌ {transcriptionProgress.failed} failed</span>
            )}
          </div>
        </div>
      )}

      {/* Recordings with questions and transcriptions */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {session.recordings
          .sort((a, b) => a.stepNumber - b.stepNumber)
          .map((recording) => (
            <div
              key={recording.id}
              className={`space-y-3 transition-colors cursor-pointer ${
                selectedRecording?.id === recording.id
                  ? "bg-blue-100 border-2 border-blue-300"
                  : "hover:bg-blue-50"
              }`}
              onClick={async () => {
                // If there's a currently selected recording with unsaved input, save it first
                if (
                  selectedRecording &&
                  selectedRecording.id !== recording.id
                ) {
                  await saveCurrentInputForRecording(selectedRecording.id);
                }

                // Clear unsaved inputs for all recordings except the one being clicked
                setCurrentInputs((prev) => {
                  const newInputs: Record<string, string> = {};
                  // Only keep the input for the recording being clicked
                  if (prev[recording.id]) {
                    newInputs[recording.id] = prev[recording.id];
                  }
                  return newInputs;
                });

                setNewAnswers((prev) => {
                  const newAnswers: Record<string, string[]> = {};
                  // Only keep the new answers for the recording being clicked
                  if (prev[recording.id]) {
                    newAnswers[recording.id] = prev[recording.id];
                  }
                  return newAnswers;
                });

                setEditingExistingAnswers((prev) => {
                  const newEditing: Record<string, Record<number, string>> = {};
                  // Only keep the editing state for the recording being clicked
                  if (prev[recording.id]) {
                    newEditing[recording.id] = prev[recording.id];
                  }
                  return newEditing;
                });

                onRecordingSelect?.(recording);
                onQuestionSelect?.(recording.stepNumber);
              }}
              title="Click to view mental model"
            >
              {/* Question with blue circle */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
                <h3
                  className="font-medium text-base"
                  style={{ color: "#545454" }}
                >
                  {recording.question ||
                    getQuestionForStep(recording.stepNumber)}
                </h3>
              </div>

              {/* Transcription with rounded border and play button */}
              <div
                className="bg-white border border-gray-200 rounded-2xl p-4 text-sm relative ml-9"
                style={{ color: "#666666" }}
              >
                {recording.transcription?.text ? (
                  <>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {recording.transcription.text}
                    </p>
                    {recording.transcription.confidence > 0 && (
                      <p className="text-xs mt-2" style={{ color: "#b0b0b0" }}>
                        Confidence:{" "}
                        {(recording.transcription.confidence * 100).toFixed(1)}%
                      </p>
                    )}
                  </>
                ) : recording.transcriptionStatus === "processing" ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="italic text-blue-600">
                      Transcribing audio...
                    </p>
                  </div>
                ) : recording.transcriptionStatus === "failed" ? (
                  <div className="flex items-center justify-between">
                    <p className="italic text-red-500">Transcription failed</p>
                    <button
                      onClick={() => retryTranscription(recording)}
                      disabled={retryingTranscriptions.has(recording.id)}
                      className="ml-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {retryingTranscriptions.has(recording.id)
                        ? "Retrying..."
                        : "Retry"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="italic">No transcription available</p>
                    <button
                      onClick={() => retryTranscription(recording)}
                      disabled={retryingTranscriptions.has(recording.id)}
                      className="ml-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {retryingTranscriptions.has(recording.id)
                        ? "Transcribing..."
                        : "Transcribe"}
                    </button>
                  </div>
                )}

                {/* Play button */}
                {recording.audioUri && (
                  <div className="absolute bottom-3 right-3">
                    <div
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
                      onClick={(e) =>
                        handlePlayToggle(
                          e,
                          recording.id,
                          recording.audioUri as string
                        )
                      }
                      title={
                        currentlyPlayingId === recording.id ? "Pause" : "Play"
                      }
                    >
                      {currentlyPlayingId === recording.id ? (
                        <svg
                          className="w-4 h-4 text-gray-600"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M6 4h3v12H6zM11 4h3v12h-3z" />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-gray-600 ml-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Counterfactual if available */}
              {recordingCounterfactuals[recording.id]?.selectedAlternative && (
                <div className="ml-9 mt-3">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
                    <h4
                      className="font-medium text-base"
                      style={{ color: "#545454" }}
                    >
                      Alternative{" "}
                      {String.fromCharCode(
                        65 +
                          (recordingCounterfactuals[recording.id]
                            ?.selectedAlternative?.index ?? 0)
                      )}
                    </h4>
                  </div>
                  <div
                    className="bg-white border border-gray-200 rounded-2xl p-4 text-sm ml-9"
                    style={{ color: "#666666" }}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {recordingCounterfactuals[recording.id]
                        ?.selectedAlternative?.text ?? ""}
                    </p>

                    {/* Feasibility Rating Display */}
                    {recordingCounterfactuals[recording.id]?.selectedAlternative
                      ?.feasibilityRating && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">
                            Feasibility Rating:
                          </span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <div
                                key={value}
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                                  value <=
                                  (recordingCounterfactuals[recording.id]
                                    ?.selectedAlternative?.feasibilityRating ||
                                    0)
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 text-gray-400"
                                }`}
                              >
                                {value}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            (
                            {
                              recordingCounterfactuals[recording.id]
                                ?.selectedAlternative?.feasibilityRating
                            }
                            /5)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Activity summary if available */}
              {recording.activitySummary && (
                <p className="text-xs ml-9" style={{ color: "#b0b0b0" }}>
                  Activity: {recording.activitySummary.primaryActivity}(
                  {(recording.activitySummary.confidence * 100).toFixed(0)}%
                  confidence)
                </p>
              )}

              {/* User Answer Section */}
              <div className="ml-9 space-y-3">
                {/* User Answer Question */}
                <div className="flex items-start gap-3">
                  <h4
                    className="font-medium text-base"
                    style={{ color: "#545454" }}
                  >
                    {renderBoldText(
                      userAnswerQuestions[recording.stepNumber] ||
                        "How could you have acted differently?"
                    )}
                  </h4>
                </div>

                {/* Existing User Answers */}
                {userAnswers[recording.id]?.answers && (
                  <div className="space-y-2">
                    {userAnswers[recording.id].answers.map((answer, index) => (
                      <textarea
                        key={index}
                        className="w-full border rounded p-2 text-sm bg-white resize-none"
                        rows={3}
                        value={
                          editingExistingAnswers[recording.id]?.[index] !==
                          undefined
                            ? editingExistingAnswers[recording.id][index]
                            : answer
                        }
                        onChange={(e) =>
                          handleEditExistingAnswer(
                            recording.id,
                            index,
                            e.target.value
                          )
                        }
                        style={{
                          borderColor: "#d4d4d4",
                          color: "#545454",
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* New Answers (not yet saved) */}
                {newAnswers[recording.id]?.map((answer, index) => (
                  <textarea
                    key={`new-${index}`}
                    className="w-full border rounded p-2 text-sm bg-white resize-none"
                    rows={3}
                    value={answer}
                    onChange={(e) => {
                      // Update the specific new answer in the array
                      setNewAnswers((prev) => ({
                        ...prev,
                        [recording.id]:
                          prev[recording.id]?.map((a, i) =>
                            i === index ? e.target.value : a
                          ) || [],
                      }));
                    }}
                    style={{
                      borderColor: "#d4d4d4",
                      color: "#545454",
                    }}
                  />
                ))}

                {/* Add New Answer Section - Following behavior plan style */}
                <div className="space-y-2">
                  <div className="flex gap-2 items-start">
                    <textarea
                      className="flex-1 border rounded p-2 text-sm bg-white resize-none"
                      rows={3}
                      placeholder="Enter your answer..."
                      value={currentInputs[recording.id] || ""}
                      onChange={(e) => {
                        setCurrentInputs((prev) => ({
                          ...prev,
                          [recording.id]: e.target.value,
                        }));
                      }}
                      style={{
                        borderColor: "#d4d4d4",
                        color: "#545454",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddAnswer(recording.id)}
                      disabled={!(currentInputs[recording.id] || "").trim()}
                      className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      Add Another
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Save All Answers Button */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-center">
          <button
            onClick={handleSaveAllAnswers}
            disabled={savingAnswers}
            className="px-6 py-3 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {savingAnswers ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving All Answers...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save All Answers
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs" style={{ color: "#b0b0b0" }}>
          {session.recordings.length} of 5 steps completed •
          {
            session.recordings.filter(
              (r) => r.transcriptionStatus === "completed"
            ).length
          }{" "}
          transcribed
        </p>
      </div>
    </>
  );
};

export default SessionDetailView;
