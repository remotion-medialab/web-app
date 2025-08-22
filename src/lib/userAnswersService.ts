import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

export interface UserAnswer {
  id: string;
  userId: string;
  recordingId: string; // Changed from sessionNumber to recordingId
  sessionId: string; // Keep sessionId for reference
  sessionNumber: number; // Add sessionNumber for backward compatibility
  stepNumber: number;
  question: string;
  answers: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class UserAnswersService {
  private static ROOT = "users";

  /**
   * Save user answers for a specific recording
   */
  static async saveUserAnswers(
    userId: string,
    sessionId: string,
    recordingId: string, // Added recordingId parameter
    stepNumber: number,
    question: string,
    answers: string[]
  ): Promise<UserAnswer> {
    const answerId = `recording-${recordingId}`; // Changed to use recordingId
    const docPath = `${this.ROOT}/${userId}/sessions/${sessionId}/user_answers/${answerId}`;

    // Extract session number from sessionId for backward compatibility
    const sessionNumberMatch = sessionId.match(/(?:session|legacy-)(\d+)/);
    const sessionNumber = sessionNumberMatch ? parseInt(sessionNumberMatch[1]) : 0;

    const answerData: UserAnswer = {
      id: answerId,
      userId,
      recordingId, // Store the recording ID
      sessionId, // Store the session ID
      sessionNumber,
      stepNumber,
      question,
      answers,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docData = {
      ...answerData,
      createdAt: Timestamp.fromDate(answerData.createdAt),
      updatedAt: Timestamp.fromDate(answerData.updatedAt),
    };

    const docRef = doc(db, docPath);
    await setDoc(docRef, docData);

    console.log("✅ User answers saved:", docPath, "for recording:", recordingId);
    return answerData;
  }

  /**
   * Get user answers for a specific recording
   */
  static async getUserAnswers(
    userId: string,
    sessionId: string,
    recordingId: string // Changed parameter
  ): Promise<UserAnswer | null> {
    const answerId = `recording-${recordingId}`; // Changed to use recordingId
    const docPath = `${this.ROOT}/${userId}/sessions/${sessionId}/user_answers/${answerId}`;

    const docRef = doc(db, docPath);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as UserAnswer;
  }

  /**
   * Get user answers for a specific step (for backward compatibility)
   * @deprecated Use getUserAnswers with recordingId instead
   */
  static async getUserAnswersByStep(
    userId: string,
    sessionId: string,
    stepNumber: number
  ): Promise<UserAnswer | null> {
    const answerId = `step-${stepNumber}`;
    const docPath = `${this.ROOT}/${userId}/sessions/${sessionId}/user_answers/${answerId}`;

    const docRef = doc(db, docPath);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as UserAnswer;
  }

  /**
   * Get all user answers for a session
   */
  static async getSessionUserAnswers(
    userId: string,
    sessionId: string
  ): Promise<UserAnswer[]> {
    const q = query(
      collection(
        db,
        `${this.ROOT}/${userId}/sessions/${sessionId}/user_answers`
      ),
      orderBy("stepNumber", "asc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as UserAnswer;
    });
  }

  /**
   * Add a new answer to existing answers for a specific recording
   */
  static async addUserAnswer(
    userId: string,
    sessionId: string,
    recordingId: string, // Changed parameter
    stepNumber: number,
    question: string,
    newAnswer: string
  ): Promise<UserAnswer> {
    const existingAnswers = await this.getUserAnswers(
      userId,
      sessionId,
      recordingId
    );

    if (existingAnswers) {
      // Add to existing answers
      const updatedAnswers = [...existingAnswers.answers, newAnswer];
      return this.saveUserAnswers(
        userId,
        sessionId,
        recordingId,
        stepNumber,
        question,
        updatedAnswers
      );
    } else {
      // Create new answers array
      return this.saveUserAnswers(userId, sessionId, recordingId, stepNumber, question, [
        newAnswer,
      ]);
    }
  }

  /**
   * Get user answers for multiple recordings in a session
   */
  static async getRecordingsUserAnswers(
    userId: string,
    sessionId: string,
    recordingIds: string[]
  ): Promise<Record<string, UserAnswer>> {
    const answersMap: Record<string, UserAnswer> = {};

    // Fetch answers for each recording
    for (const recordingId of recordingIds) {
      try {
        const answer = await this.getUserAnswers(userId, sessionId, recordingId);
        if (answer) {
          answersMap[recordingId] = answer;
        }
      } catch (error) {
        console.error(`Error fetching answers for recording ${recordingId}:`, error);
      }
    }

    return answersMap;
  }
}
