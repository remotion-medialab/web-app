import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
  userId: string | null;
  loading: boolean;
  signInAsTestUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log(
        "🔐 Auth state changed:",
        user ? `User: ${user.uid}` : "No user"
      );
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInAsTestUser = async () => {
    try {
      setLoading(true);

      // For demo purposes, you can either:
      // 1. Sign in anonymously
      // await signInAnonymously(auth);

      // 2. Or set a specific test user ID (for development)
      const testUserId = "41cYzOW6hpT1QpNfMuWLTaJRxoB2"; // Your test user

      // Create a mock user object for development
      const mockUser = {
        uid: testUserId,
        email: "test@example.com",
        displayName: "Test User",
      } as User;

      setUser(mockUser);
      console.log("🔐 Signed in as test user:", testUserId);
    } catch (error) {
      console.error("❌ Sign in failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    userId: user?.uid || null,
    loading,
    signInAsTestUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
