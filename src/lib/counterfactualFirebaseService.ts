// src/lib/counterfactualFirebaseService.ts
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { CounterfactualData } from './recordingsService';

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
      
      const recordingRef = doc(db, 'recordings', userId, 'sessions', recordingId);
      
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
      
      const recordingRef = doc(db, 'recordings', userId, 'sessions', recordingId);
      
      // Get current data to preserve existing counterfactuals
      const recordingDoc = await getDoc(recordingRef);
      const currentData = recordingDoc.data();
      
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
      
      const recordingRef = doc(db, 'recordings', userId, 'sessions', recordingId);
      
      // Get current data to preserve existing counterfactuals
      const recordingDoc = await getDoc(recordingRef);
      const currentData = recordingDoc.data();
      
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
      const recordingRef = doc(db, 'recordings', userId, 'sessions', recordingId);
      const recordingDoc = await getDoc(recordingRef);
      
      if (!recordingDoc.exists()) {
        return null;
      }

      const data = recordingDoc.data();
      if (!data.counterfactuals) {
        return null;
      }

      // Convert Firestore timestamps back to Date objects
      return {
        ...data.counterfactuals,
        generatedAt: data.counterfactuals.generatedAt instanceof Timestamp
          ? data.counterfactuals.generatedAt.toDate()
          : new Date(data.counterfactuals.generatedAt),
        selectedAlternative: data.counterfactuals.selectedAlternative ? {
          ...data.counterfactuals.selectedAlternative,
          selectedAt: data.counterfactuals.selectedAlternative.selectedAt instanceof Timestamp
            ? data.counterfactuals.selectedAlternative.selectedAt.toDate()
            : new Date(data.counterfactuals.selectedAlternative.selectedAt)
        } : undefined
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