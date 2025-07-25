export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStartDate: string; 
  weekEndDate: string;   
  createdAt: Date;
  updatedAt: Date;
  
  responses: {
    idealWeek: string;           
    obstacles: string;           
    preventActions: string;      
    actionDetails: string;       
    ifThenPlans: string;        
  };
  
  isCompleted: boolean;
  
  associatedSessionIds: string[];
}

export interface WeeklyPlanFormData {
  idealWeek: string;
  obstacles: string;
  preventActions: string;
  actionDetails: string;
  ifThenPlans: string;
}