// Counterfactual generation service for coping strategies
import type { Recording } from './recordingsService';

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
}

// Interfaces are already exported above with 'export interface'

interface CounterfactualResponse {
  counterfactuals: string[];
  original_text: string;
}

interface CounterfactualInput {
  text: string;
}

// Configure API URL based on environment
const COUNTERFACTUAL_API_URL = import.meta.env.VITE_COUNTERFACTUAL_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:8000' : 'https://coping-counterfactual.fly.dev');

export const generateCounterfactuals = async (
  questionResponses: string[]
): Promise<string[]> => {
  try {
    // Join the 5 responses with newlines as expected by the backend
    const inputText = questionResponses.join('\n');
    
    const response = await fetch(`${COUNTERFACTUAL_API_URL}/counterfactual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: inputText } as CounterfactualInput),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data: CounterfactualResponse = await response.json();
    return data.counterfactuals;
  } catch (error) {
    console.error('Error generating counterfactuals:', error);
    
    // Return mock counterfactuals in case of error
    return [
      "What if you had approached the situation differently?",
      "What if you had modified your environment?", 
      "What if you had focused your attention elsewhere?",
      "What if you had reframed your thoughts?",
      "What if you had responded in a different way?"
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
  private static API_BASE_URL = import.meta.env.VITE_COUNTERFACTUAL_API_URL || 
    (import.meta.env.DEV ? 'http://localhost:8000' : 'https://coping-counterfactual.fly.dev');

  /**
   * Generate counterfactuals for a complete 5-step session
   * Uses the new single-entry API for each recording
   */
  static async generateCounterfactuals(request: CounterfactualGenerationRequest): Promise<CounterfactualGenerationResponse> {
    try {
      const allCounterfactuals: Counterfactual[] = [];

      // Use session-level counterfactual generation
      const result = await this.generateSessionCounterfactuals(request.userId, request.recordings);
      if (result.success) {
        allCounterfactuals.push(...result.counterfactuals);
      }

      return {
        counterfactuals: allCounterfactuals,
        success: true
      };

    } catch (error) {
      console.error('Error generating counterfactuals:', error);
      return {
        counterfactuals: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate counterfactuals for a complete 5-step session
   */
  static async generateSessionCounterfactuals(
    userId: string,
    recordings: Recording[]
  ): Promise<CounterfactualGenerationResponse> {
    try {
      // Build 5-phase text from recordings (0-4 steps)
      const phaseTexts = ['', '', '', '', ''];
      recordings.forEach(recording => {
        if (recording.stepNumber >= 0 && recording.stepNumber < 5) {
          phaseTexts[recording.stepNumber] = recording.transcription?.text || '';
        }
      });

      const fullText = phaseTexts.join('\n');
      
      const response = await fetch(`${this.API_BASE_URL}/counterfactual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: fullText })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Map the 5 counterfactuals to our format
      const counterfactuals: Counterfactual[] = data.counterfactuals.map((cf: string, index: number) => ({
        id: `cf_session_${index}`,
        recordingId: recordings[0]?.id || 'session',
        stepNumber: index,
        originalText: phaseTexts[index] || '',
        counterfactualText: cf,
        whichPhase: this.getPhaseNameFromStep(index),
        isSelected: false,
        createdAt: new Date()
      }));

      return {
        counterfactuals,
        success: true
      };

    } catch (error) {
      console.error('Error generating session counterfactuals:', error);
      return {
        counterfactuals: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static getPhaseNameFromStep(stepNumber: number): string {
    const phaseNames = [
      'situationSelection',
      'situationModification',
      'attentionalDeployment', 
      'cognitiveChange',
      'responseModulation'
    ];
    return phaseNames[stepNumber] || 'situationSelection';
  }

  /**
   * Map emotion regulation phase names to step numbers
   */
  private static getStepNumberFromPhase(phase: string): number {
    const phaseMap: Record<string, number> = {
      'situationSelection': 0,
      'situationModification': 1,
      'attentionalDeployment': 2,
      'cognitiveChange': 3,
      'responseModulation': 4
    };
    return phaseMap[phase] || 0;
  }

  /**
   * Get counterfactuals for a specific step from cached results
   */
  static getCounterfactualsForStep(
    counterfactuals: Counterfactual[],
    stepNumber: number
  ): Counterfactual[] {
    return counterfactuals.filter(cf => cf.stepNumber === stepNumber);
  }

  /**
   * Select a counterfactual
   */
  static selectCounterfactual(
    counterfactuals: Counterfactual[],
    counterfactualId: string
  ): Counterfactual[] {
    return counterfactuals.map(cf => ({
      ...cf,
      isSelected: cf.id === counterfactualId
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
}