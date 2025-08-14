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
    obstaclesText?: string;
    preventActions?: string;
    actionDetails?: string;
    ifThenPlans?: string;

    // Condition A questions
    wish?: string;
    bestOutcome?: string;
    obstacles?: string[];
    overcomePlans?: string[];

    // Conditions B and C questions
    outcomes?: {
      modified?: string;
      focused?: string;
      interpreted?: string;
      reacted?: string;
    };
    obstaclesObj?: {
      SituationObstacle?: string[];
      ModificationObstacle?: string[];
      AttentionObstacle?: string[];
      InterpretationObstacle?: string[];
      ReactionObstacle?: string[];
    };
    overcomePlansObj?: {
      SituationPlan?: string[];
      ModificationPlan?: string[];
      AttentionPlan?: string[];
      InterpretationPlan?: string[];
      ReactionPlan?: string[];
    };
  };

  isCompleted: boolean;
  associatedSessionIds: string[];
}

export interface WeeklyPlanFormData {
  // Original questions (for non-A condition)
  idealWeek: string;
  obstaclesText: string;
  preventActions: string;
  actionDetails: string;
  ifThenPlans: string;

  // Condition A questions
  wish: string;
  bestOutcome: string;
  obstacles: string[];
  overcomePlans: string[];

  // Conditions B and C questions
  outcomes: {
    modified: string;
    focused: string;
    interpreted: string;
    reacted: string;
  };
  obstaclesObj: {
    SituationObstacle: string[];
    ModificationObstacle: string[];
    AttentionObstacle: string[];
    InterpretationObstacle: string[];
    ReactionObstacle: string[];
  };
  overcomePlansObj: {
    SituationPlan: string[];
    ModificationPlan: string[];
    AttentionPlan: string[];
    InterpretationPlan: string[];
    ReactionPlan: string[];
  };
}
