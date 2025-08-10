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

interface SessionDetailViewProps {
  session: RecordingSession;
  selectedRecording?: Recording | null;
  onClose: () => void;
  onRecordingSelect?: (recording: Recording) => void;
  showMentalModel?: boolean;
  onToggleMentalModel?: () => void;
  selectedQuestionIndex?: number;
  onQuestionSelect?: (index: number) => void;
  showMentalModel?: boolean;
  onToggleMentalModel?: () => void;
  selectedQuestionIndex?: number;
  onQuestionSelect?: (index: number) => void;
}

const SessionDetailView: React.FC<SessionDetailViewProps> = ({
  session,
  selectedRecording,
  onClose,
  onRecordingSelect,
  showMentalModel,
  onToggleMentalModel: _onToggleMentalModel,
  selectedQuestionIndex,
  onQuestionSelect,
const SessionDetailView: React.FC<SessionDetailViewProps> = ({
  session,
  selectedRecording,
  onClose,
  onRecordingSelect,
  showMentalModel,
  onToggleMentalModel: _onToggleMentalModel,
  selectedQuestionIndex,
  onQuestionSelect,
}) => {
  const { userId } = useAuth();
  const [recordingCounterfactuals, setRecordingCounterfactuals] = useState<
    Record<string, CounterfactualData>
  >({});
  const [retryingTranscriptions, setRetryingTranscriptions] = useState<
    Set<string>
  >(new Set());

  // For audio playback control
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  // Stop all audio on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(a => {
        try { a.pause(); } catch {}
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

  // Load counterfactuals for all recordings in the session
  useEffect(() => {
    const loadAllCounterfactuals = async () => {
      if (!userId) return;

      try {
        const counterfactualData: Record<string, CounterfactualData> = {};

        for (const recording of session.recordings) {
          const data = await CounterfactualFirebaseService.getCounterfactuals(
            userId,
            recording.id
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

  const handlePlayToggle = (e: React.MouseEvent, recordingId: string, uri: string) => {
    e.stopPropagation();

    if (!audioRefs.current[recordingId]) {
      const a = new Audio(uri);
      a.addEventListener("ended", () => {
        setCurrentlyPlayingId(prev => (prev === recordingId ? null : prev));
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
        } catch {}
      }
    }

    // Play this one from start
    audio.play().then(() => {
      setCurrentlyPlayingId(recordingId);
    }).catch(console.error);
};



  if (showMentalModel) {
    return (
      <MentalModelViewer
        session={session}
        onClose={onClose}
        selectedQuestionIndex={selectedQuestionIndex}
        onQuestionSelect={onQuestionSelect}
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
          .map((recording) => (
            <div
              key={recording.id}
              className={`space-y-3 cursor-pointer transition-colors ${
                selectedRecording?.id === recording.id
                  ? "bg-blue-100 border-2 border-blue-300"
                  : "hover:bg-blue-50"
                selectedRecording?.id === recording.id
                  ? "bg-blue-100 border-2 border-blue-300"
                  : "hover:bg-blue-50"
              }`}
              onClick={() => {
                onRecordingSelect?.(recording);
                onQuestionSelect?.(recording.stepNumber);
              }}
              onClick={() => {
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
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {recording.transcription.text}
                    </p>
                    {recording.transcription.confidence > 0 && (
                      <p className="text-xs mt-2" style={{ color: "#b0b0b0" }}>
                        Confidence:{" "}
                        {(recording.transcription.confidence * 100).toFixed(1)}%
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
                    onClick={(e) => handlePlayToggle(e, recording.id, recording.audioUri)}
                    title={currentlyPlayingId === recording.id ? "Pause" : "Play"}
                  >
                    {currentlyPlayingId === recording.id ? (
                      <svg className="w-4 h-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6 4h3v12H6zM11 4h3v12h-3z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-600 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
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
                  </div>
                </div>
              )}

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
                  </div>
                </div>
              )}

              {/* Activity summary if available */}
              {recording.activitySummary && (
                <p className="text-xs" style={{ color: "#b0b0b0" }}>
                  Activity: {recording.activitySummary.primaryActivity}(
                  {(recording.activitySummary.confidence * 100).toFixed(0)}%
                  confidence)
                  Activity: {recording.activitySummary.primaryActivity}(
                  {(recording.activitySummary.confidence * 100).toFixed(0)}%
                  confidence)
                </p>
              )}
            </div>
          ))}
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

