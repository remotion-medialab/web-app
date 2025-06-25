import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import shareIcon from "../assets/share.svg";

export default function ReflectionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { timestamp } = location.state || {};
  const [showHelp, setShowHelp] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const steps = [
    { label: "SITUATION", desc: "Choosing situations that you expect will lead to desirable emotional outcomes." },
    { label: "MODIFICATION", desc: "Changing aspects of the situation to alter its emotional impact." },
    { label: "ATTENTION", desc: "Shifting your attention within a situation to influence your emotions." },
    { label: "INTERPRETATION", desc: "Changing how you interpret a situation to change its emotional meaning." },
    { label: "MODULATION", desc: "Influencing the expression or experience of the emotion after it arises." },
  ];

  const stageTextMap: Record<string, string> = {
    SITUATION: "You attended a lab meeting and gave PCR optimization presentation despite previous conflicts with Sarah.",
    MODIFICATION: "There were no apparent preparation for potential interruptions or conflict management strategies.",
    ATTENTION: "You focused on Sarah’s interruptions and Dr. Chen’s lack of intervention, amplifying distress.",
    INTERPRETATION: "You interpreted Sarah’s comments as personal attacks rather than exploring alternative meanings or intentions.",
    MODULATION: "You stuttered through presentation, withdrew immediately after, avoided colleagues for remainder of day.",
  };

  const highlightClass = (label: string) =>
    activeStage === label ? "bg-blue-200 text-blue-800" : "bg-blue-100 text-blue-700 opacity-60";

  return (
    <div className="flex flex-col lg:flex-row p-6 gap-8 relative">
      {showHelp && <div className="absolute inset-0 bg-white bg-opacity-80 z-10 pointer-events-none" />}

      {/* Left Panel */}
      <div className={`lg:w-[85%] z-20 ${showHelp ? "opacity-30" : ""}`}>
        <h2 className="text-blue-600 font-semibold text-sm mb-2">
          Here's what you said yesterday evening after work.
        </h2>
        <h1 className="text-2xl font-bold mb-4">{timestamp}</h1>

        <div className="overflow-y-auto pr-2" style={{ maxHeight: "calc(100vh - 300px)" }}>
          <div className="text-gray-800 space-y-4 leading-relaxed">
            <p>
              Had another frustrating interaction with Sarah during
              <span className={`cursor-pointer px-1 rounded ${highlightClass("SITUATION")}`} onClick={() => setActiveStage("SITUATION")}>
                lab meeting
              </span>today. I knew she'd probably be there since she never misses these meetings, but I figured I had to present
              <span className={`cursor-pointer px-1 rounded ${highlightClass("SITUATION")}`} onClick={() => setActiveStage("SITUATION")}>
                my PCR optimization results
              </span>anyway – can't keep avoiding these things forever.
              <span className={`cursor-pointer px-1 rounded ${highlightClass("MODIFICATION")}`} onClick={() => setActiveStage("MODIFICATION")}>
                Maybe I should have asked Dr. Chen if I could present when she wasn't there, but that would have looked weird.
              </span>
            </p>
            <p>
              She interrupted my presentation THREE times to 'correct' minor details that weren't even wrong – just different ways of explaining things. The first time she cut me off, I tried to just keep going, but then she did it again. And again. When I tried to continue after the second interruption, she actually said in front of everyone that my methodology was
              <span className={`cursor-pointer px-1 rounded ${highlightClass("ATTENTION")}`} onClick={() => setActiveStage("ATTENTION")}>
                'amateur at best.'
              </span>I could feel my chest tightening up and I started thinking – here we go again, she's trying to make me look incompetent in front of Dr. Chen.
              <span className={`cursor-pointer px-1 rounded ${highlightClass("ATTENTION")}`} onClick={() => setActiveStage("ATTENTION")}>
                She probably thinks I don't belong in this lab. Everyone must think I'm a fraud now.
              </span>
            </p>
            <p>
              <span className={`cursor-pointer px-1 rounded ${highlightClass("INTERPRETATION")}`} onClick={() => setActiveStage("INTERPRETATION")}>
                Dr. Chen just sat there and let it happen. I kept looking at him hoping he'd step in, but he was just staring at his laptop. Nobody else said anything either – they're probably all thinking Sarah's right.
              </span>
              <span className={`cursor-pointer px-1 rounded ${highlightClass("MODULATION")}`} onClick={() => setActiveStage("MODULATION")}>
                I felt my face getting hot and I know I stuttered through the rest of the presentation. 
              </span>
              My hands were shaking so much I could barely hold my notes. 
              <span className={`cursor-pointer px-1 rounded ${highlightClass("MODULATION")}`} onClick={() => setActiveStage("MODULATION")}>
              I rushed through the last three slides just to get it over with.
              </span>
            </p>
            <p>
              <span className={`cursor-pointer px-1 rounded ${highlightClass("MODULATION")}`} onClick={() => setActiveStage("MODULATION")}>
                After the meeting, I just went straight to my bench and avoided everyone for the rest of the day. When Mike tried to ask me about lunch, I pretended I didn't hear him. I put my headphones on and buried myself in pipetting samples for six hours straight.
              </span>
              <span className={`cursor-pointer px-1 rounded ${highlightClass("INTERPRETATION")}`} onClick={() => setActiveStage("INTERPRETATION")}>
                I'm dreading next week's meeting already. I keep thinking about how I'll have to face everyone again, and Sarah will probably find new ways to undermine me. Maybe I should just email my updates to Dr. Chen from now on.
              </span>
            </p>
          </div>
        </div>

        {/* Audio controls */}
        <div className="mt-6 space-y-2 relative w-full">
          <div className="absolute left-1/2 transform -translate-x-1/2 -top-3 z-10">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow">
              <svg viewBox="0 0 20 20" fill="white" className="w-5 h-5 ml-0.5">
                <path d="M6 4l10 6-10 6V4z" />
              </svg>
            </div>
          </div>
          <div className="absolute right-0 -top-3 z-10">
            <img src={shareIcon} alt="Share" className="w-7 h-7" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 pt-10">
            <span>0:00</span>
            <div className="flex-1 h-2 rounded bg-gray-300 relative overflow-hidden">
              <div className="absolute inset-0">
                <div className="h-2 rounded bg-blue-500 w-1/4" />
              </div>
            </div>
            <span>2:49</span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex justify-center items-center w-full z-20 relative">
        <svg viewBox="0 0 1000 1000" className="w-full max-w-xl h-auto">
          {[1, 2, 3, 4].map((i) => (
            <circle key={i} cx="500" cy="500" r={i * 110} fill="none" stroke="#c5d4fb" strokeWidth="1" />
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
          {[0, 1, 2, 3, 4].map((i) => {
            const isActive = activeStage === steps[i].label;
            return (
              <circle
                key={i}
                cx={500 + i * 110}
                cy="500"
                r="25"
                fill={isActive ? "#60a5fa" : "#c5d4fb"}
                fillOpacity={showHelp ? 0.1 : 1}
                stroke="#60a5fa"
                strokeOpacity={showHelp ? 0.1 : 1}
                strokeWidth="2"
                onClick={() => setActiveStage(steps[i].label)}
                style={{ cursor: "pointer" }}
              />
            );
          })}
          {steps.map((step, i) => (
            <text
              key={step.label}
              x="500"
              y={500 - (i + 1) * 110 + 70}
              textAnchor="middle"
              fontSize="18"
              fill={activeStage === step.label ? "#60a5fa" : showHelp ? "#60a5fa" : "#c5d4fb"}
              fontWeight={activeStage === step.label ? "700" : "400"}
            >
              {step.label}
            </text>
          ))}
          {showHelp &&
            steps.map((step, i) => (
                i < steps.length - 1 && (
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
                )
            ))
            }

            {showHelp &&
            steps.map((step, i) => (
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
            ))
            }

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
        {activeStage && (
        <div
            className={`absolute bottom-1 flex items-center justify-between w-full px-10 transition-opacity duration-300 ${
            showHelp ? "opacity-30" : "opacity-100"
            }`}
        >
            <p className="text-[#60a5fa] text-sm text-left w-[60ch]">
            {stageTextMap[activeStage]}
            </p>
            {activeStage === "MODULATION" && (
            <button onClick={() => navigate("/create-path")} className="ml-4 px-6 py-2 text-sm bg-blue-500 text-white rounded-full shadow hover:bg-blue-600 transition-colors whitespace-nowrap">
                See other paths
            </button>          
            )}
        </div>
        )}
      </div>

      {/* Help Button */}
      <div className="absolute top-4 right-4 z-30 cursor-pointer" onClick={() => setShowHelp((prev) => !prev)}>
        <svg width="50" height="50">
          <circle cx="25" cy="25" r="15" fill="white" stroke="#60a5fa" strokeWidth="1.5" />
          <text x="25" y="28" fontSize="20" fill="#60a5fa" textAnchor="middle" alignmentBaseline="middle">
            {showHelp ? "✕" : "?"}
          </text>
        </svg>
      </div>
    </div>
  );
}
