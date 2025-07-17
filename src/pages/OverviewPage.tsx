// src/pages/OverviewPage.tsx

import React, { useState } from "react";
import { addDays, startOfWeek, format } from "date-fns";

// day of week headers
const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// prompts for the Weekly Plan textarea fields
const prompts = [
  "This week, how would your ideal week look like?",
  "What are the biggest obstacles that would prevent you from having it that way?",
  "What would you have to do to prevent or overcome those obstacles?",
  "Further expand on these actions. When would it be done? With who? Where?",
  'Write down as many "If-Then" behavior plans (i.e. “If situation X arises, then I will do Y.”)',
];

// sample log data: day -> array of timestamps
const logData: Record<number, string[]> = {
  29: ["9:12 AM", "1:46 AM", "5:57 AM"],
  30: ["10:25 AM", "2:03 PM", "5:42 PM"],
  1: ["9:58 AM", "12:44 PM", "4:51 PM"],
  2: ["8:33 AM", "11:47 AM", "5:28 PM"],
  3: ["10:04 AM", "1:55 PM", "5:41 PM"],
  4: ["7:46 AM", "12:01 PM", "3:39 PM"],
  5: ["9:28 AM", "1:12 PM", "5:44 PM"],
  6: ["10:13 PM", "12:57 PM", "4:32 PM"],
  7: ["9:09 AM", "2:11 PM", "5:37 PM"],
  8: ["10:46 AM", "12:40 PM", "4:59 PM"],
  9: ["11:08 AM", "3:14 PM", "5:35 PM"],
};

