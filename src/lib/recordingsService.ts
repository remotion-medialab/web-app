// src/lib/recordingsService.ts
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface CounterfactualData {
  alternatives: string[]; // Array of 5 generated alternatives
  selectedAlternative?: {
    index: number; // 0-4 corresponding to alternatives array
    text: string;
    selectedAt: Date;
  };
  generatedAt: Date;
  questionIndex: number; // Which question (0-4) this relates to
}

export interface Recording {
  id: string;
  userId: string;
  title: string;
  duration: number;
  stepNumber: number;
  question?: string;
  createdAt: Date;
  audioUri?: string;
  fileUrl?: string;
  transcription?: {
    text: string;
    confidence: number;
    transcribedAt: Date;
    service: string;
  };
  transcriptionText?: string;
  transcriptionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  activitySummary?: {
    primaryActivity: string;
    confidence: number;
  };
  counterfactuals?: CounterfactualData; // New field for counterfactuals
}

export interface RecordingSession {
  sessionId: string;
  recordings: Recording[];
  completedAt: Date;
  isComplete: boolean; 
}

export class RecordingsService {
  /**
   * Fetch all recordings for a user and group them into 5-step sessions
   */
  static async getUserRecordingSessions(userId: string): Promise<RecordingSession[]> {
    try {
      console.log('🔍 Fetching recordings for user:', userId);
      
      // Get all recordings for the user, ordered by creation date
      const recordingsRef = collection(db, 'recordings', userId, 'sessions');
      
      // First try without orderBy to see if documents exist
      let snapshot = await getDocs(recordingsRef);
      
      // If documents exist, try with orderBy
      if (!snapshot.empty) {
        try {
          const q = query(recordingsRef, orderBy('createdAt', 'desc'));
          snapshot = await getDocs(q);
        } catch (orderError) {
          console.warn('⚠️ OrderBy failed, using unordered results:', orderError);
          // Keep using the unordered snapshot
        }
      }
      
      if (snapshot.empty) {
        return [];
      }
      
      // Convert to Recording objects
      const recordings: Recording[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || userId,
          title: data.title || 'Untitled Recording',
          duration: data.duration || 0,
          stepNumber: data.stepNumber || 1,
          question: data.question,
          createdAt: data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate() 
            : new Date(data.createdAt || Date.now()),
          audioUri: data.audioUri,
          fileUrl: data.fileUrl,
          transcription: data.transcription ? {
            text: data.transcription.text || '',
            confidence: data.transcription.confidence || 0,
            transcribedAt: data.transcription.transcribedAt instanceof Timestamp
              ? data.transcription.transcribedAt.toDate()
              : new Date(data.transcription.transcribedAt || Date.now()),
            service: data.transcription.service || 'unknown'
          } : undefined,
          transcriptionText: data.transcriptionText,
          transcriptionStatus: data.transcriptionStatus || 'pending',
          activitySummary: data.activitySummary ? {
            primaryActivity: data.activitySummary.primaryActivity || 'unknown',
            confidence: data.activitySummary.confidence || 0
          } : undefined,
          counterfactuals: data.counterfactuals ? {
            alternatives: data.counterfactuals.alternatives || [],
            selectedAlternative: data.counterfactuals.selectedAlternative ? {
              index: data.counterfactuals.selectedAlternative.index || 0,
              text: data.counterfactuals.selectedAlternative.text || '',
              selectedAt: data.counterfactuals.selectedAlternative.selectedAt instanceof Timestamp
                ? data.counterfactuals.selectedAlternative.selectedAt.toDate()
                : new Date(data.counterfactuals.selectedAlternative.selectedAt || Date.now()),
            } : undefined,
            generatedAt: data.counterfactuals.generatedAt instanceof Timestamp
              ? data.counterfactuals.generatedAt.toDate()
              : new Date(data.counterfactuals.generatedAt || Date.now()),
            questionIndex: data.counterfactuals.questionIndex || 0,
          } : undefined
        };
      });
      
      // Group recordings into 5-step sessions
      const sessions = this.groupRecordingsIntoSessions(recordings);
      
