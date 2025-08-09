// src/lib/counterfactualFirebaseService.ts
import { doc, updateDoc, getDoc, Timestamp, collectionGroup, query, where, getDocs } from 'firebase/firestore';
import type { DocumentReference, DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import type { CounterfactualData } from './recordingsService';

type SelectedAlternativeShape = {
  index: number;
  text: string;
  selectedAt: Timestamp | Date | string;
};

type CounterfactualsShape = {
  alternatives: string[];
  questionIndex: number;
  generatedAt: Timestamp | Date | string;
  selectedAlternative?: SelectedAlternativeShape | null;
};

type RecordingDocData = {
  counterfactuals?: CounterfactualsShape;
};

const toDate = (v: unknown): Date => {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(String(v));
};

export class CounterfactualFirebaseService {
  /**
   * Save generated counterfactuals for a specific recording/question
   */
  static async saveCounterfactuals(
    userId: string, 
    recordingId: string, 
    questionIndex: number,
    alternatives: string[]
  ): Promise<void> {
    try {
      console.log('💾 Saving counterfactuals for recording:', recordingId);
      
      // Try new hierarchical structure first (collection group by recordingId)
      let recordingRef: DocumentReference<DocumentData> | null = null;
      try {
        const cg = collectionGroup(db, 'recordings');
        const q1 = query(cg, where('userId', '==', userId), where('recordingId', '==', recordingId));
        const snap = await getDocs(q1);
        if (!snap.empty) {
          recordingRef = snap.docs[0].ref;
        }
      } catch {
        // ignore
      }
      // Fallback to legacy path
      if (!recordingRef) {
        recordingRef = doc(db, 'recordings', userId, 'sessions', recordingId);
      }
      
      const counterfactualData: CounterfactualData = {
        alternatives,
        questionIndex,
        generatedAt: new Date(),
        // selectedAlternative will be added when user selects one
      };

      await updateDoc(recordingRef, {
        counterfactuals: {
          ...counterfactualData,
          generatedAt: Timestamp.fromDate(counterfactualData.generatedAt)
        }
      });

      console.log('✅ Counterfactuals saved successfully');
    } catch (error) {
      console.error('❌ Error saving counterfactuals:', error);
      throw error;
    }
  }

  /**
   * Save user's selected counterfactual for a specific recording
   */
  static async saveSelectedCounterfactual(
    userId: string,
    recordingId: string,
    alternativeIndex: number,
    alternativeText: string
  ): Promise<void> {
    try {
      console.log('💾 Saving selected counterfactual for recording:', recordingId);
      
      let recordingRef: DocumentReference<DocumentData> | null = null;
      try {
        const cg = collectionGroup(db, 'recordings');
        const q1 = query(cg, where('userId', '==', userId), where('recordingId', '==', recordingId));
        const snap = await getDocs(q1);
        if (!snap.empty) {
          recordingRef = snap.docs[0].ref;
        }
      } catch {
        // noop
      }
      if (!recordingRef) {
        recordingRef = doc(db, 'recordings', userId, 'sessions', recordingId);
      }
      
      // Get current data to preserve existing counterfactuals
      const recordingDoc = await getDoc(recordingRef);
      const currentData = (recordingDoc.data() as RecordingDocData | undefined) || {};
      
      if (!currentData?.counterfactuals) {
        throw new Error('No counterfactuals found for this recording');
      }

      const updatedCounterfactuals = {
        ...currentData.counterfactuals,
        selectedAlternative: {
          index: alternativeIndex,
          text: alternativeText,
          selectedAt: Timestamp.fromDate(new Date())
        }
      };

      await updateDoc(recordingRef, {
        counterfactuals: updatedCounterfactuals
      });

      console.log('✅ Selected counterfactual saved successfully');
    } catch (error) {
      console.error('❌ Error saving selected counterfactual:', error);
      throw error;
    }
  }

  /**
   * Remove user's selected counterfactual (when they deselect)
   */
  static async removeSelectedCounterfactual(
    userId: string,
    recordingId: string
  ): Promise<void> {
    try {
      console.log('🗑️ Removing selected counterfactual for recording:', recordingId);
      
      let recordingRef: DocumentReference<DocumentData> | null = null;
      try {
        const cg = collectionGroup(db, 'recordings');
        const q1 = query(cg, where('userId', '==', userId), where('recordingId', '==', recordingId));
        const snap = await getDocs(q1);
        if (!snap.empty) {
          recordingRef = snap.docs[0].ref;
        }
      } catch {
        // noop
      }
      if (!recordingRef) {
        recordingRef = doc(db, 'recordings', userId, 'sessions', recordingId);
      }
      
      // Get current data to preserve existing counterfactuals
      const recordingDoc = await getDoc(recordingRef);
      const currentData = (recordingDoc.data() as RecordingDocData | undefined) || {};
      
      if (!currentData?.counterfactuals) {
        return; // Nothing to remove
      }

      const updatedCounterfactuals = {
        ...currentData.counterfactuals,
        selectedAlternative: null // Remove the selection
      };

      await updateDoc(recordingRef, {
        counterfactuals: updatedCounterfactuals
      });

      console.log('✅ Selected counterfactual removed successfully');
    } catch (error) {
      console.error('❌ Error removing selected counterfactual:', error);
      throw error;
    }
  }

  /**
   * Get counterfactuals for a specific recording
   */
  static async getCounterfactuals(
    userId: string,
    recordingId: string
  ): Promise<CounterfactualData | null> {
    try {
      let recordingRef: DocumentReference<DocumentData> | null = null;
      try {
        const cg = collectionGroup(db, 'recordings');
        const q1 = query(cg, where('userId', '==', userId), where('recordingId', '==', recordingId));
        const snap = await getDocs(q1);
        if (!snap.empty) {
          recordingRef = snap.docs[0].ref;
        }
      } catch {
        // noop
      }
      if (!recordingRef) {
        recordingRef = doc(db, 'recordings', userId, 'sessions', recordingId);
      }
      const recordingDoc = await getDoc(recordingRef);
      
      if (!recordingDoc.exists()) {
        return null;
      }

      const data = (recordingDoc.data() as RecordingDocData | undefined) || {};
      if (!data.counterfactuals) {
        return null;
      }

      // Convert Firestore timestamps back to Date objects
      const cf = data.counterfactuals!;
      return {
        alternatives: cf.alternatives,
        questionIndex: cf.questionIndex,
        generatedAt: toDate(cf.generatedAt),
        selectedAlternative: cf.selectedAlternative
          ? {
              index: cf.selectedAlternative.index,
              text: cf.selectedAlternative.text,
              selectedAt: toDate(cf.selectedAlternative.selectedAt),
            }
          : undefined,
      };
    } catch (error) {
      console.error('❌ Error fetching counterfactuals:', error);
      return null;
    }
  }

  /**
   * Save counterfactuals for an entire session (all 5 questions)
   */
  static async saveSessionCounterfactuals(
    userId: string,
    sessionRecordings: Array<{ recordingId: string; questionIndex: number }>,
    allCounterfactuals: string[]
  ): Promise<void> {
    try {
      console.log('💾 Saving session counterfactuals for', sessionRecordings.length, 'recordings');
      
      // Save counterfactuals to each recording based on its question index
      const savePromises = sessionRecordings.map(async ({ recordingId, questionIndex }) => {
        // For session-wide counterfactuals, we save all 5 to each recording
        // but mark which question index this recording represents
        await this.saveCounterfactuals(userId, recordingId, questionIndex, allCounterfactuals);
      });

      await Promise.all(savePromises);
      console.log('✅ All session counterfactuals saved successfully');
    } catch (error) {
      console.error('❌ Error saving session counterfactuals:', error);
      throw error;
    }
  }
} 