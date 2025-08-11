// src/pages/OverviewPage.tsx

import React, { useState, useEffect } from "react";
import { addDays, startOfWeek, format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import { useRecordings } from "../hooks/useRecordings";
import type { RecordingSession } from "../lib/recordingsService";
import SessionDetailView from "../components/SessionDetailView";
import MentalModelViewer from "../components/MentalModelViewer";
import type { Recording } from "../lib/recordingsService";
import { WeeklyPlanService } from "../lib/weeklyPlanService";
import type { WeeklyPlan, WeeklyPlanFormData } from "../types/weeklyPlan";

// day of week headers
const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// prompts for the Weekly Plan textarea fields
const prompts = [
  {
    main: "What is the overall target scenario you want to improve over the next week? Describe it concretely — where it happens, who’s involved, and what’s currently challenging.",
    subPrompts: [
      "Is this work-related or personal?",
    ],
  },
  {
    main: "In this scenario, what is one obstacle you might face when trying to change the situation to make it easier for yourself?",
    subPrompts: [
      "If you succeed at changing the situation, what will that look like and feel like?",
      "What specifically could get in the way?",
      "Please write in as detailed as possible in format If [obstacle], then [specific action], separate by ;.",
    ],
  },
  {
    main: "In this scenario, what is one obstacle you might face when trying to direct your attention to helpful things?",
    subPrompts: [
      "If you succeed at changing the situation, what will that look like and feel like?",
      "What specifically could get in the way?",
      "Please write in as detailed as possible in format If [obstacle], then [specific action], separate by ;.",
    ],
  },
  {
    main: "What is one obstacle you might face when trying to reframe or reinterpret events in a more helpful way?",
    subPrompts: [
      "If you succeed at changing the situation, what will that look like and feel like?",
      "What specifically could get in the way?",
      "Please write in as detailed as possible in format If [obstacle], then [specific action], separate by ;.",
    ],
  },
  {
    main: "What is one obstacle you might face when trying to regulate your emotional or behavioral response?",
    subPrompts: [
      "If you succeed at changing the situation, what will that look like and feel like?",
      "What specifically could get in the way?",
      "Please write in as detailed as possible in format If [obstacle], then [specific action], separate by ;.",
    ],
  },
];

const OverviewPage: React.FC = () => {
  const [showPlan, setShowPlan] = useState(false); // whether right-side panel is shown
  const [planCreated, setPlanCreated] = useState(false); // if plan was saved
  const [weekOffset, setWeekOffset] = useState(0); // current week offset (for arrows)
  const [selectedSession, setSelectedSession] =
    useState<RecordingSession | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(
    null
  );
  const [showMentalModel, setShowMentalModel] = useState(false);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<
    number | undefined
  >(undefined);
  const [currentWeekPlan, setCurrentWeekPlan] = useState<WeeklyPlan | null>(
    null
  );
  const [formData, setFormData] = useState<Record<string, string>>({});

  // const [formData, setFormData] = useState<WeeklyPlanFormData>({
  //   idealWeek: "",
  //   obstacles: "",
  //   obstacleModification: "",
  //   obstacleAttention: "",
  //   obstacleInterpretation: "",
  //   obstacleReaction: "",
  //   preventActions: "",
  //   actionDetails: "",
  //   ifThenPlans: "",
  // });
  const [isSaving, setIsSaving] = useState(false);

  // Auth and recordings data
  const { userId, loading: authLoading, logout } = useAuth();
  const {
    sessionsByDay,
    loading: recordingsLoading,
    error,
    refetch,
    stats,
  } = useRecordings(userId);

  const getSessionsForDate = (date: Date): RecordingSession[] => {
    const dateKey = date.toISOString().split("T")[0];
    return sessionsByDay[dateKey] || [];
  };

  const handlePlanButton = () => setShowPlan(!showPlan);

  const handleSave = async () => {
    if (!userId) return;

    setIsSaving(true);
    try {
      const currentWeekDate = addDays(today, weekOffset * 7);

      // Prepare the data to save
      const responses = prompts.map((prompt, idx) => ({
        main: formData[`main_${idx}`] || "", // Main prompt response
        subPrompts: prompt.subPrompts.map(
          (_, subIdx) => formData[`sub_${idx}_${subIdx}`] || "" // Sub-prompt responses
        ),
      }));

      // Log the responses to verify structure
      console.log("Saving responses:", responses);
      
      // Save the weekly plan with the responses
      const savedPlan = await WeeklyPlanService.saveWeeklyPlan(
        userId,
        { responses }, // Pass the structured responses
        currentWeekDate
      );

      setCurrentWeekPlan(savedPlan);
      setPlanCreated(true);
      alert("Weekly behavior plan saved successfully!");
    } catch (error) {
      console.error("Error saving weekly plan:", error);
      alert("Failed to save weekly plan. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };


  // WHEN NO SUBPROMPTS ARE USED
  // const handleSave = async () => {
  //   if (!userId) return;

  //   setIsSaving(true);
  //   try {
  //     const currentWeekDate = addDays(today, weekOffset * 7);
  //     const savedPlan = await WeeklyPlanService.saveWeeklyPlan(
  //       userId,
  //       formData,
  //       currentWeekDate
  //     );

  //     // Associate current week's sessions with the plan
  //     const currentWeekSessions = getCurrentWeekSessions();
  //     const sessionIds = currentWeekSessions.map((s) => s.sessionId);
  //     if (sessionIds.length > 0) {
  //       await WeeklyPlanService.associateSessionsWithPlan(
  //         userId,
  //         sessionIds,
  //         currentWeekDate
  //       );
  //     }

  //     setCurrentWeekPlan(savedPlan);
  //     setPlanCreated(true);
  //     alert("Weekly behavior plan saved successfully!");
  //   } catch (error) {
  //     console.error("Error saving weekly plan:", error);
  //     alert("Failed to save weekly plan. Please try again.");
  //   } finally {
  //     setIsSaving(false);
  //   }
  // };

  // WHEN NO SUBPROMPTS ARE USED
  // const handleFormChange = (field: keyof WeeklyPlanFormData, value: string) => {
  //   setFormData((prev) => ({ ...prev, [field]: value }));
  // };

  const handleFormChange = (field: string, value: string) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getCurrentWeekSessions = (): RecordingSession[] => {
    const currentWeekDates = weekDates;
    const allSessionsThisWeek: RecordingSession[] = [];

    currentWeekDates.forEach((date) => {
      const sessionsForDate = getSessionsForDate(date);
      allSessionsThisWeek.push(...sessionsForDate);
    });

    return allSessionsThisWeek;
  };

  // Load current week plan on component mount and when week changes
  useEffect(() => {
    const loadCurrentWeekPlan = async () => {
      if (!userId) return;

      try {
        const currentWeekDate = addDays(today, weekOffset * 7);
        const plan = await WeeklyPlanService.getWeeklyPlan(
          userId,
          currentWeekDate
        );

        if (plan) {
          setCurrentWeekPlan(plan);
          setPlanCreated(true);
          setFormData(plan.responses);
        } else {
          setCurrentWeekPlan(null);
          setPlanCreated(false);
          setFormData({
            idealWeek: "",
            obstacles: "",
            preventActions: "",
            actionDetails: "",
            ifThenPlans: "",
          });
        }
      } catch (error) {
        console.error("Error loading weekly plan:", error);
      }
    };

    loadCurrentWeekPlan();
  }, [userId, weekOffset]);

  const today = new Date();
  const weekStart = addDays(startOfWeek(addDays(today, weekOffset * 7)), 0);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const displayRange = `${format(weekDates[0], "MMM d")} - ${format(
    weekDates[6],
    "MMM d, yyyy"
  )}`;

  // Show loading or authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex justify-center items-center">
      {/* Main white card container */}
      <div
        className={`h-full w-full bg-white border rounded-lg p-6 flex ${
          showPlan || selectedSession || selectedRecording
            ? "flex-row gap-4"
            : "flex-col"
        }`}
      >
        {/* LEFT panel: calendar */}
        <div
          className={`${
            selectedRecording
              ? "w-1/3"
              : showPlan || selectedSession
              ? "w-1/2"
              : "w-full"
          } flex flex-col`}
        >
          {/* header + date range + arrows */}
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h1
                  className="text-xl font-semibold"
                  style={{ color: "#545454" }}
                >
                  Voice Log Overview
                </h1>
                {recordingsLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                )}
                {error && (
                  <button
                    onClick={refetch}
                    className="text-red-500 hover:text-red-600 text-sm"
                    title="Click to retry"
                  >
                    ⚠️ Error
                  </button>
                )}
              </div>
              <p className="text-sm" style={{ color: "#b0b0b0" }}>
                Daily voice entries • {displayRange}
                {stats && (
                  <span className="ml-2">
                    • {stats.totalSessions} sessions • {stats.totalRecordings}{" "}
                    recordings
                  </span>
                )}
                <br />
                <span className="text-xs opacity-75">User ID: {userId}</span>
                <br />
              </p>
            </div>

            {/* navigation arrows + logout */}
            <div className="flex gap-2 items-center">
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
              <span className="mx-2 text-gray-300">|</span>
              <button
                onClick={logout}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                title="Sign out"
                style={{ borderColor: "#d4d4d4", color: "#545454" }}
              >
                Logout
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
                  sessions={getSessionsForDate(date)}
                  isToday={
                    format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
                  }
                  showPlan={showPlan || !!selectedSession}
                  onSessionClick={setSelectedSession}
                />
              ))}

              {/* button under top week */}
              <div className="col-span-7 flex justify-center mt-2">
                <PlanButton
                  onClick={handlePlanButton}
                  showPlan={showPlan}
                  planCreated={planCreated}
                  weekLabel={WeeklyPlanService.getWeekDisplayRange(
                    addDays(today, weekOffset * 7)
                  )}
                />
              </div>
            </WeekPanel>

            {/* BOTTOM WEEK ROW */}
            <WeekPanel>
              {weekDates.map((date, idx) => (
                <DayBox
                  key={idx + 7}
                  date={addDays(date, 7)}
                  sessions={getSessionsForDate(addDays(date, 7))}
                  showPlan={showPlan || !!selectedSession}
                  onSessionClick={setSelectedSession}
                />
              ))}
              {/* button under bottom week */}
              <div className="col-span-7 flex justify-center mt-2">
                <PlanButton
                  onClick={handlePlanButton}
                  showPlan={showPlan}
                  planCreated={planCreated}
                  weekLabel={WeeklyPlanService.getWeekDisplayRange(
                    addDays(today, weekOffset * 7)
                  )}
                />
              </div>
            </WeekPanel>
          </div>
        </div>

        {/* MIDDLE panel: session details or weekly plan form */}
        {(selectedSession || showPlan) && (
          <div
            className={`${
              selectedRecording ? "w-1/3" : "w-1/2"
            } bg-white border rounded-lg p-6 flex flex-col overflow-y-auto`}
          >
            {selectedSession ? (
              <SessionDetailView
                session={selectedSession}
                selectedRecording={selectedRecording}
                onClose={() => {
                  setSelectedSession(null);
                  setSelectedRecording(null);
                  setShowMentalModel(false);
                  setSelectedQuestionIndex(undefined);
                }}
                onRecordingSelect={setSelectedRecording}
                showMentalModel={showMentalModel}
                onToggleMentalModel={() => setShowMentalModel(!showMentalModel)}
                selectedQuestionIndex={selectedQuestionIndex}
                onQuestionSelect={setSelectedQuestionIndex}
              />
            ) : (
              <>
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "#545454" }}
                >
                  Weekly Plan
                </h2>
                <p className="text-sm mb-4" style={{ color: "#b0b0b0" }}>
                  Voice entry transcript
                </p>

                {/* prompts + textareas */}
                <div className="flex-1 space-y-6 overflow-y-auto">
                  {prompts.map((prompt, idx) => (
                    <div key={idx} className="flex flex-col space-y-4">
                      {/* Main Prompt */}
                      <div>
                        <label
                          className="text-sm font-medium mb-1"
                          style={{ color: "#545454" }}
                        >
                          {prompt.main}
                        </label>
                        <textarea
                          className="border rounded p-2 text-sm w-full"
                          rows={3}
                          style={{ borderColor: "#d4d4d4", color: "#545454" }}
                          value={formData[`main_${idx}`] || ""}
                          onChange={(e) =>
                            handleFormChange(`main_${idx}` as keyof WeeklyPlanFormData, e.target.value)
                          }
                          placeholder="Enter your response to the main question"
                        />
                      </div>

                      {/* Sub-Prompts */}
                      {prompt.subPrompts.map((subPrompt, subIdx) => (
                        <div key={subIdx} className="ml-4">
                          <label
                            className="text-sm font-medium mb-1"
                            style={{ color: "#545454" }}
                          >
                            {subPrompt}
                          </label>
                          <textarea
                            className="border rounded p-2 text-sm w-full"
                            rows={2}
                            style={{ borderColor: "#d4d4d4", color: "#545454" }}
                            value={formData[`sub_${idx}_${subIdx}`] || ""}
                            onChange={(e) =>
                              handleFormChange(`sub_${idx}_${subIdx}` as keyof WeeklyPlanFormData, e.target.value)
                            }
                            placeholder="Enter your response to the sub-question"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* prompts + textareas FOR NO SUBPROMPTS
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {prompts.map((prompt, idx) => {
                    const fieldNames: (keyof WeeklyPlanFormData)[] = [
                      "idealWeek",
                      "obstacles",
                      "obstacleModification"
                      "obstacleInterpretation"
                      "obstacleAttention",
                      "obstacleReaction"
                      "preventActions",
                      "actionDetails",
                      "ifThenPlans",
                    ];
                    const fieldName = fieldNames[idx];

                    return (
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
                          value={formData[fieldName]}
                          onChange={(e) =>
                            handleFormChange(fieldName, e.target.value)
                          }
                          placeholder={`Enter your response for: ${prompt}`}
                        />
                      </div>
                    );
                  })}
                </div> */}

                {/* save button */}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="mt-4 self-end bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {isSaving
                    ? "Saving..."
                    : currentWeekPlan
                    ? "Update Plan"
                    : "Save Plan"}
                </button>
              </>
            )}
          </div>
        )}

        {/* RIGHT panel: Mental Model Viewer */}
        {(selectedRecording || (selectedSession && showMentalModel)) && (
          <div className="w-1/3 flex flex-col">
            <MentalModelViewer
              session={selectedSession!}
              onClose={() => {
                setSelectedRecording(null);
                setShowMentalModel(false);
                setSelectedQuestionIndex(undefined);
              }}
              selectedQuestionIndex={selectedQuestionIndex}
              onQuestionSelect={setSelectedQuestionIndex}
              onRecordingSelect={setSelectedRecording}
            />
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
  weekLabel?: string;
}> = ({ onClick, showPlan, planCreated, weekLabel }) => (
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
    {planCreated
      ? `Review weekly behavior plan ${weekLabel ? `(${weekLabel})` : ""}`
      : `Create weekly behavior plan ${weekLabel ? `(${weekLabel})` : ""}`}
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
  sessions: RecordingSession[];
  isToday?: boolean;
  showPlan?: boolean;
  onSessionClick?: (session: RecordingSession) => void;
}> = ({
  date,
  sessions,
  isToday = false,
  showPlan = false,
  onSessionClick,
}) => (
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

    {/* recording sessions: blue circles + completion times */}
    {sessions.length > 0 && (
      <div className="mt-1 flex-1 flex flex-col gap-3 justify-center w-full">
        {sessions.map((session, _) => (
          <div
            key={session.sessionId}
            className="flex items-center justify-center border w-full relative group cursor-pointer"
            style={{
              color: "#b0b0b0",
              borderColor: session.isComplete ? "#4CAF50" : "#b0b0b0",
              borderRadius: "22px",
              padding: showPlan ? "10px" : "10px 10px",
            }}
            title={`${session.recordings.length} recordings${
              session.isComplete ? " (Complete 5-step session)" : ""
            }`}
            onClick={() => onSessionClick?.(session)}
          >
            <span
              className={`rounded-full ${
                session.isComplete ? "bg-blue-500" : "bg-gray-400"
              }`}
              style={{
                width: showPlan ? "16px" : "16px",
                height: showPlan ? "16px" : "16px",
              }}
            ></span>
            {/* completion time and recording count */}
            {!showPlan && (
              <div className="ml-2 text-sm flex flex-col items-start">
                <span>{format(session.completedAt, "h:mm a")}</span>
                <span className="text-xs opacity-75">
                  {session.recordings.length}/5 recordings
                </span>
              </div>
            )}

            {/* Tooltip on hover - positioned relative to the green box */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              {session.isComplete
                ? "✅ Complete session"
                : "⏳ Partial session"}
              <br />
              {session.recordings.length} recordings
              {session.recordings.some(
                (r) => r.transcriptionStatus === "completed"
              ) && (
                <>
                  <br />
                  📝 Transcribed
                </>
              )}
              {/* Arrow pointing down to the green box */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default OverviewPage;
