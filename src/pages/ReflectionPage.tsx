import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ReflectionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { jid } = location.state || {};
  const [entry, setEntry] = useState("Loading...");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("Untitled");
  const [showHelp, setShowHelp] = useState(false);

  const steps = [
    { label: "SITUATION", desc: "Choosing situations that you expect will lead to desirable emotional outcomes." },
    { label: "MODIFICATION", desc: "Changing aspects of the situation to alter its emotional impact." },
    { label: "ATTENTION", desc: "Shifting your attention within a situation to influence your emotions." },
    { label: "INTERPRETATION", desc: "Changing how you interpret a situation to change its emotional meaning." },
    { label: "MODULATION", desc: "Influencing the expression or experience of the emotion after it arises." },
  ];

  useEffect(() => {
    const fetch = async () => {
      if (!jid) return;
      const docSnap = await getDoc(doc(db, "events", jid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEntry(data.entry || "(empty)");
        if (data.audioUrl) setAudioUrl(data.audioUrl);
        if (data.title) setTitle(data.title);
      } else {
        setEntry("Entry not found.");
      }
    };
    fetch();
  }, [jid]);

  return (
    <div className="flex flex-col lg:flex-row p-6 gap-8 relative">
      {showHelp && (
        <div className="absolute inset-0 bg-white bg-opacity-80 z-10 pointer-events-none" />
      )}

      <div className={`lg:w-2/3 z-20 ${showHelp ? "opacity-30" : ""}`}>
        <h2 className="text-blue-600 font-semibold text-sm mb-2">
          Here's what you said yesterday evening after work.
        </h2>
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <p className="whitespace-pre-wrap leading-relaxed text-gray-800">
          {entry}
        </p>

        {audioUrl && (
          <div className="mt-6">
            <p className="text-sm text-gray-700 mb-1">Your voice journal:</p>
            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button className="px-3 py-1 border rounded bg-blue-500 text-white">▶️</button>
          <button
            className="text-sm text-blue-600 underline"
            onClick={() => navigate("/")}
          >
            ← Back to Calendar
          </button>
        </div>
      </div>

      <div className="flex justify-center items-center w-full z-20 relative">
        <svg viewBox="0 0 1000 1000" className="w-full max-w-xl h-auto">
          {[1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx="500"
              cy="500"
              r={i * 110}
              fill="none"
              stroke="#c5d4fb"
              strokeWidth="1"
            />
          ))}

          <line
            x1="500"
            y1="500"
            x2={500 + 4 * 110}
            y2="500"
            stroke="#60a5fa"
            strokeOpacity={showHelp ? 0 : 1}
            strokeWidth="2"
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={500 + i * 110}
              cy="500"
              r="25"
              fill="#c5d4fb"
              fillOpacity={showHelp ? 0.1 : 1}
              stroke="#60a5fa"
              strokeOpacity={showHelp ? 0.1 : 1}
              strokeWidth="2"
            />
          ))}

          {steps.map((step, i) => (
            <text
              key={step.label}
              x="500"
              y={500 - (i + 1) * 110 + 70}
              textAnchor="middle"
              fontSize="18"
              fill={showHelp ? "#60a5fa" : "#c5d4fb"}
            >
              {step.label}
            </text>
          ))}

          {showHelp &&
            steps.map((step, i) => (
              <>
                {i < steps.length - 1 && (
                  <line
                    key={`arrow-${i}`}
                    x1="500"
                    y1={500 - (i + 1) * 110 + 50}
                    x2="500"
                    y2={500 - (i + 2) * 110 + 85}
                    stroke="#60a5fa"
                    strokeWidth="1.5"
                    markerEnd="url(#arrow-up)"
                  />
                )}
                <text
                  key={`desc-${i}`}
                  x="600"
                  y={500 - (i + 1) * 110 + 40}
                  fontSize="18"
                  fill="#60a5fa"
                >
                  <tspan x="600" dy="1.5em">
                    {step.desc.split(" ").slice(0, 6).join(" ")}
                  </tspan>
                  <tspan x="600" dy="1.5em">
                    {step.desc.split(" ").slice(6).join(" ")}
                  </tspan>
                </text>
              </>
            ))}

          {showHelp && (
            <defs>
              <marker
                id="arrow-up"
                markerWidth="10"
                markerHeight="10"
                refX="5"
                refY="5"
                orient="0"
              >
                <path d="M 0 10 L 5 0 L 10 10 Z" fill="#60a5fa" />
              </marker>
            </defs>
          )}
        </svg>
      </div>

      <div
        className="absolute top-4 right-4 z-30"
        onClick={() => setShowHelp((prev) => !prev)}
        style={{ cursor: "pointer" }}
      >
        <svg width="50" height="50">
          <circle cx="25" cy="25" r="15" fill="white" stroke="#60a5fa" strokeWidth="1.5" />
          <text
            x="25"
            y="28"
            fontSize="20"
            fill="#60a5fa"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {showHelp ? "✕" : "?"}
          </text>
        </svg>
      </div>
    </div>
  );
}