const OverviewPage: React.FC = () => {
  const [showPlan, setShowPlan] = useState(false);   // whether right-side panel is shown
  const [planCreated, setPlanCreated] = useState(false); // if plan was saved
  const [weekOffset, setWeekOffset] = useState(0);   // current week offset (for arrows)

  const handlePlanButton = () => setShowPlan(!showPlan);
  const handleSave = () => setPlanCreated(true);

  const today = new Date();
  const weekStart = addDays(startOfWeek(addDays(today, weekOffset * 7)), 0);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const displayRange = `${format(weekDates[0], "MMM d")} - ${format(
    weekDates[6],
    "MMM d, yyyy"
  )}`;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Main white card container */}
      <div
        className={`h-full w-full bg-white border rounded-lg p-6 flex ${
          showPlan ? "flex-row gap-4" : "flex-col"
        }`}
      >
        {/* LEFT panel: calendar */}
        <div className={`${showPlan ? "w-1/2" : "w-full"} flex flex-col`}>
          
          {/* header + date range + arrows */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold" style={{ color: "#545454" }}>
                Voice Log Overview
              </h1>
              <p className="text-sm" style={{ color: "#b0b0b0" }}>
                Daily voice entries • {displayRange}
              </p>
            </div>

            {/* navigation arrows */}
            <div className="flex gap-2">
              <button
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="px-2 text-lg"
              >
                &lt;
              </button>
              <button
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="px-2 text-lg"
              >
                &gt;
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col mt-4 space-y-4">
            
            {/* day-of-week headers */}
            <div className="grid grid-cols-7 gap-2">
              {dayHeaders.map((day) => (
                <div
                  key={day}
                  className="text-sm font-medium text-center"
                  style={{ color: "#b0b0b0" }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* TOP WEEK ROW */}
            <WeekPanel>
              {weekDates.slice(0, 7).map((date, idx) => (
                <DayBox
                  key={idx}
                  date={date}
                  logs={logData[idx + 1] || []}
                  isToday={format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")}
                  showPlan={showPlan}
                />
              ))}

              {/* button under top week */}
              <div className="col-span-7 flex justify-center mt-2">
                <PlanButton
                  onClick={handlePlanButton}
                  showPlan={showPlan}
                  planCreated={planCreated}
                />
              </div>
            </WeekPanel>

            {/* BOTTOM WEEK ROW */}
            <WeekPanel>
              {weekDates.map((date, idx) => (
                <DayBox
                  key={idx + 7}
                  date={addDays(date, 7)}
                  logs={logData[idx + 7] || []}
                  showPlan={showPlan}
                />
              ))}
              {/* button under bottom week */}
              <div className="col-span-7 flex justify-center mt-2">
                <PlanButton
                  onClick={handlePlanButton}
                  showPlan={showPlan}
                  planCreated={planCreated}
                />
              </div>
            </WeekPanel>
          </div>
        </div>

        {/* RIGHT panel: weekly plan form */}
        {showPlan && (
          <div className="w-1/2 bg-white border rounded-lg p-6 flex flex-col overflow-y-auto">
            <h2 className="text-lg font-semibold" style={{ color: "#545454" }}>
              Weekly Plan
            </h2>
            <p className="text-sm mb-4" style={{ color: "#b0b0b0" }}>
              Voice entry transcript
            </p>

            {/* prompts + textareas */}
            <div className="flex-1 space-y-4 overflow-y-auto">
              {prompts.map((prompt, idx) => (
                <div key={idx} className="flex flex-col">
                  <label
                    className="text-sm font-medium mb-1"
                    style={{ color: "#545454" }}
                  >
                    {prompt}
                  </label>
                  <textarea
                    className="border rounded p-2 text-sm"
                    rows={3}
                    style={{ borderColor: "#d4d4d4", color: "#545454" }}
                  />
                </div>
              ))}
            </div>

            {/* save button */}
            <button
              onClick={handleSave}
              className="mt-4 self-end bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* Button component under weeks */
const PlanButton: React.FC<{
  onClick: () => void;
  showPlan: boolean;
  planCreated: boolean;
}> = ({ onClick, showPlan, planCreated }) => (
  <button
    onClick={onClick}
    className={`flex items-center px-4 py-2 text-sm border rounded-full transition-colors ${
      showPlan
        ? "bg-blue-500 text-white"
        : "text-gray-400 hover:bg-blue-100 hover:text-blue-500"
    }`}
    style={{
      borderColor: "#d4d4d4",
      borderRadius: "17px",
    }}
  >
    <img
      src={
        planCreated ? "src/assets/stickynote.svg" : "src/assets/note-add.svg"
      }
      alt="icon"
      className="w-4 h-4 mr-2"
    />
    {planCreated ? "Review weekly behavior plan" : "Create weekly behavior plan"}
  </button>
);

/* Panel that holds a week row */
const WeekPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="grid grid-cols-7 gap-4 bg-gray-100 p-4 rounded-[10px] justify-items-center"
    style={{ minHeight: "160px" }}
  >
    {children}
  </div>
);

/* One day box */
const DayBox: React.FC<{
  date: Date;
  logs: string[];
  isToday?: boolean;
  showPlan?: boolean;
}> = ({ date, logs, isToday = false, showPlan = false }) => (
  <div
    className="bg-white rounded-[10px] p-2 flex flex-col items-center w-full min-h-[220px]"
    style={{ color: "#d4d4d4" }}
  >
    {/* day number at the top */}
    <div
      className="text-lg font-medium mt-3"
      style={{ color: isToday ? "#545454" : "#d4d4d4" }}
    >
      {format(date, "d")}
    </div>

    {/* log entries: circles + times */}
    {logs.length > 0 && (
      <div className="mt-1 flex-1 flex flex-col gap-3 justify-center w-full">
        {logs.map((time, idx) => (
          <div
            key={idx}
            className="flex items-center justify-center border w-full"
            style={{
              color: "#b0b0b0",
              borderColor: "#b0b0b0",
              borderRadius: "22px",  // radius of timestamp card
              padding: showPlan ? "10px" : "10px 10px",
            }}
          >
            <span
              className="bg-blue-500 rounded-full"
              style={{
                width: showPlan ? "16px" : "16px",  // circle size
                height: showPlan ? "16px" : "16px",
              }}
            ></span>
            {/* timestamp */}
            {!showPlan && <span className="ml-2 text-sm">{time}</span>}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default OverviewPage;
