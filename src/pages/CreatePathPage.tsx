import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function CreatePathPage() {
  const navigate = useNavigate();

  const [zoom, setZoom] = useState(1);
  const [hoveredDot, setHoveredDot] = useState<{ ringIdx: number; dotIdx: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedDots, setSelectedDots] = useState<(number | null)[]>([null, null, null, null]);
  const [showSummary, setShowSummary] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const dotCounts = [16, 16, 16, 16];

  const getCoordinates = (ringIdx: number, dotIdx: number) => {
    const r = (ringIdx + 1) * 100;
    const angle = (2 * Math.PI * dotIdx) / dotCounts[ringIdx];
    return [500 + r * Math.cos(angle), 500 + r * Math.sin(angle)];
  };

  const handleZoom = (direction: "in" | "out") => {
    setZoom((prev) => Math.max(0.5, Math.min(4, direction === "in" ? prev + 0.4 : prev - 0.4)));
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom((prev) => Math.max(0.5, Math.min(4, prev + delta)));
  };

  const handleSelect = (ringIdx: number, dotIdx: number) => {
    const newSelected = [...selectedDots];
    newSelected[ringIdx] = dotIdx;
    for (let i = ringIdx + 1; i < newSelected.length; i++) newSelected[i] = null;
    setSelectedDots(newSelected);
    setHoveredDot(null);
  };

  if (showSummary) {
    const actualDots = [0, 0, 0, 0];
  
    return (
      <div className="relative flex flex-col items-start justify-center min-h-screen bg-white text-blue-500 px-8">
        <p className="self-start text-left text-blue-500 font-semibold text-sm mb-2">
          Here is a summary of your actual vs new chosen path forward.
        </p>
        <div className="w-full flex justify-between items-center px-12 pt-10">
          {/* ACTUAL PATH */}
          <div className="w-1/2 flex flex-col items-center justify-center text-blue-500">
            <svg viewBox="0 100 1000 1000" className="w-[600px] h-[680px]">
              {[1, 2, 3, 4].map((i) => (
                <circle key={i} cx={500} cy={500} r={i * 100} fill="none" stroke="currentColor" strokeWidth="1" />
              ))}
              {[0, 1, 2, 3].map((level) => {
                const [x1, y1] = level === 0
                  ? [500, 500]
                  : getCoordinates(level - 1, actualDots[level - 1]);
                const [x2, y2] = getCoordinates(level, actualDots[level]);
                return (
                  <line key={`actual-line-${level}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#60a5fa" strokeWidth={2} />
                );
              })}
              {[0, 1, 2, 3].map((level) => {
                const [cx, cy] = getCoordinates(level, actualDots[level]);
                return (
                  <circle
                    key={`actual-dot-${level}`}
                    cx={cx}
                    cy={cy}
                    r={20}
                    fill="#c5d4fb"
                    stroke="#60a5fa"
                    strokeWidth={1.5}
                  />
                );
              })}
              <circle
                cx={500}
                cy={500}
                r={20}
                fill="#c5d4fb"
                stroke="#60a5fa"
                strokeWidth={1.5}
              />

              {["SITUATION", "MODIFICATION", "ATTENTION", "INTERPRETATION", "MODULATION"].map((label, i) => (
              <text
                key={label}
                x={500}
                y={500 - (i + 1) * 100 + 60}
                textAnchor="middle"
                className="text-sm"
                fill="currentColor"
              >
                {label}
              </text>
            ))}
            </svg>
            <div className="relative w-full h-0">
              <div className="absolute -top-28 left-1/2 transform -translate-x-1/2 text-sm font-semibold">
                ACTUAL PATH
              </div>
            </div>
          </div>
  
          {/* NEW PATH */}
          <div className="w-1/2 flex flex-col items-center justify-center text-blue-500">
            <svg viewBox="0 100 1000 1000" className="w-[600px] h-[680px]">
              {[1, 2, 3, 4].map((i) => (
                <circle key={i} cx={500} cy={500} r={i * 100} fill="none" stroke="currentColor" strokeWidth="1" />
              ))}
              {[0, 1, 2, 3].map((level) => {
                if (selectedDots[level] === null) return null;
                const [x1, y1] = level === 0
                  ? [500, 500]
                  : getCoordinates(level - 1, selectedDots[level - 1]!);
                const [x2, y2] = getCoordinates(level, selectedDots[level]!);
                return (
                  <line key={`line-${level}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#60a5fa" strokeWidth={2} />
                );
              })}
              {dotCounts.map((count, ringIdx) =>
                Array.from({ length: count }, (_, dotIdx) => {
                  const [cx, cy] = getCoordinates(ringIdx, dotIdx);
                  const isSelected = selectedDots[ringIdx] === dotIdx;
                  return (
                    <circle
                      key={`dot-${ringIdx}-${dotIdx}`}
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 20 : 7}
                      fill={isSelected ? "#c5d4fb" : "white"}
                      stroke="#60a5fa"
                      strokeWidth={1}
                    />
                  );
                })
              )}
              <circle
                cx={500}
                cy={500}
                r={20}
                fill="#c5d4fb"
                stroke="#60a5fa"
                strokeWidth={1.5}
              />

            {["SITUATION", "MODIFICATION", "ATTENTION", "INTERPRETATION", "MODULATION"].map((label, i) => (
              <text
                key={label}
                x={500}
                y={500 - (i + 1) * 100 + 60}
                textAnchor="middle"
                className="text-sm"
                fill="currentColor"
              >
                {label}
              </text>
            ))}
            </svg>
            <div className="relative w-full h-0">
              <div className="absolute -top-28 left-1/2 transform -translate-x-1/2 text-sm font-semibold">
                NEW PATH
              </div>
            </div>
          </div>
        </div>
        <button
          className="absolute bottom-20 right-8 text-sm px-4 py-2 rounded-full bg-blue-500 text-white"
          onClick={() => {
            // TODO
          }}
        >
          Save path
        </button>
      </div>
    );
  }  

  return (
    <div className="relative flex flex-col items-start justify-center min-h-screen bg-white text-blue-500 px-8">
      <p className="self-start text-left text-blue-500 font-semibold text-sm mb-2">
        Ok, let’s reframe together what you said yesterday evening after work.
      </p>

      <div
        ref={wrapperRef}
        className="relative mx-auto -mt-20"
        onWheel={handleWheelZoom}
        style={{
          transform: `scale(${zoom})`,
          transition: "transform 0.4s ease",
          touchAction: "none",
        }}
      >
        <svg viewBox="0 0 1000 1000" className="w-[680px] h-[800px] text-blue-400">
          {[1, 2, 3, 4].map((i) => (
            <circle
              key={`ring-${i}`}
              cx={500}
              cy={500}
              r={i * 100}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          ))}

          {["SITUATION", "MODIFICATION", "ATTENTION", "INTERPRETATION", "MODULATION"].map((label, i) => (
            <text
              key={label}
              x={500}
              y={500 - (i + 1) * 100 + 60}
              textAnchor="middle"
              className="text-sm"
              fill="currentColor"
            >
              {label}
            </text>
          ))}

          {[0, 1, 2].map((level) => {
            if (selectedDots[level] !== null && selectedDots[level + 1] !== null) {
              const [x1, y1] = getCoordinates(level, selectedDots[level]!);
              const [x2, y2] = getCoordinates(level + 1, selectedDots[level + 1]!);
              return (
                <line key={`line-${level}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#60a5fa" strokeWidth={2} />
              );
            }
            return null;
          })}

          {selectedDots[0] !== null && (() => {
            const [x2, y2] = getCoordinates(0, selectedDots[0]!);
            return <line x1={500} y1={500} x2={x2} y2={y2} stroke="#60a5fa" strokeWidth={2} />;
          })()}

          {dotCounts.map((count, ringIdx) =>
            Array.from({ length: count }, (_, dotIdx) => {
              const [cx, cy] = getCoordinates(ringIdx, dotIdx);
              const isSelected = selectedDots[ringIdx] === dotIdx;
              const isHovering = hoveredDot?.ringIdx === ringIdx && hoveredDot?.dotIdx === dotIdx;

              const interactive =
                (ringIdx === 0) ||
                (ringIdx === 1 && selectedDots[0] !== null) ||
                (ringIdx === 2 && selectedDots[1] !== null) ||
                (ringIdx === 3 && selectedDots[2] !== null);

              return (
                <circle
                  key={`dot-${ringIdx}-${dotIdx}`}
                  cx={cx}
                  cy={cy}
                  r={isSelected || isHovering ? 20 : 7}
                  fill={isSelected ? "#c5d4fb" : "white"}
                  stroke="#60a5fa"
                  strokeWidth={1.5}
                  className="transition-all duration-200 ease-in-out"
                  style={{ cursor: interactive ? "pointer" : "default" }}
                  onMouseEnter={(e) => {
                    if (!interactive) return;
                    const rect = wrapperRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setHoveredDot({ ringIdx, dotIdx });
                    setTooltipPos({
                      x: e.clientX - rect.left + 10,
                      y: e.clientY - rect.top + 10,
                    });
                  }}
                  onMouseMove={(e) => {
                    if (!interactive || !hoveredDot) return;
                    const rect = wrapperRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setTooltipPos({
                      x: e.clientX - rect.left + 10,
                      y: e.clientY - rect.top + 10,
                    });
                  }}
                  onMouseLeave={() => {
                    if (!interactive) return;
                    setHoveredDot(null);
                  }}
                  onClick={() => {
                    if (!interactive) return;
                    handleSelect(ringIdx, dotIdx);
                  }}
                />
              );
            })
          )}

        <circle
        cx={500}
        cy={500}
        r={hoveredDot?.ringIdx === -1 ? 24 : 20}
        fill="#c5d4fb"
        stroke="#60a5fa"
        strokeWidth={1.5}
        className="transition-all duration-200 ease-in-out"
        style={{ cursor: "pointer" }}
        onMouseEnter={(e) => {
            const rect = wrapperRef.current?.getBoundingClientRect();
            if (!rect) return;
            setHoveredDot({ ringIdx: -1, dotIdx: 0 });
            setTooltipPos({
            x: e.clientX - rect.left + 10,
            y: e.clientY - rect.top + 10,
            });
        }}
        onMouseMove={(e) => {
            if (hoveredDot?.ringIdx !== -1) return;
            const rect = wrapperRef.current?.getBoundingClientRect();
            if (!rect) return;
            setTooltipPos({
            x: e.clientX - rect.left + 10,
            y: e.clientY - rect.top + 10,
            });
        }}
        onMouseLeave={() => {
            if (hoveredDot?.ringIdx !== -1) return;
            setHoveredDot(null);
        }}
        onClick={() => {
            setSelectedDots([null, null, null, null]);
            setHoveredDot(null);
        }}
        />
        </svg>

        {hoveredDot && (
          <div
            className="absolute text-sm text-blue-500 bg-white border border-blue-300 rounded-lg shadow-md px-7 py-4 w-[500px] leading-snug"
            style={{
              top: tooltipPos.y,
              left: tooltipPos.x,
              pointerEvents: "none",
              whiteSpace: "normal",
            }}
          >
            {hoveredDot.ringIdx === -1
            ? "You attended a lab meeting and gave PCR optimization presentation despite previous conflicts with Sarah."
            : hoveredDot.ringIdx === 0 && hoveredDot.dotIdx === 15
            ? "Interpret Sarah's comments as personal attacks rather than exploring alternative meanings or intentions."
            : "Placeholder text"}
          </div>
        )}
      </div>

      <div className="absolute bottom-20 left-8 bg-white border rounded-full flex items-center text-blue-500 shadow">
        <button onClick={() => handleZoom("out")} className="px-2 py-1 text-lg font-semibold border-r hover:bg-blue-50">−</button>
        <button onClick={() => handleZoom("in")} className="px-2 py-1 text-lg font-semibold hover:bg-blue-50">+</button>
      </div>

      <button
        className={`absolute bottom-20 right-8 text-sm px-4 py-2 rounded-full ${
          selectedDots[3] !== null
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-400"
        }`}
        disabled={selectedDots[3] === null}
        onClick={() => {
          if (selectedDots[3] !== null) {
            setShowSummary(true);
          }
        }}
      >
        {selectedDots[3] !== null ? "Add path" : "Save path"}
      </button>
    </div>
  );
}
