// src/lib/counterfactualFirebaseService.ts
import { doc, updateDoc, getDoc, Timestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { CounterfactualData } from "./recordingsService";

type SelectedAlternativeShape = {
  index: number;
  text: string;
  selectedAt: Timestamp | Date | string;
  feasibilityRating?: number; // 1-5 Likert scale rating
};

type CounterfactualsShape = {
  alternatives: string[];
  questionIndex: number;
  generatedAt: Timestamp | Date | string;
  selectedAlternative?: SelectedAlternativeShape | null;
};

type RecordingDocData = {
  counterfactuals?: CounterfactualsShape;
  counterfactualResults?: CounterfactualsShape;
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
    alternatives: string[],
    sessionId?: string
  ): Promise<void> {
    try {
      console.log("💾 Saving counterfactuals for recording:", recordingId);
      console.log("🔐 User ID:", userId);
      console.log("📝 Question Index:", questionIndex);
      console.log("🔄 Alternatives count:", alternatives.length);
      console.log("📁 Session ID:", sessionId);

      if (!userId) {
        throw new Error("User ID is required to save counterfactuals");
      }

      const counterfactualData: CounterfactualData = {
        alternatives,
        questionIndex,
        generatedAt: new Date(),
        // selectedAlternative will be added when user selects one
      };

      // Use the new hierarchical path: users/{userId}/sessions/{sessionId}/counterfactuals/{recordingId}
      const counterfactualRef = doc(
        db,
        "users",
        userId,
        "sessions",
        sessionId || "default",
        "counterfactuals",
        recordingId
      );
      console.log("🔄 Using new hierarchical path:", counterfactualRef.path);

      // Check if the document exists first
      const docSnap = await getDoc(counterfactualRef);
      if (!docSnap.exists()) {
        console.log("⚠️ Document doesn't exist, creating it...");
        // Create the document with basic data first
        await setDoc(counterfactualRef, {
          userId,
          recordingId,
          sessionId: sessionId || "default",
          createdAt: Timestamp.fromDate(new Date()),
          counterfactualResults: {
            ...counterfactualData,
            generatedAt: Timestamp.fromDate(counterfactualData.generatedAt),
          },
        });
      } else {
        console.log("✅ Document exists, updating counterfactualResults...");
        await updateDoc(counterfactualRef, {
          counterfactualResults: {
            ...counterfactualData,
            generatedAt: Timestamp.fromDate(counterfactualData.generatedAt),
          },
        });
      }

      console.log("✅ Counterfactuals saved successfully");
    } catch (error) {
      console.error("❌ Error saving counterfactuals:", error);
      console.error("🔍 Error details:", {
        userId,
        recordingId,
        sessionId,
        questionIndex,
        alternativesCount: alternatives.length,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: (error as { code?: string })?.code,
      });
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
    alternativeText: string,
    sessionId?: string
  ): Promise<void> {
    try {
      console.log(
        "💾 Saving selected counterfactual for recording:",
        recordingId
      );

      if (!userId) {
        throw new Error("User ID is required to save selected counterfactual");
      }

      // Use the new hierarchical path: users/{userId}/sessions/{sessionId}/counterfactuals/{recordingId}
      const counterfactualRef = doc(
        db,
        "users",
        userId,
        "sessions",
        sessionId || "default",
        "counterfactuals",
        recordingId
      );
      console.log(
        "🔄 Using new hierarchical path for selected counterfactual:",
        counterfactualRef.path
      );

      // Get current data to preserve existing counterfactualResults
      const counterfactualDoc = await getDoc(counterfactualRef);
      const currentData =
        (counterfactualDoc.data() as RecordingDocData | undefined) || {};

      if (!currentData?.counterfactualResults) {
        console.log("⚠️ No counterfactualResults found");
        throw new Error("No counterfactualResults found for this recording");
      }

      const updatedCounterfactualResults = {
        ...currentData.counterfactualResults,
        selectedAlternative: {
          index: alternativeIndex,
          text: alternativeText,
          selectedAt: Timestamp.fromDate(new Date()),
        },
      };

      await updateDoc(counterfactualRef, {
        counterfactualResults: updatedCounterfactualResults,
      });

      console.log("✅ Selected counterfactual saved successfully");
    } catch (error) {
      console.error("❌ Error saving selected counterfactual:", error);
      throw error;
    }
  }

  /**
   * Save feasibility rating for a selected counterfactual
   */
  static async saveFeasibilityRating(
    userId: string,
    recordingId: string,
    rating: number,
    sessionId?: string
  ): Promise<void> {
    try {
      console.log(
        "💾 Saving feasibility rating for recording:",
        recordingId,
        "Rating:",
        rating
      );

      if (!userId) {
        throw new Error("User ID is required to save feasibility rating");
      }

      // Use the new hierarchical path: users/{userId}/sessions/{sessionId}/counterfactuals/{recordingId}
      const counterfactualRef = doc(
        db,
        "users",
        userId,
        "sessions",
        sessionId || "default",
        "counterfactuals",
        recordingId
      );
      console.log(
        "🔄 Using new hierarchical path for feasibility rating:",
        counterfactualRef.path
      );

      // Get current data to preserve existing counterfactualResults
      const counterfactualDoc = await getDoc(counterfactualRef);
      const currentData =
        (counterfactualDoc.data() as RecordingDocData | undefined) || {};

      if (!currentData?.counterfactualResults?.selectedAlternative) {
        console.log("⚠️ No selected counterfactual found");
        throw new Error("No selected counterfactual found for this recording");
      }

      const updatedCounterfactualResults = {
        ...currentData.counterfactualResults,
        selectedAlternative: {
          ...currentData.counterfactualResults.selectedAlternative,
          feasibilityRating: rating,
        },
      };

      await updateDoc(counterfactualRef, {
        counterfactualResults: updatedCounterfactualResults,
      });

      console.log("✅ Feasibility rating saved successfully");
    } catch (error) {
      console.error("❌ Error saving feasibility rating:", error);
      throw error;
    }
  }

  /**
   * Remove user's selected counterfactual (when they deselect)
   */
  static async removeSelectedCounterfactual(
    userId: string,
    recordingId: string,
    sessionId?: string
  ): Promise<void> {
    try {
      console.log(
        "🗑️ Removing selected counterfactual for recording:",
        recordingId
      );

      if (!userId) {
        throw new Error(
          "User ID is required to remove selected counterfactual"
        );
      }

      // Use the new hierarchical path: users/{userId}/sessions/{sessionId}/counterfactuals/{recordingId}
      const counterfactualRef = doc(
        db,
        "users",
        userId,
        "sessions",
        sessionId || "default",
        "counterfactuals",
        recordingId
      );
      console.log(
        "🔄 Using new hierarchical path for removing counterfactual:",
        counterfactualRef.path
      );

      // Get current data to preserve existing counterfactualResults
      const counterfactualDoc = await getDoc(counterfactualRef);
      const currentData =
        (counterfactualDoc.data() as RecordingDocData | undefined) || {};

      if (!currentData?.counterfactualResults) {
        console.log("⚠️ No counterfactualResults found");
        return; // Nothing to remove
      }

      const updatedCounterfactualResults = {
        ...currentData.counterfactualResults,
        selectedAlternative: null, // Remove the selection
      };

      await updateDoc(counterfactualRef, {
        counterfactualResults: updatedCounterfactualResults,
      });

      console.log("✅ Selected counterfactual removed successfully");
    } catch (error) {
      console.error("❌ Error removing selected counterfactual:", error);
      throw error;
    }
  }

  /**
   * Get counterfactuals for a specific recording
   */
  static async getCounterfactuals(
    userId: string,
    recordingId: string,
    sessionId?: string
  ): Promise<CounterfactualData | null> {
    try {
      if (!userId) {
        console.log("⚠️ No user ID provided for getting counterfactuals");
        return null;
      }

      // Use the new hierarchical path: users/{userId}/sessions/{sessionId}/counterfactuals/{recordingId}
      const counterfactualRef = doc(
        db,
        "users",
        userId,
        "sessions",
        sessionId || "default",
        "counterfactuals",
        recordingId
      );
      console.log(
        "🔍 Using new hierarchical path for getting counterfactuals:",
        counterfactualRef.path
      );

      const counterfactualDoc = await getDoc(counterfactualRef);

      if (!counterfactualDoc.exists()) {
        console.log("⚠️ Document doesn't exist");
        return null;
      }

      const data =
        (counterfactualDoc.data() as RecordingDocData | undefined) || {};

      // Try counterfactualResults first, then fallback to counterfactuals
      const cf = data.counterfactualResults || data.counterfactuals;

      if (!cf) {
        console.log("⚠️ No counterfactualResults or counterfactuals found");
        return null;
      }

      console.log("✅ Found counterfactuals");

      // Convert Firestore timestamps back to Date objects
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
      console.error("❌ Error fetching counterfactuals:", error);
      throw error;
    }
  }

  /**
   * Save counterfactuals for an entire session (all 5 questions)
   */
  static async saveSessionCounterfactuals(
    userId: string,
    sessionRecordings: Array<{ recordingId: string; questionIndex: number }>,
    allCounterfactuals: string[],
    sessionId?: string
  ): Promise<void> {
    try {
      console.log(
        "💾 Saving session counterfactuals for",
        sessionRecordings.length,
        "recordings"
      );
      console.log("📁 Session ID:", sessionId);

      // Save counterfactuals to each recording based on its question index
      const savePromises = sessionRecordings.map(
        async ({ recordingId, questionIndex }) => {
          // For session-wide counterfactuals, we save all 5 to each recording
          // but mark which question index this recording represents
          await this.saveCounterfactuals(
            userId,
            recordingId,
            questionIndex,
            allCounterfactuals,
            sessionId
          );
        }
      );

      await Promise.all(savePromises);
      console.log("✅ All session counterfactuals saved successfully");
    } catch (error) {
      console.error("❌ Error saving session counterfactuals:", error);
      throw error;
    }
  }
}
