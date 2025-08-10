// Counterfactual generation service for coping strategies
import type { Recording } from "./recordingsService";

export interface Counterfactual {
  id: string;
  recordingId: string;
  stepNumber: number;
  originalText: string;
  counterfactualText: string;
  whichPhase: string;
  isSelected: boolean;
  createdAt: Date;
}

export interface CounterfactualGenerationRequest {
  userId: string;
  sessionId: string;
  recordings: Recording[];
}

export interface CounterfactualGenerationResponse {
  counterfactuals: Counterfactual[];
  success: boolean;
  error?: string;
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
  metadata?: {
    processed_at: string;
    session_id: string;
    user_id: string;
  };
}

// Interfaces are already exported above with 'export interface'

interface CounterfactualResponse {
  counterfactuals: string[];
  original_text: string;
  metadata?: {
    processed_at: string;
    session_id: string;
    user_id: string;
  };
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
}

interface CounterfactualInput {
  text: string;
}

// Configure API URL based on environment
const COUNTERFACTUAL_API_URL =
  import.meta.env.VITE_COUNTERFACTUAL_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:8000"
    : "https://coping-counterfactual.fly.dev");

export const generateCounterfactuals = async (
  questionResponses: string[]
): Promise<string[]> => {
  try {
    // Join the 5 responses with newlines as expected by the backend
    const inputText = questionResponses.join("\n");

    const response = await fetch(`${COUNTERFACTUAL_API_URL}/counterfactual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: inputText } as CounterfactualInput),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data: CounterfactualResponse = await response.json();
    return data.counterfactuals;
  } catch (error) {
    console.error("Error generating counterfactuals:", error);

    // Return mock counterfactuals in case of error
    return [
      "What if you had approached the situation differently?",
      "What if you had modified your environment?",
      "What if you had focused your attention elsewhere?",
      "What if you had reframed your thoughts?",
      "What if you had responded in a different way?",
    ];
  }
};

export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${COUNTERFACTUAL_API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
};

export class CounterfactualService {
  private static API_BASE_URL =
    import.meta.env.VITE_COUNTERFACTUAL_API_URL ||
    (import.meta.env.DEV
      ? "http://localhost:8000"
      : "https://coping-counterfactual.fly.dev");

  /**
   * Generate counterfactuals for a complete 5-step session
   * Uses the new single-entry API for each recording
   */
  static async generateCounterfactuals(
    request: CounterfactualGenerationRequest
  ): Promise<CounterfactualGenerationResponse> {
    try {
      const allCounterfactuals: Counterfactual[] = [];

      // Use session-level counterfactual generation
      const result = await this.generateSessionCounterfactuals(
        request.recordings
      );
      if (result.success) {
        allCounterfactuals.push(...result.counterfactuals);
      }

      return {
        counterfactuals: allCounterfactuals,
        success: true,
      };
    } catch (error) {
      console.error("Error generating counterfactuals:", error);
      return {
        counterfactuals: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate counterfactuals for a complete 5-step session
   */
  static async generateSessionCounterfactuals(
    recordings: Recording[]
  ): Promise<CounterfactualGenerationResponse> {
    try {
      // Build 5-phase text from recordings (0-4 steps)
      const phaseTexts = ["", "", "", "", ""];
      recordings.forEach((recording) => {
        if (recording.stepNumber >= 0 && recording.stepNumber < 5) {
          phaseTexts[recording.stepNumber] =
            recording.transcription?.text || "";
        }
      });

      const fullText = phaseTexts.join("\n");

      const response = await fetch(`${this.API_BASE_URL}/counterfactual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: fullText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Map the 5 counterfactuals to our format
      const counterfactuals: Counterfactual[] = data.counterfactuals.map(
        (cf: string, index: number) => ({
          id: `cf_session_${index}`,
          recordingId: recordings[0]?.id || "session",
          stepNumber: index,
          originalText: phaseTexts[index] || "",
          counterfactualText: cf,
          whichPhase: this.getPhaseNameFromStep(index),
          isSelected: false,
          createdAt: new Date(),
        })
      );

      return {
        counterfactuals,
        success: true,
        cfLogs: data.cfLogs, // Include cfLogs in the response
        metadata: data.metadata, // Include metadata in the response
      };
    } catch (error) {
      console.error("Error generating session counterfactuals:", error);
      return {
        counterfactuals: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private static getPhaseNameFromStep(stepNumber: number): string {
    const phaseNames = [
      "situationSelection",
      "situationModification",
      "attentionalDeployment",
      "cognitiveChange",
      "responseModulation",
    ];
    return phaseNames[stepNumber] || "situationSelection";
  }

  /**
   * Get counterfactuals for a specific step from cached results
   */
  static getCounterfactualsForStep(
    counterfactuals: Counterfactual[],
    stepNumber: number
  ): Counterfactual[] {
    return counterfactuals.filter((cf) => cf.stepNumber === stepNumber);
  }

  /**
   * Select a counterfactual
   */
  static selectCounterfactual(
    counterfactuals: Counterfactual[],
    counterfactualId: string
  ): Counterfactual[] {
    return counterfactuals.map((cf) => ({
      ...cf,
      isSelected: cf.id === counterfactualId,
    }));
  }

  /**
   * Check if FastAPI service is available
   */
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Analyze cfLogs data to provide insights about the counterfactual generation process
   */
  static analyzeCfLogs(cfLogs: {
    sorted20?: string[];
    feasibilityScore20?: number[];
    similarityScore20?: number[];
    sorted15?: string[];
    similarityScore15?: number[];
    feasibilityScore15?: number[];
    similar2_chosen?: string[];
    neutral1_chosen?: string[];
    different2_chosen?: string[];
  }): {
    totalGenerated: number;
    averageFeasibilityScore: number;
    averageSimilarityScore: number;
    chosenCounts: {
      similar: number;
      neutral: number;
      different: number;
    };
    insights: string[];
  } {
    const insights: string[] = [];
    let totalGenerated = 0;
    let totalFeasibilityScore = 0;
    let totalSimilarityScore = 0;
    let feasibilityCount = 0;
    let similarityCount = 0;

    // Analyze sorted20 data
    if (cfLogs.sorted20) {
      totalGenerated += cfLogs.sorted20.length;
      insights.push(
        `Generated ${cfLogs.sorted20.length} initial counterfactuals`
      );
    }

    // Analyze feasibility scores
    if (cfLogs.feasibilityScore20) {
      totalFeasibilityScore += cfLogs.feasibilityScore20.reduce(
        (sum: number, score: number) => sum + score,
        0
      );
      feasibilityCount += cfLogs.feasibilityScore20.length;
    }
    if (cfLogs.feasibilityScore15) {
      totalFeasibilityScore += cfLogs.feasibilityScore15.reduce(
        (sum: number, score: number) => sum + score,
        0
      );
      feasibilityCount += cfLogs.feasibilityScore15.length;
    }

    // Analyze similarity scores
    if (cfLogs.similarityScore20) {
      totalSimilarityScore += cfLogs.similarityScore20.reduce(
        (sum: number, score: number) => sum + score,
        0
      );
      similarityCount += cfLogs.similarityScore20.length;
    }
    if (cfLogs.similarityScore15) {
      totalSimilarityScore += cfLogs.similarityScore15.reduce(
        (sum: number, score: number) => sum + score,
        0
      );
      similarityCount += cfLogs.similarityScore15.length;
    }

    // Analyze chosen categories
    const chosenCounts = {
      similar: cfLogs.similar2_chosen?.length || 0,
      neutral: cfLogs.neutral1_chosen?.length || 0,
      different: cfLogs.different2_chosen?.length || 0,
    };

    const averageFeasibilityScore =
      feasibilityCount > 0 ? totalFeasibilityScore / feasibilityCount : 0;
    const averageSimilarityScore =
      similarityCount > 0 ? totalSimilarityScore / similarityCount : 0;

    // Generate insights
    if (averageFeasibilityScore > 0.7) {
      insights.push("High feasibility scores suggest practical alternatives");
    } else if (averageFeasibilityScore < 0.3) {
      insights.push("Low feasibility scores suggest challenging alternatives");
    }

    if (averageSimilarityScore > 0.7) {
      insights.push(
        "High similarity scores suggest closely related alternatives"
      );
    } else if (averageSimilarityScore < 0.3) {
      insights.push("Low similarity scores suggest diverse alternatives");
    }

    if (chosenCounts.similar > 0) {
      insights.push(`Selected ${chosenCounts.similar} similar alternatives`);
    }
    if (chosenCounts.neutral > 0) {
      insights.push(`Selected ${chosenCounts.neutral} neutral alternatives`);
    }
    if (chosenCounts.different > 0) {
      insights.push(
        `Selected ${chosenCounts.different} different alternatives`
      );
    }

    return {
      totalGenerated,
      averageFeasibilityScore,
      averageSimilarityScore,
      chosenCounts,
      insights,
    };
  }
}
