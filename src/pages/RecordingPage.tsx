import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

export default function RecordingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { title } = location.state || {};

  const [savedTitle, setSavedTitle] = useState(title || "");
  const [status, setStatus] = useState("Click 'Record' to start");
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      audioChunks.current = [];

      recorder.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };

      recorder.start();
      setRecording(true);
      setStatus("Recording...");
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Microphone permission denied or not available.");
    }
  };

  const handleStop = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
    setStatus("Stopped");
  };

  const handleSave = () => {
    navigate("/reflection", {
      state: { timestamp: savedTitle || "(Untitled Recording)" },
    });
  };

  return (
    <div className="p-8 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-6">New Journal Entry</h1>

      <input
        className="border px-3 py-2 mb-4 w-full rounded text-lg"
        value={savedTitle}
        onChange={(e) => setSavedTitle(e.target.value)}
        placeholder="Enter a title..."
      />

      <div className="flex justify-center gap-4 mb-6">
        {!recording ? (
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={handleStart}
          >
            Record
          </button>
        ) : (
          <button
            className="px-4 py-2 bg-yellow-500 text-white rounded"
            onClick={handleStop}
          >
            Stop
          </button>
        )}
      </div>

      <p className="mb-4 text-gray-600">{status}</p>

      {audioURL && (
        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-2">Preview your recording:</p>
          <audio controls src={audioURL} className="w-full" />
        </div>
      )}

      <button
        className="px-5 py-2 bg-green-600 text-white rounded"
        onClick={handleSave}
      >
        Save Entry
      </button>
    </div>
  );
}
