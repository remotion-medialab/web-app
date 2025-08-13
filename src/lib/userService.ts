import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

export interface UserProfile {
  condition: "A" | "B" | "C";
  createdAt: Date;
  lastActive: Date;
  // Add more user fields here as needed
}

export class UserService {
  /**
   * Get user profile data
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profileRef = doc(db, "users", userId);
      const snap = await getDoc(profileRef);
      
      if (!snap.exists()) {
        return null;
      }
      
      const data = snap.data();
      return {
        condition: data.condition,
        createdAt: data.createdAt.toDate(),
        lastActive: data.lastActive.toDate(),
      };
    } catch (error) {
      console.error("❌ Failed to get user profile:", error);
      return null;
    }
  }

  /**
   * Update user's last active timestamp
   */
  static async updateLastActive(userId: string): Promise<void> {
    try {
      const profileRef = doc(db, "users", userId);
      await updateDoc(profileRef, {
        lastActive: new Date()
      });
    } catch (error) {
      console.error("❌ Failed to update last active:", error);
    }
  }

  /**
   * Update user condition (if needed for admin purposes)
   */
  static async updateUserCondition(userId: string, condition: "A" | "B" | "C"): Promise<void> {
    try {
      const profileRef = doc(db, "users", userId);
      await updateDoc(profileRef, {
        condition,
        lastActive: new Date()
      });
      
      // Update local cache
      localStorage.setItem("userCondition", condition);
    } catch (error) {
      console.error("❌ Failed to update user condition:", error);
    }
  }

  /**
   * Create or update user profile
   */
  static async createUserProfile(userId: string, condition: "A" | "B" | "C"): Promise<void> {
    try {
      const profileRef = doc(db, "users", userId);
      await setDoc(profileRef, {
        condition,
        createdAt: new Date(),
        lastActive: new Date()
      }, { merge: true });
      
      // Cache condition locally
      localStorage.setItem("userCondition", condition);
    } catch (error) {
      console.error("❌ Failed to create user profile:", error);
    }
  }
}
