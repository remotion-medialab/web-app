import React from 'react';
import { format } from 'date-fns';
import type { RecordingSession, Recording } from '../lib/recordingsService';
import { getQuestionForStep } from '../constants/recordingQuestions';

interface SessionDetailViewProps {
  session: RecordingSession;
  selectedRecording?: Recording | null;
  onClose: () => void;
  onRecordingSelect?: (recording: Recording) => void;
}

const SessionDetailView: React.FC<SessionDetailViewProps> = ({ 
  session, 
  selectedRecording, 
  onClose, 
  onRecordingSelect 
}) => {

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "#545454" }}>
            {format(session.completedAt, 'EEEE, MMMM d, yyyy h:mm a')}
          </h2>
          <p className="text-sm" style={{ color: "#b0b0b0" }}>
            Voice entry transcript
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Recordings with questions and transcriptions */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {session.recordings
          .sort((a, b) => a.stepNumber - b.stepNumber)
          .map((recording, idx) => (
            <div 
              key={recording.id} 
              className={`space-y-3 cursor-pointer transition-colors ${
                selectedRecording?.id === recording.id 
                  ? 'bg-blue-100 border-2 border-blue-300' 
                  : 'hover:bg-blue-50'
              }`}
              onClick={() => onRecordingSelect?.(recording)}
              title="Click to view mental model"
            >
              {/* Question with blue circle */}
              <div className="flex items-start gap-3">
                <div 
                  className="w-6 h-6 rounded-full bg-blue-500 flex-shrink-0 mt-1"
                ></div>
                <h3 className="font-medium text-base" style={{ color: "#545454" }}>
                  {recording.question || getQuestionForStep(recording.stepNumber)}
                </h3>
              </div>

              {/* Transcription with rounded border and play button */}
              <div
                className="bg-white border border-gray-200 rounded-2xl p-4 text-sm relative ml-9"
                style={{ color: "#666666" }}
              >
                {recording.transcription?.text ? (
                  <>
                    <p className="whitespace-pre-wrap leading-relaxed">{recording.transcription.text}</p>
                    {recording.transcription.confidence > 0 && (
                      <p className="text-xs mt-2" style={{ color: "#b0b0b0" }}>
                        Confidence: {(recording.transcription.confidence * 100).toFixed(1)}%
                      </p>
                    )}
                  </>
                ) : recording.transcriptionStatus === 'processing' ? (
                  <p className="italic">Transcribing...</p>
                ) : recording.transcriptionStatus === 'failed' ? (
                  <p className="italic text-red-500">Transcription failed</p>
                ) : (
                  <p className="italic">No transcription available</p>
                )}
                
                {/* Play button */}
                {recording.audioUri && (
                  <div className="absolute bottom-3 right-3">
                    <div 
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        const audio = new Audio(recording.audioUri);
                        audio.play().catch(console.error);
                      }}
                    >
                      <svg className="w-4 h-4 text-gray-600 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Activity summary if available */}
              {recording.activitySummary && (
                <p className="text-xs" style={{ color: "#b0b0b0" }}>
                  Activity: {recording.activitySummary.primaryActivity} 
                  ({(recording.activitySummary.confidence * 100).toFixed(0)}% confidence)
                </p>
              )}

            </div>
          ))}
      </div>

      {/* Footer info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs" style={{ color: "#b0b0b0" }}>
          {session.recordings.length} of 5 steps completed • 
          {session.recordings.filter(r => r.transcriptionStatus === 'completed').length} transcribed
        </p>
      </div>

    </>
  );
};

export default SessionDetailView;