      return sessions;
      
    } catch (error) {
      console.error('❌ Error fetching user recordings:', error);
      return [];
    }
  }
  
  /**
   * Group recordings into sessions based on proximity and step numbers
   */
  private static groupRecordingsIntoSessions(recordings: Recording[]): RecordingSession[] {
    const sessions: RecordingSession[] = [];
    
    // Sort recordings by creation date (newest first)
    const sortedRecordings = [...recordings].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    // Group by time proximity (recordings within 1 hour of each other)
    let currentSession: Recording[] = [];
    let lastRecordingTime: Date | null = null;
    
    for (const recording of sortedRecordings) {
      const recordingTime = recording.createdAt;
      
      // If this is the first recording or it's within 1 hour of the last one
      if (!lastRecordingTime || 
          (lastRecordingTime.getTime() - recordingTime.getTime()) <= 60 * 60 * 1000) {
        
        currentSession.push(recording);
        lastRecordingTime = recordingTime;
        
        // If we have 5 recordings, complete this session
        if (currentSession.length === 5) {
          sessions.push(this.createSession(currentSession));
          currentSession = [];
          lastRecordingTime = null;
        }
        
      } else {
        // Time gap too large, start new session
        if (currentSession.length > 0) {
          sessions.push(this.createSession(currentSession));
        }
        currentSession = [recording];
        lastRecordingTime = recordingTime;
      }
    }
    
    // Add any remaining recordings as a session
    if (currentSession.length > 0) {
      sessions.push(this.createSession(currentSession));
    }
    
    return sessions;
  }
  
  /**
   * Create a session object from recordings
   */
  private static createSession(recordings: Recording[]): RecordingSession {
    // Sort recordings by step number for consistent ordering
    const sortedByStep = [...recordings].sort((a, b) => a.stepNumber - b.stepNumber);
    
    // Use the latest recording time as session completion time
    const completedAt = new Date(Math.max(...recordings.map(r => r.createdAt.getTime())));
    
    // Generate session ID based on completion time and first recording
    const sessionId = `session_${completedAt.getTime()}_${recordings[0]?.id || 'unknown'}`;
    
    return {
      sessionId,
      recordings: sortedByStep,
      completedAt,
      isComplete: recordings.length === 5
    };
  }
  
  /**
   * Associate recording sessions with weekly plans automatically
   * TODO: Implement when WeeklyPlanService is available
   */
  static async associateSessionsWithWeeklyPlans(userId: string): Promise<void> {
    try {
      console.log('WeeklyPlanService integration temporarily disabled for user:', userId);
      // const sessions = await this.getUserRecordingSessions(userId);
      // 
      // // Group sessions by week and associate with plans
      // const sessionsByWeek: Record<string, string[]> = {};
      // 
      // sessions.forEach(session => {
      //   const { weekStartDate } = WeeklyPlanService.getWeekBounds(session.completedAt);
      //   
      //   if (!sessionsByWeek[weekStartDate]) {
      //     sessionsByWeek[weekStartDate] = [];
      //   }
      //   
      //   sessionsByWeek[weekStartDate].push(session.sessionId);
      // });
      // 
      // // Associate each week's sessions with its plan (if it exists)
      // for (const [weekStartDate, sessionIds] of Object.entries(sessionsByWeek)) {
      //   const weekDate = new Date(weekStartDate);
      //   await WeeklyPlanService.associateSessionsWithPlan(userId, sessionIds, weekDate);
      // }
      
    } catch (error) {
      console.error('Error associating sessions with weekly plans:', error);
    }
  }
  
  /**
   * Get recordings grouped by day for calendar display
   * @deprecated Use calculateStatsFromSessions to avoid duplicate fetching
   */
  static async getUserRecordingsByDay(userId: string): Promise<Record<string, RecordingSession[]>> {
    const sessions = await this.getUserRecordingSessions(userId);
    return this.groupSessionsByDay(sessions);
  }

  /**
   * Group already-fetched sessions by day (helper method)
   */
  static groupSessionsByDay(sessions: RecordingSession[]): Record<string, RecordingSession[]> {
    const recordingsByDay: Record<string, RecordingSession[]> = {};
    
    sessions.forEach(session => {
      const dayKey = session.completedAt.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!recordingsByDay[dayKey]) {
        recordingsByDay[dayKey] = [];
      }
      
      recordingsByDay[dayKey].push(session);
    });
    
    return recordingsByDay;
  }
  
  /**
   * Calculate stats from already-fetched sessions (helper method to avoid duplicate fetching)
   */
  static calculateStatsFromSessions(sessions: RecordingSession[]): {
    totalSessions: number;
    completeSessions: number;
    totalRecordings: number;
    transcribedRecordings: number;
    averageSessionsPerWeek: number;
  } {
    const totalRecordings = sessions.reduce((sum, session) => sum + session.recordings.length, 0);
    const transcribedRecordings = sessions.reduce((sum, session) => 
      sum + session.recordings.filter(r => r.transcriptionStatus === 'completed').length, 0
    );
    
    // Calculate weekly average (based on date range)
    const dates = sessions.map(s => s.completedAt.getTime());
    const oldestDate = dates.length > 0 ? Math.min(...dates) : Date.now();
    const newestDate = dates.length > 0 ? Math.max(...dates) : Date.now();
    const weeksDiff = Math.max(1, (newestDate - oldestDate) / (1000 * 60 * 60 * 24 * 7));
    
    return {
      totalSessions: sessions.length,
      completeSessions: sessions.filter(s => s.isComplete).length,
      totalRecordings,
      transcribedRecordings,
      averageSessionsPerWeek: sessions.length / weeksDiff,
    };
  }

  /**
   * Get summary statistics
   * @deprecated Use calculateStatsFromSessions to avoid duplicate fetching
   */
  static async getUserRecordingStats(userId: string): Promise<{
    totalSessions: number;
    completeSessions: number;
    totalRecordings: number;
    transcribedRecordings: number;
    averageSessionsPerWeek: number;
  }> {
    const sessions = await this.getUserRecordingSessions(userId);
    return this.calculateStatsFromSessions(sessions);
  }
}
