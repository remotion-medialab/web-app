import { useState, useEffect } from 'react';
import { RecordingsService } from '../lib/recordingsService';
import type { RecordingSession } from '../lib/recordingsService';

export interface UseRecordingsReturn {
  sessions: RecordingSession[];
  sessionsByDay: Record<string, RecordingSession[]>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  stats: {
    totalSessions: number;
    completeSessions: number;
    totalRecordings: number;
    transcribedRecordings: number;
    averageSessionsPerWeek: number;
  } | null;
}

// Helper function to get date key in YYYY-MM-DD format preserving local timezone
export const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useRecordings = (userId: string | null): UseRecordingsReturn => {
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [sessionsByDay, setSessionsByDay] = useState<Record<string, RecordingSession[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UseRecordingsReturn['stats']>(null);
  const [isCurrentlyFetching, setIsCurrentlyFetching] = useState(false);

  const fetchRecordings = async () => {
    if (!userId) {
      setSessions([]);
      setSessionsByDay({});
      setStats(null);
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches (React StrictMode protection)
    if (isCurrentlyFetching) {
      console.log('🚫 Fetch already in progress, skipping duplicate call');
      return;
    }

    try {
      setIsCurrentlyFetching(true);
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching recordings for user:', userId);

      // Fetch sessions once, then derive other data from it
      const sessionsData = await RecordingsService.getUserRecordingSessions(userId);
      
      // Generate sessionsByDay from already-fetched sessions (avoid duplicate fetch)
      const sessionsByDayData: Record<string, RecordingSession[]> = {};
      sessionsData.forEach(session => {
        const dayKey = getDateKey(session.completedAt); // Use timezone-safe date key
        if (!sessionsByDayData[dayKey]) {
          sessionsByDayData[dayKey] = [];
        }
        sessionsByDayData[dayKey].push(session);
      });

      // Generate stats from already-fetched sessions (avoid duplicate fetch)
      const statsData = RecordingsService.calculateStatsFromSessions(sessionsData);

      console.log('✅ Fetched recordings:', {
        sessions: sessionsData.length,
        days: Object.keys(sessionsByDayData).length,
        stats: statsData
      });

      setSessions(sessionsData);
      setSessionsByDay(sessionsByDayData);
      setStats(statsData);

    } catch (err) {
      console.error('❌ Error fetching recordings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recordings');
      setSessions([]);
      setSessionsByDay({});
      setStats(null);
    } finally {
      setLoading(false);
      setIsCurrentlyFetching(false);
    }
  };

  // Initial fetch when userId changes
  useEffect(() => {
    fetchRecordings();
  }, [userId]);

  const refetch = async () => {
    console.log('🔄 Manual refetch requested');
    await fetchRecordings();
  };

  return {
    sessions,
    sessionsByDay,
    loading,
    error,
    refetch,
    stats,
  };
};