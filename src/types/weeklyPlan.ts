export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  createdAt: Date;
  updatedAt: Date;

  responses: {
    // Original questions (for non-A condition)
    idealWeek?: string;
    obstacles?: string;
    preventActions?: string;
    actionDetails?: string;
    ifThenPlans?: string;

    // New questions (for condition A)
    wish?: string;
    bestOutcome?: string;
    obstacles?: string[];
    overcomePlans?: string[];
  };

  isCompleted: boolean;

  associatedSessionIds: string[];
}

export interface WeeklyPlanFormData {
  // Original questions (for non-A condition)
  idealWeek: string;
  obstacles: string;
  preventActions: string;
  actionDetails: string;
  ifThenPlans: string;

  // New questions (for condition A)
  wish: string;
  bestOutcome: string;
  obstacles: string[];
  overcomePlans: string[];
}
