
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import type { WeeklyPlan, WeeklyPlanFormData } from '../types/weeklyPlan';

export class WeeklyPlanService {
  private static COLLECTION_NAME = 'weeklyPlans';

  /**
   * Get the week start and end dates for a given date
   */
  static getWeekBounds(date: Date) {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
    
    return {
      weekStartDate: format(weekStart, 'yyyy-MM-dd'),
      weekEndDate: format(weekEnd, 'yyyy-MM-dd'),
      weekStart,
      weekEnd
    };
  }

  /**
   * Create or update a weekly plan
   */
  static async saveWeeklyPlan(
    userId: string, 
    formData: WeeklyPlanFormData, 
    targetDate: Date = new Date()
  ): Promise<WeeklyPlan> {
    const { weekStartDate, weekEndDate } = this.getWeekBounds(targetDate);
    const planId = `${userId}_${weekStartDate}`;
    
    // Check if plan already exists
    const existingPlan = await this.getWeeklyPlan(userId, targetDate);
    
    const planData: WeeklyPlan = {
      id: planId,
      userId,
      weekStartDate,
      weekEndDate,
      createdAt: existingPlan?.createdAt || new Date(),
      updatedAt: new Date(),
      responses: formData,
      isCompleted: true,
      associatedSessionIds: existingPlan?.associatedSessionIds || []
    };
    
    const docData = {
      ...planData,
      createdAt: Timestamp.fromDate(planData.createdAt),
      updatedAt: Timestamp.fromDate(planData.updatedAt)
    };
    
    const docRef = doc(db, this.COLLECTION_NAME, planId);
    await setDoc(docRef, docData);
    
    console.log('✅ Weekly plan saved to Firestore:', planId);
    return planData;
  }

  /**
   * Get weekly plan for a specific week
   */
  static async getWeeklyPlan(userId: string, targetDate: Date = new Date()): Promise<WeeklyPlan | null> {
    const { weekStartDate } = this.getWeekBounds(targetDate);
    const planId = `${userId}_${weekStartDate}`;
    
    const docRef = doc(db, this.COLLECTION_NAME, planId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate()
    } as WeeklyPlan;
  }

  /**
   * Get all weekly plans for a user
   */
  static async getUserWeeklyPlans(userId: string): Promise<WeeklyPlan[]> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('weekStartDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as WeeklyPlan;
    });
  }

  /**
   * Check if user has a plan for the current week
   */
  static async hasCurrentWeekPlan(userId: string): Promise<boolean> {
    const plan = await this.getWeeklyPlan(userId, new Date());
    return plan !== null && plan.isCompleted;
  }

  /**
   * Associate recording sessions with a weekly plan
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
      ...new Set([...existingPlan.associatedSessionIds, ...sessionIds])
    ];

    const docRef = doc(db, this.COLLECTION_NAME, planId);
    await setDoc(docRef, {
      ...existingPlan,
      associatedSessionIds: updatedAssociatedSessions,
      updatedAt: Timestamp.fromDate(new Date())
    }, { merge: true });
  }

  /**
   * Get the date range string for display
   */
  static getWeekDisplayRange(date: Date = new Date()): string {
    const { weekStart, weekEnd } = this.getWeekBounds(date);
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  }
}