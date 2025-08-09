// src/lib/recordingsService.ts
import { collection, collectionGroup, query, orderBy, getDocs, Timestamp, where, doc } from 'firebase/firestore';
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
  sessionNumber?: number;
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
      
      let snapshot;
      try {
        const cg = collectionGroup(db, 'recordings');
        const q1 = query(cg, where('userId', '==', userId), orderBy('createdAt', 'desc'));
        snapshot = await getDocs(q1);
      } catch {
        // Fallback to legacy path
        const recordingsRef = collection(db, 'recordings', userId, 'sessions');
        try {
          const q2 = query(recordingsRef, orderBy('createdAt', 'desc'));
          snapshot = await getDocs(q2);
        } catch {
          snapshot = await getDocs(recordingsRef);
        }
      }

      if (snapshot.empty) {
        const sessionsCol = collection(db, 'users', userId, 'sessions');
        const sessionsSnap = await getDocs(sessionsCol);
        type Loose = Record<string, unknown>;
        const allRecordingDocs: Array<{ id: string; data: Loose }> = [];
        for (const sess of sessionsSnap.docs) {
          const recordingsCol = collection(doc(db, 'users', userId, 'sessions', sess.id), 'recordings');
          const recSnap = await getDocs(recordingsCol);
        recSnap.docs.forEach(d => allRecordingDocs.push({ id: d.id, data: d.data() as Loose }));
        }
        const toStringSafe = (v: unknown, fallback = ''): string => typeof v === 'string' ? v : fallback;
        const toNumberSafe = (v: unknown, fallback = 0): number => typeof v === 'number' ? v : fallback;
        const toTimestampDate = (v: unknown): Date => v instanceof Timestamp ? v.toDate() : new Date(toStringSafe(v, ''));

        const manualRecordings: Recording[] = allRecordingDocs.map(({ id, data }) => {
          const transcription = (data.transcription as Loose | undefined);
          const activitySummary = (data.activitySummary as Loose | undefined);
          const counterfactuals = (data.counterfactuals as Loose | undefined);
          const selectedAlt = counterfactuals?.selectedAlternative as Loose | undefined;

          return {
            id,
            userId: toStringSafe(data.userId, userId),
            title: toStringSafe(data.title, 'Untitled Recording'),
            duration: toNumberSafe(data.duration, 0),
            stepNumber: toNumberSafe(data.stepNumber, 1),
            sessionNumber: toNumberSafe(data.sessionNumber, undefined as unknown as number),
            question: toStringSafe(data.question, undefined as unknown as string),
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(toStringSafe(data.createdAt, '')),
            audioUri: toStringSafe(data.audioUri, undefined as unknown as string),
            fileUrl: toStringSafe(data.fileUrl, undefined as unknown as string),
            transcription: transcription ? {
              text: toStringSafe(transcription.text, ''),
              confidence: toNumberSafe(transcription.confidence, 0),
              transcribedAt: toTimestampDate(transcription.transcribedAt),
              service: toStringSafe(transcription.service, 'unknown'),
            } : undefined,
            transcriptionText: toStringSafe(data.transcriptionText, undefined as unknown as string),
            transcriptionStatus: (toStringSafe(data.transcriptionStatus, 'pending') as 'pending' | 'processing' | 'completed' | 'failed'),
            activitySummary: activitySummary ? {
              primaryActivity: toStringSafe(activitySummary.primaryActivity, 'unknown'),
              confidence: toNumberSafe(activitySummary.confidence, 0),
            } : undefined,
            counterfactuals: counterfactuals ? {
              alternatives: Array.isArray(counterfactuals.alternatives) ? (counterfactuals.alternatives as string[]) : [],
              selectedAlternative: selectedAlt ? {
                index: toNumberSafe(selectedAlt.index, 0),
                text: toStringSafe(selectedAlt.text, ''),
                selectedAt: toTimestampDate(selectedAlt.selectedAt),
              } : undefined,
              generatedAt: toTimestampDate(counterfactuals.generatedAt),
              questionIndex: toNumberSafe(counterfactuals.questionIndex, 0),
            } : undefined,
          };
        });

        if (manualRecordings.length > 0) {
          const sessions = this.groupRecordingsBySessionNumber(manualRecordings);
          return sessions;
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
          sessionNumber: data.sessionNumber,
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
      
      const sessions = this.groupRecordingsBySessionNumber(recordings);
      
      return sessions;
      
    } catch (error) {
      console.error('❌ Error fetching user recordings:', error);
      return [];
    }
  }
  
  /**
   * Group recordings into sessions based on proximity and step numbers
   */
  private static groupRecordingsBySessionNumber(recordings: Recording[]): RecordingSession[] {
    // Separate those with sessionNumber from legacy ones
    const withSession = recordings.filter(r => typeof r.sessionNumber === 'number') as Required<Recording>[];
    const legacy = recordings.filter(r => typeof r.sessionNumber !== 'number');

    // Group with sessionNumber
    const groups = new Map<number, Recording[]>();
    withSession.forEach(r => {
      const n = r.sessionNumber as number;
      const arr = groups.get(n) || [];
      arr.push(r);
      groups.set(n, arr);
    });

    const sessionsFromNumber: RecordingSession[] = Array.from(groups.entries()).map(([n, recs]) => {
      const sorted = [...recs].sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0));
      const completedAt = new Date(Math.max(...sorted.map(r => r.createdAt.getTime())));
      const isComplete = sorted.length === 5;
      return {
        sessionId: `session${n}`,
        recordings: sorted,
        completedAt,
        isComplete,
      };
    });

    // Fallback grouping for legacy (time proximity, 5 per session)
    const legacySessions = this.groupLegacyRecordings(legacy);

    // Merge and sort by completion time desc
    const all = [...sessionsFromNumber, ...legacySessions];
    all.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
    return all;
  }

  // Legacy time-based grouping retained for old data without sessionNumber
  private static groupLegacyRecordings(recordings: Recording[]): RecordingSession[] {
    if (recordings.length === 0) return [];
    const sessions: RecordingSession[] = [];
    const sorted = [...recordings].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let bucket: Recording[] = [];
    let counter = 1;
    for (const r of sorted) {
      bucket.push(r);
      if (bucket.length === 5) {
        const completedAt = new Date(Math.max(...bucket.map(x => x.createdAt.getTime())));
        sessions.push({
          sessionId: `legacy-${counter++}`,
          recordings: [...bucket],
          completedAt,
          isComplete: true,
        });
        bucket = [];
      }
    }
    if (bucket.length > 0) {
      const completedAt = new Date(Math.max(...bucket.map(x => x.createdAt.getTime())));
      sessions.push({
        sessionId: `legacy-${counter++}`,
        recordings: [...bucket],
        completedAt,
        isComplete: bucket.length === 5,
      });
    }
    return sessions;
  }
  
  /**
   * Create a session object from recordings
   */
  // private static createSession(recordings: Recording[]): RecordingSession {
  //   const sortedByStep = [...recordings].sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0));
  //   const completedAt = new Date(Math.max(...recordings.map(r => r.createdAt.getTime())));
  //   return {
  //     sessionId: `session${sortedByStep[0]?.sessionNumber ?? 'unknown'}`,
  //     recordings: sortedByStep,
  //     completedAt,
  //     isComplete: recordings.length === 5,
  //   };
  // }
  
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
