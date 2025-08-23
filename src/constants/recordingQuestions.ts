export const RECORDING_QUESTIONS: string[] = [
  "What is the situation you engaged in or avoided?",
  "Did you do anything to impact how the situation unfolded, if any?",
  "What emotions did you experience?",
  "What thoughts went through your mind?",
  "How did your body feel during this moment?",
];

export const getQuestionForStep = (
  stepNumber: number,
  condition?: "A" | "B" | "C" | null
): string => {
  console.log(
    `🔍 getQuestionForStep called with stepNumber: ${stepNumber}, condition: ${condition}`
  );

  // For condition A, return different text for the first question
  if (condition === "A" && stepNumber === 0) {
    console.log(
      `✅ Condition A detected for step 0, returning custom question`
    );
    return "Please describe in detail, without naming anyone: what happened, who was involved, when and where it took place, how you felt, and what you tried?";
  }

  console.log(`📝 Using default question for step ${stepNumber}`);
  return RECORDING_QUESTIONS[stepNumber] || `Step ${stepNumber + 1}`;
};
