export const RECORDING_QUESTIONS: string[] = [
  'What is the situation you engaged in or avoided?',
  'Did you do anything to impact how the situation unfolded, if any?',
  'What emotions did you experience?',
  'What thoughts went through your mind?',
  'How did your body feel during this moment?',
];

export const getQuestionForStep = (stepNumber: number): string => {
  return RECORDING_QUESTIONS[stepNumber] || `Step ${stepNumber + 1}`;
};