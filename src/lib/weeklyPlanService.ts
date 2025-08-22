import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { startOfWeek, endOfWeek, format } from "date-fns";
import type { WeeklyPlan, WeeklyPlanFormData } from "../types/weeklyPlan";

export class WeeklyPlanService {
  // Move plans under user-scoped path
  private static ROOT = "users";

  /**
   * Get the week start and end dates for a given date
   */
  static getWeekBounds(date: Date) {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday

    return {
      weekStartDate: format(weekStart, "yyyy-MM-dd"),
      weekEndDate: format(weekEnd, "yyyy-MM-dd"),
      weekStart,
      weekEnd,
    };
  }

  /**
   * Get the date range string for display
   */
  static getWeekDisplayRange(date: Date = new Date()): string {
    const { weekStart, weekEnd } = this.getWeekBounds(date);
    return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  }

  /**
   * Create or update a behavior plan (overloaded for backward compatibility)
   */
  static async saveWeeklyPlan(
    userId: string,
    formData: WeeklyPlanFormData,
    targetDateOrDayRange: Date | string
  ): Promise<WeeklyPlan> {
    let planId: string;
    let existingPlan: WeeklyPlan | null;

    if (targetDateOrDayRange instanceof Date) {
      // Backward compatibility: handle Date parameter
      const { weekStartDate } = this.getWeekBounds(targetDateOrDayRange);
      planId = `${userId}_${weekStartDate}`;
      existingPlan = await this.getWeeklyPlan(userId, targetDateOrDayRange);
    } else {
      // New functionality: handle day range string
      planId = `${userId}_${targetDateOrDayRange}`;
      existingPlan = await this.getWeeklyPlan(userId, targetDateOrDayRange);
    }

    // Transform formData to match the responses structure
    const responses = {
      // Original questions (for non-A condition)
      // idealWeek: formData.idealWeek,
      // preventActions: formData.preventActions,
      // actionDetails: formData.actionDetails,
      // ifThenPlans: formData.ifThenPlans,

      // Condition A questions
      wish: formData.wish,
      bestOutcome: formData.bestOutcome,
      obstacles: formData.obstacles,
      overcomePlans: formData.overcomePlans,

      // Conditions B and C questions
      outcomes: formData.outcomes,
      obstaclesObj: formData.obstaclesObj,
      overcomePlansObj: formData.overcomePlansObj,
    };

    const planData: WeeklyPlan = {
      id: planId,
      userId,
      weekStartDate:
        targetDateOrDayRange instanceof Date
          ? this.getWeekBounds(targetDateOrDayRange).weekStartDate
          : targetDateOrDayRange,
      weekEndDate:
        targetDateOrDayRange instanceof Date
          ? this.getWeekBounds(targetDateOrDayRange).weekEndDate
          : targetDateOrDayRange,
      createdAt: existingPlan?.createdAt || new Date(),
      updatedAt: new Date(),
      responses,
      isCompleted: true,
      associatedSessionIds: existingPlan?.associatedSessionIds || [],
    };

    const docData = {
      ...planData,
      createdAt: Timestamp.fromDate(planData.createdAt),
      updatedAt: Timestamp.fromDate(planData.updatedAt),
    };

    const docRef = doc(db, this.ROOT, userId, "weeklyPlans", planId);
    await setDoc(docRef, docData);

    console.log("✅ Weekly plan saved to Firestore:", planId);
    return planData;
  }

  /**
   * Get behavior plan for a specific day range or date (overloaded for backward compatibility)
   */
  static async getWeeklyPlan(
    userId: string,
    targetDateOrDayRange: Date | string
  ): Promise<WeeklyPlan | null> {
    let planId: string;

    if (targetDateOrDayRange instanceof Date) {
      // Backward compatibility: handle Date parameter
      const { weekStartDate } = this.getWeekBounds(targetDateOrDayRange);
      planId = `${userId}_${weekStartDate}`;
    } else {
      // New functionality: handle day range string
      planId = `${userId}_${targetDateOrDayRange}`;
    }

    const docRef = doc(db, this.ROOT, userId, "weeklyPlans", planId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as WeeklyPlan;
  }

  /**
   * Get all weekly plans for a user
   */
  static async getUserWeeklyPlans(userId: string): Promise<WeeklyPlan[]> {
    const q = query(
      collection(db, this.ROOT, userId, "weeklyPlans"),
      orderBy("weekStartDate", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as WeeklyPlan;
    });
  }

  /**
   * Check if user has a plan for a specific day range
   */
  static async hasDayRangePlan(
    userId: string,
    dayRange: string
  ): Promise<boolean> {
    const plan = await this.getWeeklyPlan(userId, dayRange);
    return plan !== null && plan.isCompleted;
  }

  /**
   * Check if user has a plan for the current week (backward compatibility)
   */
  static async hasCurrentWeekPlan(userId: string): Promise<boolean> {
    const plan = await this.getWeeklyPlan(userId, new Date());
    return plan !== null && plan.isCompleted;
  }

  /**
   * Associate recording sessions with a weekly plan (backward compatibility)
   */
  static async associateSessionsWithPlan(
    userId: string,
    sessionIds: string[],
    targetDate: Date = new Date()
  ): Promise<void> {
    const { weekStartDate } = this.getWeekBounds(targetDate);
    const planId = `${userId}_${weekStartDate}`;

    const existingPlan = await this.getWeeklyPlan(userId, targetDate);
    if (!existingPlan) {
      return; // No plan to associate with
    }

    const updatedAssociatedSessions = [
      ...new Set([...existingPlan.associatedSessionIds, ...sessionIds]),
    ];

    const docRef = doc(db, this.ROOT, userId, "weeklyPlans", planId);
    await setDoc(
      docRef,
      {
        associatedSessionIds: updatedAssociatedSessions,
        updatedAt: Timestamp.fromDate(new Date()),
      },
      { merge: true }
    );

    console.log("✅ Associated sessions with weekly plan:", planId);
  }
}
