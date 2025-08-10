// src/lib/counterfactualFirebaseService.ts
import { doc, updateDoc, getDoc, Timestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { CounterfactualData } from "./recordingsService";

type SelectedAlternativeShape = {
  index: number;
  text: string;
  selectedAt: Timestamp | Date | string;
  feasibilityRating?: number; // 1-5 Likert scale rating for the selected alternative
};

type CounterfactualsShape = {
  generatedCfTexts: string[];
  questionIndex: number;
  generatedAt: Timestamp | Date | string;
  selectedAlternative?: SelectedAlternativeShape | null;
  transcribed?: string; // Original text data sent to the /counterfactual API
  humanFeasibilityRating?: number[]; // Array of feasibility ratings for each counterfactual (-1 indicates no rating yet)
  cfLogs?: {
    sorted20?: string[];
    feasibilityScore20?: number[];
    similarityScore20?: number[];
    sorted15?: string[];
    similarityScore15?: number[];
    feasibilityScore15?: number[];
    similar2_chosen?: string[];
    neutral1_chosen?: string[];
    different2_chosen?: string[];
  };
};

type RecordingDocData = {
  counterfactuals?: CounterfactualsShape;
  counterfactualResults?: CounterfactualsShape;
  // Flattened structure (new)
  generatedCfTexts?: string[];
  questionIndex?: number;
  generatedAt?: Timestamp | Date | string;
  selectedAlternative?: SelectedAlternativeShape | null;
  transcribed?: string; // Original text data sent to the /counterfactual API
  humanFeasibilityRating?: number[]; // Array of feasibility ratings for each counterfactual (-1 indicates no rating yet)
  cfLogs?: {
    sorted20?: string[];
    feasibilityScore20?: number[];
    similarityScore20?: number[];
    sorted15?: string[];
    similarityScore15?: number[];
    feasibilityScore15?: number[];
    similar2_chosen?: string[];
    neutral1_chosen?: string[];
    different2_chosen?: string[];
  };
  // Basic document fields
  userId?: string;
  recordingId?: string;
  sessionId?: string;
  createdAt?: Timestamp | Date | string;
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
    generatedCfTexts: string[],
    sessionId?: string,
    transcribed?: string,
    cfLogs?: {
      sorted20?: string[];
      feasibilityScore20?: number[];
      similarityScore20?: number[];
      sorted15?: string[];
      similarityScore15?: number[];
      feasibilityScore15?: number[];
      similar2_chosen?: string[];
      neutral1_chosen?: string[];
      different2_chosen?: string[];
    }
  ): Promise<void> {
    try {
      console.log("💾 Saving counterfactuals for recording:", recordingId);
      console.log("🔐 User ID:", userId);
      console.log("📝 Question Index:", questionIndex);
      console.log("🔄 Generated CF texts count:", generatedCfTexts.length);
      console.log("📁 Session ID:", sessionId);
      console.log("📝 Transcribed text included:", !!transcribed);
      console.log("📊 CF Logs included:", !!cfLogs);

      if (!userId) {
        throw new Error("User ID is required to save counterfactuals");
      }

      const counterfactualData: CounterfactualData = {
        generatedCfTexts,
        questionIndex,
        generatedAt: new Date(),
        transcribed, // Include transcribed text
        cfLogs, // Include cfLogs in the data
        humanFeasibilityRating: new Array(generatedCfTexts.length).fill(-1), // Initialize with -1 for each counterfactual
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
          ...counterfactualData,
          generatedAt: Timestamp.fromDate(counterfactualData.generatedAt),
        });
      } else {
        console.log("✅ Document exists, updating counterfactual data...");
        await updateDoc(counterfactualRef, {
          ...counterfactualData,
          generatedAt: Timestamp.fromDate(counterfactualData.generatedAt),
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
        alternativesCount: generatedCfTexts.length,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: (error as { code?: string })?.code,
      });
      throw error;
    }
  }

  /**
   * Save user's alternative for a specific recording
   */
  static async saveSelectedCounterfactual(
    userId: string,
    recordingId: string,
    alternativeIndex: number,
    alternativeText: string,
    sessionId?: string
  ): Promise<void> {
    try {
      console.log("💾 Saving alternative for recording:", recordingId);

      if (!userId) {
        throw new Error("User ID is required to save alternative");
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
        "🔄 Using new hierarchical path for alternative:",
        counterfactualRef.path
      );

      // Get current data to preserve existing counterfactual data
      const counterfactualDoc = await getDoc(counterfactualRef);
      const currentData =
        (counterfactualDoc.data() as RecordingDocData | undefined) || {};

      if (!currentData?.generatedCfTexts) {
        console.log("⚠️ No counterfactual data found");
        throw new Error("No counterfactual data found for this recording");
      }

      const updatedData = {
        ...currentData,
        selectedAlternative: {
          index: alternativeIndex,
          text: alternativeText,
          selectedAt: Timestamp.fromDate(new Date()),
        },
      };

      await updateDoc(counterfactualRef, updatedData);

      console.log("✅ Alternative saved successfully");
    } catch (error) {
      console.error("❌ Error saving alternative:", error);
      throw error;
    }
  }

  /**
   * Validate and fix humanFeasibilityRating array integrity
   */
  static async validateAndFixHumanFeasibilityRatings(
    userId: string,
    recordingId: string,
    sessionId?: string
  ): Promise<void> {
    try {
      console.log(
        "🔍 Validating humanFeasibilityRating array integrity for recording:",
        recordingId
      );

      const existingData = await this.getCounterfactuals(
        userId,
        recordingId,
        sessionId
      );

      if (!existingData?.generatedCfTexts) {
        console.log("⚠️ No counterfactual data found for validation");
        return;
      }

      const expectedLength = existingData.generatedCfTexts.length;
      const currentRatings = existingData.humanFeasibilityRating;

      if (!currentRatings || currentRatings.length !== expectedLength) {
        console.log("🔄 Fixing humanFeasibilityRating array length mismatch");

        const fixedRatings = new Array(expectedLength).fill(-1);

        // Preserve existing ratings if possible
        if (currentRatings) {
          for (
            let i = 0;
            i < Math.min(currentRatings.length, expectedLength);
            i++
          ) {
            if (currentRatings[i] >= 1 && currentRatings[i] <= 5) {
              fixedRatings[i] = currentRatings[i];
            }
          }
        }

        // Save the fixed ratings
        const counterfactualRef = doc(
          db,
          "users",
          userId,
          "sessions",
          sessionId || "default",
          "counterfactuals",
          recordingId
        );

        await updateDoc(counterfactualRef, {
          humanFeasibilityRating: fixedRatings,
        });

        console.log("✅ Fixed humanFeasibilityRating array:", fixedRatings);
      } else {
        console.log("✅ humanFeasibilityRating array is valid");
      }
    } catch (error) {
      console.error("❌ Error validating humanFeasibilityRating:", error);
    }
  }

  /**
   * Save human feasibility rating for a specific counterfactual index
   */
  static async saveHumanFeasibilityRating(
    userId: string,
    recordingId: string,
    counterfactualIndex: number,
    rating: number,
    sessionId?: string
  ): Promise<void> {
    try {
      console.log(
        "💾 Saving human feasibility rating for recording:",
        recordingId,
        "Counterfactual index:",
        counterfactualIndex,
        "Rating:",
        rating
      );

      if (!userId) {
        throw new Error("User ID is required to save human feasibility rating");
      }

      if (counterfactualIndex < 0) {
        throw new Error("Counterfactual index must be non-negative");
      }

      if (rating < 1 || rating > 5) {
        throw new Error("Rating must be between 1 and 5");
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
        "🔄 Using new hierarchical path for human feasibility rating:",
        counterfactualRef.path
      );

      // Get current data to preserve existing counterfactual data
      const counterfactualDoc = await getDoc(counterfactualRef);
      const currentData =
        (counterfactualDoc.data() as RecordingDocData | undefined) || {};

      if (!currentData?.generatedCfTexts) {
        console.log("⚠️ No counterfactual data found");
        throw new Error("No counterfactual data found for this recording");
      }

      if (counterfactualIndex >= currentData.generatedCfTexts.length) {
        console.log("⚠️ Counterfactual index out of bounds");
        throw new Error("Counterfactual index out of bounds");
      }

      // Initialize humanFeasibilityRating array if it doesn't exist or if it has wrong length
      let currentRatings = currentData.humanFeasibilityRating;

      if (
        !currentRatings ||
        currentRatings.length !== currentData.generatedCfTexts.length
      ) {
        console.log(
          "🔄 Initializing/resizing humanFeasibilityRating array to match generatedCfTexts length"
        );
        currentRatings = new Array(currentData.generatedCfTexts.length).fill(
          -1
        );

        // If we had existing ratings, try to preserve them (up to the new length)
        if (currentData.humanFeasibilityRating) {
          for (
            let i = 0;
            i <
            Math.min(
              currentData.humanFeasibilityRating.length,
              currentData.generatedCfTexts.length
            );
            i++
          ) {
            currentRatings[i] = currentData.humanFeasibilityRating[i];
          }
        }
      }

      // Update the specific rating
      const updatedRatings = [...currentRatings];
      updatedRatings[counterfactualIndex] = rating;

      console.log("📊 Updated ratings array:", updatedRatings);
      console.log(
        "📊 Generated CF texts count:",
        currentData.generatedCfTexts.length
      );

      const updatedData = {
        ...currentData,
        humanFeasibilityRating: updatedRatings,
      };

      await updateDoc(counterfactualRef, updatedData);

      console.log("✅ Human feasibility rating saved successfully");
    } catch (error) {
      console.error("❌ Error saving human feasibility rating:", error);
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

      // Get current data to preserve existing counterfactual data
      const counterfactualDoc = await getDoc(counterfactualRef);
      const currentData =
        (counterfactualDoc.data() as RecordingDocData | undefined) || {};

      if (!currentData?.selectedAlternative) {
        console.log("⚠️ No selected counterfactual found");
        throw new Error("No selected counterfactual found for this recording");
      }

      const updatedData = {
        ...currentData,
        selectedAlternative: {
          ...currentData.selectedAlternative,
          feasibilityRating: rating,
        },
      };

      await updateDoc(counterfactualRef, updatedData);

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
        "��️ Removing selected counterfactual for recording:",
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

      // Get current data to preserve existing counterfactual data
      const counterfactualDoc = await getDoc(counterfactualRef);
      const currentData =
        (counterfactualDoc.data() as RecordingDocData | undefined) || {};

      if (!currentData?.generatedCfTexts) {
        console.log("⚠️ No counterfactual data found");
        return; // Nothing to remove
      }

      const updatedData = {
        ...currentData,
        selectedAlternative: null, // Remove the selection
      };

      await updateDoc(counterfactualRef, updatedData);

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

      // Try flattened structure first, then fallback to old nested structures
      let cf: CounterfactualsShape | null = null;

      if (data.generatedCfTexts) {
        // New flattened structure
        cf = {
          generatedCfTexts: data.generatedCfTexts,
          questionIndex: data.questionIndex || 0,
          generatedAt: data.generatedAt || new Date(),
          selectedAlternative: data.selectedAlternative,
          transcribed: data.transcribed, // Include transcribed in the returned data
          humanFeasibilityRating: data.humanFeasibilityRating, // Include human feasibility ratings
          cfLogs: data.cfLogs,
        };
      } else if (data.counterfactualResults) {
        // Old counterfactualResults structure
        cf = data.counterfactualResults;
      } else if (data.counterfactuals) {
        // Old counterfactuals structure
        cf = data.counterfactuals;
      }

      if (!cf) {
        console.log("⚠️ No counterfactual data found");
        return null;
      }

      console.log("✅ Found counterfactuals");

      // Convert Firestore timestamps back to Date objects
      return {
        generatedCfTexts: cf.generatedCfTexts,
        questionIndex: cf.questionIndex,
        generatedAt: toDate(cf.generatedAt),
        selectedAlternative: cf.selectedAlternative
          ? {
              index: cf.selectedAlternative.index,
              text: cf.selectedAlternative.text,
              selectedAt: toDate(cf.selectedAlternative.selectedAt),
              feasibilityRating: cf.selectedAlternative.feasibilityRating,
            }
          : undefined,
        transcribed: cf.transcribed, // Include transcribed in the returned data
        humanFeasibilityRating: cf.humanFeasibilityRating, // Include human feasibility ratings
        cfLogs: cf.cfLogs, // Include cfLogs in the returned data
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
    generatedCfTexts: string[],
    sessionId?: string,
    transcribed?: string,
    cfLogs?: {
      sorted20?: string[];
      feasibilityScore20?: number[];
      similarityScore20?: number[];
      sorted15?: string[];
      similarityScore15?: number[];
      feasibilityScore15?: number[];
      similar2_chosen?: string[];
      neutral1_chosen?: string[];
      different2_chosen?: string[];
    }
  ): Promise<void> {
    try {
      console.log(
        "💾 Saving session counterfactuals for",
        sessionRecordings.length,
        "recordings"
      );
      console.log("📁 Session ID:", sessionId);
      console.log("📝 Transcribed text included:", !!transcribed);
      console.log("📊 CF Logs included:", !!cfLogs);

      // Save counterfactuals to each recording based on its question index
      const savePromises = sessionRecordings.map(
        async ({ recordingId, questionIndex }) => {
          // For session-wide counterfactuals, we save all 5 to each recording
          // but mark which question index this recording represents
          await this.saveCounterfactuals(
            userId,
            recordingId,
            questionIndex,
            generatedCfTexts,
            sessionId,
            transcribed, // Pass transcribed text to each recording
            cfLogs // Pass cfLogs to each recording
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
