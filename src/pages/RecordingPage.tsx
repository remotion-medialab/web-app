import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";

export default function RecordingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { id, title, day, startHour } = location.state || {};
  const [savedTitle, setSavedTitle] = useState(title || "");
  const [status, setStatus] = useState("Idle");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!id || !day || startHour === undefined) {
      console.warn("Missing navigation state");
    }
  }, [id, day, startHour]);

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
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
      setStatus("Recording...");
      setRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone permission denied or not supported.");
    }
  };

  const handleStop = () => {
    mediaRecorder?.stop();
    setStatus("Stopped");
    setRecording(false);
  };

  const handleSave = async () => {
    if (!id || !audioURL) return;
  
    try {
      const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
      const storageRef = ref(storage, `recordings/${id}.webm`);
      await uploadBytes(storageRef, audioBlob);
      const downloadURL = await getDownloadURL(storageRef);
  
      await updateDoc(doc(db, "events", id), {
        title: savedTitle,
        entry: "Voice journal recorded.",
        audioUrl: downloadURL,
      });
      console.log("Navigating to reflection with jid:", id);
      navigate("/reflection", {
        state: { jid: id },  
      });
    } catch (err) {
      console.error("Error saving entry:", err);
    }
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
        className={`px-5 py-2 text-white rounded ${
          audioURL ? "bg-green-600" : "bg-gray-400 cursor-not-allowed"
        }`}
        onClick={handleSave}
        disabled={!audioURL}
      >
        Save Entry
      </button>
    </div>
  );
}
