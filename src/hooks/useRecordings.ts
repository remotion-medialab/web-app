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

export const useRecordings = (userId: string | null): UseRecordingsReturn => {
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [sessionsByDay, setSessionsByDay] = useState<Record<string, RecordingSession[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UseRecordingsReturn['stats']>(null);

  const fetchRecordings = async () => {
    if (!userId) {
      setSessions([]);
      setSessionsByDay({});
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching recordings for user:', userId);

      // Fetch all data in parallel
      const [sessionsData, sessionsByDayData, statsData] = await Promise.all([
        RecordingsService.getUserRecordingSessions(userId),
        RecordingsService.getUserRecordingsByDay(userId),
        RecordingsService.getUserRecordingStats(userId),
      ]);

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
    }
  };

  // Initial fetch when userId changes
  useEffect(() => {
    fetchRecordings();
  }, [userId]);

  return {
    sessions,
    sessionsByDay,
    loading,
    error,
    refetch: fetchRecordings,
    stats,
  };
};