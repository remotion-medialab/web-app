// // src/hooks/useAudioRecorder.ts
// import { useRef, useState } from "react";

// export function useAudioRecorder() {
//   const [recording, setRecording] = useState(false);
//   const [audioURL, setAudioURL] = useState<string | null>(null);
//   const [status, setStatus] = useState("Idle");
//   const mediaRecorder = useRef<MediaRecorder | null>(null);
//   const audioChunks = useRef<Blob[]>([]);

//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       const recorder = new MediaRecorder(stream);
//       audioChunks.current = [];
//       mediaRecorder.current = recorder;

//       recorder.ondataavailable = (event) => {
//         audioChunks.current.push(event.data);
//       };

//       recorder.onstop = () => {
//         const blob = new Blob(audioChunks.current, { type: "audio/webm" });
//         const url = URL.createObjectURL(blob);
//         setAudioURL(url);
//         setRecording(false);
//         setStatus("Stopped");
//       };

//       recorder.start();
//       setRecording(true);
//       setStatus("Recording...");
//     } catch (err) {
//       console.error("Microphone access failed:", err);
//       alert("Microphone access denied or not supported.");
//     }
//   };

//   const stopRecording = () => {
//     mediaRecorder.current?.stop();
//   };

//   const getAudioBlob = () => {
//     return new Blob(audioChunks.current, { type: "audio/webm" });
//   };

//   return {
//     recording,
//     audioURL,
//     status,
//     startRecording,
//     stopRecording,
//     getAudioBlob,
//   };
// }
