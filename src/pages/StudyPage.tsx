// src/pages/OverviewPage.tsx

import React, { useState, useEffect } from "react";
import { addDays, startOfWeek, format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import { useRecordings } from "../hooks/useRecordings";
import type { RecordingSession } from "../lib/recordingsService";
import SessionDetailView from "../components/SessionDetailView";
import StickyIcon from "../assets/stickynote.svg";
import NoteAddIcon from "../assets/note-add.svg";
import MentalModelViewer from "../components/MentalModelViewer";
import type { Recording } from "../lib/recordingsService";
import { WeeklyPlanService } from "../lib/weeklyPlanService";
import type { WeeklyPlan, WeeklyPlanFormData } from "../types/weeklyPlan";
import toast from "react-hot-toast";

// day of week headers
const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// prompts for the Weekly Plan textarea fields
const prompts = [
  "This week, how would your ideal week look like?",
  "What are the biggest obstacles that would prevent you from having it that way?",
  "What would you have to do to prevent or overcome those obstacles?",
  "Further expand on these actions. When would it be done? With who? Where?",
  'Write down as many "If-Then" behavior plans (i.e. "If situation X arises, then I will do Y.")',
];

// prompts for the Weekly Plan textarea fields (condition A)
const promptsConditionA = [
  "What is your most important wish or concern in your interpersonal life that you have recurring regrets about and want to change?  Choose something challenging that you are likely to face in the next few days.",
  "If you fulfilled this wish or goal, what would be the best possible outcome?",
  "What is it within you—your habits, reactions, or thoughts—that most holds you back from fulfilling this wish?",
  "List all the actions you could take or thoughts you could use to overcome this obstacle.",
];

// prompts for the Weekly Plan textarea fields (conditions B and C)
const promptsConditionBC = {
  q1: "What is your most important wish or concern in your interpersonal life that you have recurring regrets about and want to change? Choose something challenging that you are likely to face in the next few days.",
  q2: "If you fulfilled this wish or goal, what would be the best possible outcome?",
  q3: "What is it within you that holds you back from fulfilling your wish?",
  q4: "Are there any inner obstacles in how you select or avoid the situation?",
  q5: "Let's write all the actions you can take or thoughts you can think to overcome your obstacles.",
};

const OverviewPage: React.FC = () => {
  // Helper function to create default form data
  const createDefaultFormData = (): WeeklyPlanFormData => ({
    idealWeek: "",
    obstaclesText: "",
    preventActions: "",
    actionDetails: "",
    ifThenPlans: "",
    wish: "",
    bestOutcome: "",
    obstacles: [""], // Start with one empty item for condition A
    overcomePlans: [""], // Start with one empty item for condition A
    outcomes: {
      modified: "",
      focused: "",
      interpreted: "",
      reacted: "",
    },
    obstaclesObj: {
      SituationObstacle: [""],
      ModificationObstacle: [""],
      AttentionObstacle: [""],
      InterpretationObstacle: [""],
      ReactionObstacle: [""],
    },
    overcomePlansObj: {
      SituationPlan: [""],
      ModificationPlan: [""],
      AttentionPlan: [""],
      InterpretationPlan: [""],
      ReactionPlan: [""],
    },
  });

  // Helper function to merge plan responses with default form data
  const mergePlanResponses = (
    responses: WeeklyPlan["responses"]
  ): WeeklyPlanFormData => {
    const defaultData = createDefaultFormData();
    return {
      ...defaultData,
      // Original questions
      idealWeek: responses?.idealWeek || defaultData.idealWeek,
      obstaclesText:
        (responses as WeeklyPlanFormData)?.obstaclesText ||
        defaultData.obstaclesText,
      preventActions: responses?.preventActions || defaultData.preventActions,
      actionDetails: responses?.actionDetails || defaultData.actionDetails,
      ifThenPlans: responses?.ifThenPlans || defaultData.ifThenPlans,

      // Condition A questions
      wish: responses?.wish || defaultData.wish,
      bestOutcome: responses?.bestOutcome || defaultData.bestOutcome,
      obstacles: responses?.obstacles || defaultData.obstacles,
      overcomePlans: responses?.overcomePlans || defaultData.overcomePlans,

      // Conditions B and C questions
      outcomes: {
        modified:
          responses?.outcomes?.modified || defaultData.outcomes.modified,
        focused: responses?.outcomes?.focused || defaultData.outcomes.focused,
        interpreted:
          responses?.outcomes?.interpreted || defaultData.outcomes.interpreted,
        reacted: responses?.outcomes?.reacted || defaultData.outcomes.reacted,
      },
      obstaclesObj: {
        SituationObstacle:
          responses?.obstaclesObj?.SituationObstacle ||
          defaultData.obstaclesObj.SituationObstacle,
        ModificationObstacle:
          responses?.obstaclesObj?.ModificationObstacle ||
          defaultData.obstaclesObj.ModificationObstacle,
        AttentionObstacle:
          responses?.obstaclesObj?.AttentionObstacle ||
          defaultData.obstaclesObj.AttentionObstacle,
        InterpretationObstacle:
          responses?.obstaclesObj?.InterpretationObstacle ||
          defaultData.obstaclesObj.InterpretationObstacle,
        ReactionObstacle:
          responses?.obstaclesObj?.ReactionObstacle ||
          defaultData.obstaclesObj.ReactionObstacle,
      },
      overcomePlansObj: {
        SituationPlan:
          responses?.overcomePlansObj?.SituationPlan ||
          defaultData.overcomePlansObj.SituationPlan,
        ModificationPlan:
          responses?.overcomePlansObj?.ModificationPlan ||
          defaultData.overcomePlansObj.ModificationPlan,
        AttentionPlan:
          responses?.overcomePlansObj?.AttentionPlan ||
          defaultData.overcomePlansObj.AttentionPlan,
        InterpretationPlan:
          responses?.overcomePlansObj?.InterpretationPlan ||
          defaultData.overcomePlansObj.InterpretationPlan,
        ReactionPlan:
          responses?.overcomePlansObj?.ReactionPlan ||
          defaultData.overcomePlansObj.ReactionPlan,
      },
    };
  };

  const [showPlan, setShowPlan] = useState(false); // whether right-side panel is shown
  const [selectedDayRange, setSelectedDayRange] = useState<string | null>(null); // which day range's plan is selected
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
  const [currentDayPlan, setCurrentDayPlan] = useState<WeeklyPlan | null>(null);
  const [dayPlans, setDayPlans] = useState<Map<string, WeeklyPlan>>(new Map());
  const [formData, setFormData] = useState<WeeklyPlanFormData>(
    createDefaultFormData()
  );
  const [isSaving, setIsSaving] = useState(false);

  // Auth and recordings data
  const { userId, loading: authLoading, logout, condition } = useAuth();
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

  const handlePlanButton = (dayRange: string) => {
    if (selectedDayRange === dayRange && showPlan) {
      // If clicking the same day range's button and plan is shown, hide it
      setShowPlan(false);
      setSelectedDayRange(null);
    } else {
      // Show plan for the selected day range
      setSelectedDayRange(dayRange);
      setShowPlan(true);
    }
  };

  const handleSave = async () => {
    if (!userId || selectedDayRange === null) return;

    setIsSaving(true);
    try {
      const savedPlan = await WeeklyPlanService.saveWeeklyPlan(
        userId,
        formData,
        selectedDayRange
      );

      setCurrentDayPlan(savedPlan);

      // Store the plan in our dayPlans map
      setDayPlans((prev) => new Map(prev).set(selectedDayRange, savedPlan));
      console.log("💾 Saved plan for day range:", selectedDayRange, savedPlan);

      toast.success("Behavior plan saved successfully!");
    } catch (error) {
      console.error("Error saving behavior plan:", error);
      toast.error("Failed to save behavior plan. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormChange = (field: keyof WeeklyPlanFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (
    field: "obstacles" | "overcomePlans",
    index: number,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev as WeeklyPlanFormData)[field].map(
        (item: string, i: number) => (i === index ? value : item)
      ),
    }));
  };

  const addArrayItem = (field: "obstacles" | "overcomePlans") => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  // // Handlers for conditions B and C
  // const handleOutcomeChange = (
  //   field: keyof typeof formData.outcomes,
  //   value: string
  // ) => {
  //   setFormData((prev) => ({
  //     ...prev,
  //     outcomes: {
  //       ...prev.outcomes,
  //       [field]: value,
  //     },
  //   }));
  // };

  const handleObstacleChange = (
    obstacleType: keyof typeof formData.obstaclesObj,
    index: number,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      obstaclesObj: {
        ...prev.obstaclesObj,
        [obstacleType]: prev.obstaclesObj[obstacleType].map((item, i) =>
          i === index ? value : item
        ),
      },
    }));
  };

  const addObstacleItem = (
    obstacleType: keyof typeof formData.obstaclesObj
  ) => {
    setFormData((prev) => ({
      ...prev,
      obstaclesObj: {
        ...prev.obstaclesObj,
        [obstacleType]: [...prev.obstaclesObj[obstacleType], ""],
      },
    }));
  };

  const handlePlanChange = (
    planType: keyof typeof formData.overcomePlansObj,
    index: number,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      overcomePlansObj: {
        ...prev.overcomePlansObj,
        [planType]: prev.overcomePlansObj[planType].map((item, i) =>
          i === index ? value : item
        ),
      },
    }));
  };

  const addPlanItem = (planType: keyof typeof formData.overcomePlansObj) => {
    setFormData((prev) => ({
      ...prev,
      overcomePlansObj: {
        ...prev.overcomePlansObj,
        [planType]: [...prev.overcomePlansObj[planType], ""],
      },
    }));
  };

  // Check if a plan exists for a specific day range
  const hasPlanForDayRange = (dayRange: string): boolean => {
    const hasPlan = dayPlans.has(dayRange);
    console.log(`🔍 Checking plan for day range ${dayRange}:`, hasPlan);
    return hasPlan;
  };

  // Load plan for selected day range when showPlan changes
  useEffect(() => {
    const loadSelectedDayPlan = async () => {
      if (!userId || selectedDayRange === null) return;

      try {
        const plan = await WeeklyPlanService.getWeeklyPlan(
          userId,
          selectedDayRange
        );

        if (plan) {
          setCurrentDayPlan(plan);
          setFormData(mergePlanResponses(plan.responses));

          // Store the plan in our dayPlans map
          setDayPlans((prev) => new Map(prev).set(selectedDayRange, plan));
        } else {
          setCurrentDayPlan(null);
          setFormData(createDefaultFormData());
        }
      } catch (error) {
        console.error("Error loading selected day plan:", error);
      }
    };

    if (showPlan && selectedDayRange !== null) {
      loadSelectedDayPlan();
    }
  }, [userId, showPlan, selectedDayRange]);

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
    <div className="min-h-screen h-screen bg-gray-50 p-4 flex justify-center items-stretch">
      {/* Main white card container */}
      <div
        className={`h-full w-full bg-white border rounded-lg p-6 flex overflow-hidden min-h-0 h-[calc(100vh-2rem)] ${
          showPlan || selectedSession || selectedRecording
            ? "flex-row gap-4"
            : "flex-col"
        }`}
      >
        {/* LEFT panel: calendar */}
        <div
          className={`${
            selectedRecording && condition !== "A"
              ? "w-1/3"
              : showPlan || selectedSession
              ? "w-1/2"
              : "w-full"
          } flex flex-col min-h-0 overflow-y-auto`}
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

          <div className="flex-1 flex flex-col mt-4 space-y-8 min-h-0 overflow-y-auto">
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
            <div className="space-y-4">
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
                    requiredSteps={condition === "A" ? 1 : 5}
                    onSessionClick={(session) => {
                      setSelectedSession(session);
                      // Unselect behavior plan when a recording is clicked
                      if (showPlan) {
                        setShowPlan(false);
                        setSelectedDayRange(null);
                      }
                    }}
                  />
                ))}
              </WeekPanel>
            </div>

            {/* Day range buttons in the middle */}
            <div className="flex justify-center gap-4">
              <PlanButton
                onClick={() => handlePlanButton("day0-5")}
                showPlan={showPlan && selectedDayRange === "day0-5"}
                planCreated={hasPlanForDayRange("day0-5")}
                dayRangeLabel="Day 0-5"
              />
              <PlanButton
                onClick={() => handlePlanButton("day6-10")}
                showPlan={showPlan && selectedDayRange === "day6-10"}
                planCreated={hasPlanForDayRange("day6-10")}
                dayRangeLabel="Day 6-10"
              />
              <PlanButton
                onClick={() => handlePlanButton("day11-15")}
                showPlan={showPlan && selectedDayRange === "day11-15"}
                planCreated={hasPlanForDayRange("day11-15")}
                dayRangeLabel="Day 11-15"
              />
            </div>

            {/* BOTTOM WEEK ROW */}
            <div className="space-y-4">
              <WeekPanel>
                {weekDates.map((date, idx) => (
                  <DayBox
                    key={idx + 7}
                    date={addDays(date, 7)}
                    sessions={getSessionsForDate(addDays(date, 7))}
                    requiredSteps={condition === "A" ? 1 : 5}
                    showPlan={showPlan || !!selectedSession}
                    onSessionClick={(session) => {
                      setSelectedSession(session);
                      // Unselect behavior plan when a recording is clicked
                      if (showPlan) {
                        setShowPlan(false);
                        setSelectedDayRange(null);
                      }
                    }}
                  />
                ))}
              </WeekPanel>
            </div>
          </div>
        </div>

        {/* MIDDLE panel: session details or weekly plan form */}
        {(selectedSession || showPlan) && (
          <div
            className={`${
              selectedRecording && condition !== "A" ? "w-1/3" : "w-1/2"
            } bg-white border rounded-lg p-6 flex flex-col overflow-y-auto min-h-0 h-full`}
          >
            {showPlan ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2
                      className="text-lg font-semibold"
                      style={{ color: "#545454" }}
                    >
                      Behavior Plan
                    </h2>
                    <p className="text-sm" style={{ color: "#b0b0b0" }}>
                      Create your behavior plan for {selectedDayRange}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowPlan(false);
                      setSelectedDayRange(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    title="Close behavior plan"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* prompts + textareas */}
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {condition === "A" ? (
                    // Condition A form
                    <>
                      {/* Transition text */}
                      <div className="flex flex-col">
                        <p
                          className="text-sm font-bold sm:mt-10 sm:mb-2"
                          style={{ color: "#545454" }}
                        >
                          What is your overall goal?
                        </p>
                      </div>

                      {/* Q1: Wish */}
                      <div className="flex flex-col">
                        <label
                          className="text-sm font-medium mb-1"
                          style={{ color: "#545454" }}
                        >
                          Q1. {promptsConditionA[0]}
                        </label>
                        <textarea
                          className="border rounded p-2 text-sm"
                          rows={3}
                          style={{ borderColor: "#d4d4d4", color: "#545454" }}
                          value={formData.wish}
                          onChange={(e) =>
                            handleFormChange("wish", e.target.value)
                          }
                          placeholder="Enter your most important wish or concern..."
                        />
                      </div>

                      {/* Q2: Best Outcome */}
                      <div className="flex flex-col">
                        <label
                          className="text-sm font-medium mb-1"
                          style={{ color: "#545454" }}
                        >
                          Q2. {promptsConditionA[1]}
                        </label>
                        <textarea
                          className="border rounded p-2 text-sm"
                          rows={3}
                          style={{ borderColor: "#d4d4d4", color: "#545454" }}
                          value={formData.bestOutcome}
                          onChange={(e) =>
                            handleFormChange("bestOutcome", e.target.value)
                          }
                          placeholder="Describe the best possible outcome..."
                        />
                      </div>

                      {/* Transition text */}
                      <div className="flex flex-col">
                        <p
                          className="text-sm italic sm:mt-10 sm:mb-10"
                          style={{ color: "#545454" }}
                        >
                          Now, <br /> take a moment and imagine the outcome...{" "}
                          <br />
                          Imagine things fully...
                        </p>
                      </div>

                      {/* Transition text */}
                      <div className="flex flex-col">
                        <p
                          className="text-sm font-bold sm:mb-2"
                          style={{ color: "#545454" }}
                        >
                          With your best effort, please identify obstacles as
                          much as you can.
                        </p>
                      </div>

                      {/* Q3: Obstacles */}
                      <div className="flex flex-col">
                        <label
                          className="text-sm font-medium mb-1"
                          style={{ color: "#545454" }}
                        >
                          Q3. {promptsConditionA[2]}
                        </label>
                        <div className="space-y-2">
                          {formData.obstacles.map((obstacle, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <span
                                className="text-sm"
                                style={{ color: "#545454" }}
                              >
                                I want to try differently if
                              </span>
                              <input
                                type="text"
                                className="flex-1 border rounded p-2 text-sm bg-green-50"
                                style={{
                                  borderColor: "#d4d4d4",
                                  color: "#545454",
                                }}
                                value={obstacle}
                                onChange={(e) =>
                                  handleArrayChange(
                                    "obstacles",
                                    idx,
                                    e.target.value
                                  )
                                }
                                placeholder="[anticipated obstacle trigger]"
                              />
                              <span
                                className="text-sm"
                                style={{ color: "#545454" }}
                              >
                                occurs.
                              </span>
                              <button
                                type="button"
                                onClick={() => addArrayItem("obstacles")}
                                className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm"
                              >
                                Add Another
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Transition text */}
                      <div className="flex flex-col">
                        <p
                          className="text-sm italic sm:mt-10 sm:mb-10"
                          style={{ color: "#545454" }}
                        >
                          Now, <br /> take a moment and imagine your
                          obstacles... <br />
                          Imagine things fully...
                        </p>
                      </div>

                      {/* Transition text */}
                      <div className="flex flex-col">
                        <p
                          className="text-sm font-bold  sm:mb-2"
                          style={{ color: "#545454" }}
                        >
                          With your best effort, please plan as much as you can.
                        </p>
                      </div>
                      {/* Q4: Overcome Plans */}
                      <div className="flex flex-col">
                        <label
                          className="text-sm font-medium mb-1"
                          style={{ color: "#545454" }}
                        >
                          Q4. {promptsConditionA[3]}
                        </label>
                        <div className="space-y-2">
                          {formData.overcomePlans.map((plan, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <span
                                className="text-sm"
                                style={{ color: "#545454" }}
                              >
                                If the obstacles occur, then I will
                              </span>
                              <input
                                type="text"
                                className="flex-1 border rounded p-2 text-sm bg-green-50"
                                style={{
                                  borderColor: "#d4d4d4",
                                  color: "#545454",
                                }}
                                value={plan}
                                onChange={(e) =>
                                  handleArrayChange(
                                    "overcomePlans",
                                    idx,
                                    e.target.value
                                  )
                                }
                                placeholder="[specific action or thought]"
                              />
                              <button
                                type="button"
                                onClick={() => addArrayItem("overcomePlans")}
                                className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm"
                              >
                                Add Another
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Transition text */}
                      <div className="flex flex-col">
                        <p
                          className="text-sm italic sm:mt-10 "
                          style={{ color: "#545454" }}
                        ></p>
                      </div>
                    </>
                  ) : condition === "B" || condition === "C" ? (
                    // Conditions B and C form
                    <>
                      {/* Transition text */}
                      <div className="flex flex-col">
                        <p
                          className="text-sm font-bold sm:mt-5"
                          style={{ color: "#545454" }}
                        >
                          What's your Wish or Regret?
                        </p>
                      </div>

                      {/* Q1: Wish */}
                      <div className="flex flex-col">
                        <label
                          className="text-sm font-medium mb-1"
                          style={{ color: "#545454" }}
                        >
                          Q1. {promptsConditionBC.q1}
                        </label>
                        <textarea
                          className="border rounded p-2 text-sm"
                          rows={3}
                          style={{ borderColor: "#d4d4d4", color: "#545454" }}
                          value={formData.wish}
                          onChange={(e) =>
                            handleFormChange("wish", e.target.value)
                          }
                          placeholder="Enter your most important wish or concern..."
                        />
                      </div>

                      {/* Q2: Best Outcome */}
                      <div className="flex flex-col">
                        <label
                          className="text-sm font-medium mb-1"
                          style={{ color: "#545454" }}
                        >
                          Q2. {promptsConditionBC.q2}
                        </label>
                        <textarea
                          className="border rounded p-2 text-sm"
                          rows={3}
                          style={{ borderColor: "#d4d4d4", color: "#545454" }}
                          value={formData.bestOutcome}
                          onChange={(e) =>
                            handleFormChange("bestOutcome", e.target.value)
                          }
                          placeholder="Describe the best possible outcome..."
                        />
                      </div>

                      {/* Transition text */}
                      <div className="flex flex-col">
                        <p
                          className="text-sm italic sm:mt-10 sm:mb-10"
                          style={{ color: "#545454" }}
                        >
                          Now, <br /> take a moment and imagine the outcome...{" "}
                          <br />
                          Imagine things fully...
                        </p>
                      </div>

                      {/* Transition text */}
                      <div className="flex flex-col">
                        <p
                          className="text-sm font-bold "
                          style={{ color: "#545454" }}
                        >
                          With your best effort, please identify obstacles for
                          each stage as much as you can.
                        </p>
                      </div>
                      {/* Q4: Obstacles */}
                      <div className="flex flex-col">
                        <label
                          className="text-sm font-medium mb-1"
                          style={{ color: "#545454" }}
                        >
                          Q4. {promptsConditionBC.q4}
                        </label>
                        <div className="space-y-4">
                          {/* Situation Obstacles */}
                          <div className="space-y-2">
                            {formData.obstaclesObj.SituationObstacle.map(
                              (obstacle, idx) => (
                                <div
                                  key={idx}
                                  className="flex gap-2 items-center"
                                >
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    I want to try differently if
                                  </span>
                                  <input
                                    type="text"
                                    className="flex-1 border rounded p-2 text-sm bg-green-50"
                                    style={{
                                      borderColor: "#d4d4d4",
                                      color: "#545454",
                                    }}
                                    value={obstacle}
                                    onChange={(e) =>
                                      handleObstacleChange(
                                        "SituationObstacle",
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    placeholder="[anticipated obstacle trigger]"
                                  />
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    occurs.
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addObstacleItem("SituationObstacle")
                                    }
                                    className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm"
                                  >
                                    Add Another
                                  </button>
                                </div>
                              )
                            )}
                          </div>

                          {/* Modification Obstacles */}
                          <div className="space-y-2">
                            <h4
                              className="text-sm font-medium"
                              style={{ color: "#545454" }}
                            >
                              Are there any inner obstacles in how you modify
                              the situation?
                            </h4>
                            {formData.obstaclesObj.ModificationObstacle.map(
                              (obstacle, idx) => (
                                <div
                                  key={idx}
                                  className="flex gap-2 items-center"
                                >
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    I want to try differently if
                                  </span>
                                  <input
                                    type="text"
                                    className="flex-1 border rounded p-2 text-sm bg-green-50"
                                    style={{
                                      borderColor: "#d4d4d4",
                                      color: "#545454",
                                    }}
                                    value={obstacle}
                                    onChange={(e) =>
                                      handleObstacleChange(
                                        "ModificationObstacle",
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    placeholder="[anticipated obstacle trigger]"
                                  />
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    occurs.
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addObstacleItem("ModificationObstacle")
                                    }
                                    className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm"
                                  >
                                    Add Another
                                  </button>
                                </div>
                              )
                            )}
                          </div>

                          {/* Attention Obstacles */}
                          <div className="space-y-2">
                            <h4
                              className="text-sm font-medium"
                              style={{ color: "#545454" }}
                            >
                              Are there any inner obstacles in what you focus
                              on?
                            </h4>
                            {formData.obstaclesObj.AttentionObstacle.map(
                              (obstacle, idx) => (
                                <div
                                  key={idx}
                                  className="flex gap-2 items-center"
                                >
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    I want to try differently if
                                  </span>
                                  <input
                                    type="text"
                                    className="flex-1 border rounded p-2 text-sm bg-green-50"
                                    style={{
                                      borderColor: "#d4d4d4",
                                      color: "#545454",
                                    }}
                                    value={obstacle}
                                    onChange={(e) =>
                                      handleObstacleChange(
                                        "AttentionObstacle",
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    placeholder="[anticipated obstacle trigger]"
                                  />
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    occurs.
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addObstacleItem("AttentionObstacle")
                                    }
                                    className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm"
                                  >
                                    Add Another
                                  </button>
                                </div>
                              )
                            )}
                          </div>

                          {/* Interpretation Obstacles */}
                          <div className="space-y-2">
                            <h4
                              className="text-sm font-medium"
                              style={{ color: "#545454" }}
                            >
                              Are there any inner obstacles in how you interpret
                              the situation?
                            </h4>
                            {formData.obstaclesObj.InterpretationObstacle.map(
                              (obstacle, idx) => (
                                <div
                                  key={idx}
                                  className="flex gap-2 items-center"
                                >
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    I want to try differently if
                                  </span>
                                  <input
                                    type="text"
                                    className="flex-1 border rounded p-2 text-sm bg-green-50"
                                    style={{
                                      borderColor: "#d4d4d4",
                                      color: "#545454",
                                    }}
                                    value={obstacle}
                                    onChange={(e) =>
                                      handleObstacleChange(
                                        "InterpretationObstacle",
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    placeholder="[anticipated obstacle trigger]"
                                  />
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    occurs.
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addObstacleItem("InterpretationObstacle")
                                    }
                                    className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm"
                                  >
                                    Add Another
                                  </button>
                                </div>
                              )
                            )}
                          </div>

                          {/* Reaction Obstacles */}
                          <div className="space-y-2">
                            <h4
                              className="text-sm font-medium"
                              style={{ color: "#545454" }}
                            >
                              Are there any inner obstacles in how you react?
                            </h4>
                            {formData.obstaclesObj.ReactionObstacle.map(
                              (obstacle, idx) => (
                                <div
                                  key={idx}
                                  className="flex gap-2 items-center"
                                >
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    I want to try differently if
                                  </span>
                                  <input
                                    type="text"
                                    className="flex-1 border rounded p-2 text-sm bg-green-50"
                                    style={{
                                      borderColor: "#d4d4d4",
                                      color: "#545454",
                                    }}
                                    value={obstacle}
                                    onChange={(e) =>
                                      handleObstacleChange(
                                        "ReactionObstacle",
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    placeholder="[anticipated obstacle trigger]"
                                  />
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    occurs.
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addObstacleItem("ReactionObstacle")
                                    }
                                    className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm"
                                  >
                                    Add Another
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Transition text */}
                      <div className="flex flex-col">
                        <p
                          className="text-sm italic sm:mt-10 sm:mb-10"
                          style={{ color: "#545454" }}
                        >
                          Now, <br /> take a moment and imagine your
                          obstacles... <br />
                          Imagine things fully...
                        </p>
                      </div>

                      {/* Transition text */}
                      <div className="flex flex-col">
                        <p
                          className="text-sm font-bold sm:mt-5"
                          style={{ color: "#545454" }}
                        >
                          With your best effort, please plan for each stage as
                          much as you can.
                        </p>
                      </div>
                      {/* Q5: Overcome Plans */}
                      <div className="flex flex-col">
                        <label
                          className="text-sm font-medium mb-3"
                          style={{ color: "#545454" }}
                        >
                          Q5. {promptsConditionBC.q5}
                        </label>
                        <div className="space-y-4">
                          {/* Situation Plans */}
                          <div className="space-y-2">
                            <h4
                              className="text-sm font-medium"
                              style={{ color: "#545454" }}
                            >
                              Is there a different way you could select or avoid
                              the situation?
                            </h4>
                            {formData.overcomePlansObj.SituationPlan.map(
                              (plan, idx) => (
                                <div
                                  key={idx}
                                  className="flex gap-2 items-center"
                                >
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    If the obstacles occur, then I will
                                  </span>
                                  <input
                                    type="text"
                                    className="flex-1 border rounded p-2 text-sm bg-green-50"
                                    style={{
                                      borderColor: "#d4d4d4",
                                      color: "#545454",
                                    }}
                                    value={plan}
                                    onChange={(e) =>
                                      handlePlanChange(
                                        "SituationPlan",
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    placeholder="[specific action or thought]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addPlanItem("SituationPlan")}
                                    className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm"
                                  >
                                    Add Another
                                  </button>
                                </div>
                              )
                            )}
                          </div>

                          {/* Modification Plans */}
                          <div className="space-y-2">
                            <h4
                              className="text-sm font-medium"
                              style={{ color: "#545454" }}
                            >
                              How can you act differently to modify the
                              situation?
                            </h4>
                            {formData.overcomePlansObj.ModificationPlan.map(
                              (plan, idx) => (
                                <div
                                  key={idx}
                                  className="flex gap-2 items-center"
                                >
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    If the obstacles occur, then I will
                                  </span>
                                  <input
                                    type="text"
                                    className="flex-1 border rounded p-2 text-sm bg-green-50"
                                    style={{
                                      borderColor: "#d4d4d4",
                                      color: "#545454",
                                    }}
                                    value={plan}
                                    onChange={(e) =>
                                      handlePlanChange(
                                        "ModificationPlan",
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    placeholder="[specific action or thought]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addPlanItem("ModificationPlan")
                                    }
                                    className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm"
                                  >
                                    Add Another
                                  </button>
                                </div>
                              )
                            )}
                          </div>

                          {/* Attention Plans */}
                          <div className="space-y-2">
                            <h4
                              className="text-sm font-medium"
                              style={{ color: "#545454" }}
                            >
                              How can you focus differently?
                            </h4>
                            {formData.overcomePlansObj.AttentionPlan.map(
                              (plan, idx) => (
                                <div
                                  key={idx}
                                  className="flex gap-2 items-center"
                                >
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    If the obstacles occur, then I will
                                  </span>
                                  <input
                                    type="text"
                                    className="flex-1 border rounded p-2 text-sm bg-green-50"
                                    style={{
                                      borderColor: "#d4d4d4",
                                      color: "#545454",
                                    }}
                                    value={plan}
                                    onChange={(e) =>
                                      handlePlanChange(
                                        "AttentionPlan",
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    placeholder="[specific action or thought]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addPlanItem("AttentionPlan")}
                                    className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm"
                                  >
                                    Add Another
                                  </button>
                                </div>
                              )
                            )}
                          </div>

                          {/* Interpretation Plans */}
                          <div className="space-y-2">
                            <h4
                              className="text-sm font-medium"
                              style={{ color: "#545454" }}
                            >
                              How can you interpret the situation differently?
                            </h4>
                            {formData.overcomePlansObj.InterpretationPlan.map(
                              (plan, idx) => (
                                <div
                                  key={idx}
                                  className="flex gap-2 items-center"
                                >
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    If the obstacles occur, then I will
                                  </span>
                                  <input
                                    type="text"
                                    className="flex-1 border rounded p-2 text-sm bg-green-50"
                                    style={{
                                      borderColor: "#d4d4d4",
                                      color: "#545454",
                                    }}
                                    value={plan}
                                    onChange={(e) =>
                                      handlePlanChange(
                                        "InterpretationPlan",
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    placeholder="[specific action or thought]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addPlanItem("InterpretationPlan")
                                    }
                                    className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm"
                                  >
                                    Add Another
                                  </button>
                                </div>
                              )
                            )}
                          </div>

                          {/* Reaction Plans */}
                          <div className="space-y-2">
                            <h4
                              className="text-sm font-medium"
                              style={{ color: "#545454" }}
                            >
                              How can you react differently to the situation?
                            </h4>
                            {formData.overcomePlansObj.ReactionPlan.map(
                              (plan, idx) => (
                                <div
                                  key={idx}
                                  className="flex gap-2 items-center"
                                >
                                  <span
                                    className="text-sm"
                                    style={{ color: "#545454" }}
                                  >
                                    If the obstacles occur, then I will
                                  </span>
                                  <input
                                    type="text"
                                    className="flex-1 border rounded p-2 text-sm bg-green-50"
                                    style={{
                                      borderColor: "#d4d4d4",
                                      color: "#545454",
                                    }}
                                    value={plan}
                                    onChange={(e) =>
                                      handlePlanChange(
                                        "ReactionPlan",
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    placeholder="[specific action or thought]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addPlanItem("ReactionPlan")}
                                    className="px-3 py-2 text-blue-500 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50 text-sm"
                                  >
                                    Add Another
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Transition text */}
                      <div className="flex flex-col">
                        <p
                          className="text-sm font-bold  sm:mb-10"
                          style={{ color: "#545454" }}
                        ></p>
                      </div>
                    </>
                  ) : (
                    // Original form (non-A condition)
                    prompts.map((prompt, idx) => {
                      const fieldNames: (keyof WeeklyPlanFormData)[] = [
                        "idealWeek",
                        "obstaclesText",
                        "preventActions",
                        "actionDetails",
                        "ifThenPlans",
                      ];
                      const fieldName = fieldNames[idx];

                      return (
                        <div key={idx} className="flex flex-col">
                          <label
                            className="text-sm font-medium mb-3"
                            style={{ color: "#545454" }}
                          >
                            {prompt}
                          </label>
                          <textarea
                            className="border rounded p-2 text-sm"
                            rows={3}
                            style={{ borderColor: "#d4d4d4", color: "#545454" }}
                            value={formData[fieldName] as string}
                            onChange={(e) =>
                              handleFormChange(fieldName, e.target.value)
                            }
                            placeholder={`Enter your response for: ${prompt}`}
                          />
                        </div>
                      );
                    })
                  )}
                </div>

                {/* save button */}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="mt-6 self-center bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {isSaving
                    ? "Saving..."
                    : currentDayPlan
                    ? "Update Plan"
                    : "Save Plan"}
                </button>
              </>
            ) : selectedSession ? (
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
                selectedQuestionIndex={selectedQuestionIndex}
                onQuestionSelect={setSelectedQuestionIndex}
              />
            ) : null}
          </div>
        )}

        {/* RIGHT panel: Mental Model Viewer */}
        {(selectedRecording || (selectedSession && showMentalModel)) &&
          condition !== "A" && (
            <div className="w-1/3 flex flex-col min-h-0 overflow-y-auto">
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

/* Button component for day ranges */
const PlanButton: React.FC<{
  onClick: () => void;
  showPlan: boolean;
  planCreated: boolean;
  dayRangeLabel?: string;
}> = ({ onClick, showPlan, planCreated, dayRangeLabel }) => (
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
      src={planCreated ? StickyIcon : NoteAddIcon}
      alt="icon"
      className="w-4 h-4 mr-2"
    />
    {planCreated
      ? `Review behavior plan ${dayRangeLabel ? `(${dayRangeLabel})` : ""}`
      : `Create behavior plan ${dayRangeLabel ? `(${dayRangeLabel})` : ""}`}
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
  requiredSteps?: number;
}> = ({
  date,
  sessions,
  isToday = false,
  showPlan = false,
  onSessionClick,
  requiredSteps = 5,
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
      <div className="mt-1 flex-1 flex flex-col gap-3 w-full overflow-y-auto max-h-[160px]">
        {sessions.map((session) => (
          <div
            key={session.sessionId}
            className="flex items-center justify-center border w-full relative group cursor-pointer"
            style={{
              color: "#3b82f6",
              borderColor: session.isComplete ? "#3b82f6" : "#93c5fd",
              backgroundColor: "rgba(59, 130, 246, 0.08)",
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
                session.isComplete ? "bg-blue-500" : "bg-blue-300"
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
                  {session.recordings.length}/{requiredSteps} recordings
                </span>
              </div>
            )}

            {/* Tooltip on hover - positioned relative to the green box */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              {session.recordings.length >= requiredSteps
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
