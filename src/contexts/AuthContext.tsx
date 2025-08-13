import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { db } from "../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { auth } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
  userId: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  condition: "A" | "B" | "C" | null;
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
  const [condition, setCondition] = useState<"A" | "B" | "C" | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(
        "🔐 Auth state changed:",
        user ? `User: ${user.uid}` : "No user"
      );
      setUser(user);
      // Load cached condition immediately for snappy UI
      try {
        const cached = localStorage.getItem("userCondition");
        if (cached === "A" || cached === "B" || cached === "C") {
          setCondition(cached);
        }
      } catch {}

      // Load user condition from Firestore profile and update lastActive
      if (user) {
        try {
          const profileRef = doc(db, "users", user.uid);
          const snap = await getDoc(profileRef);
          const data = snap.exists() ? snap.data() : null;
          const cond = data?.condition as "A" | "B" | "C" | undefined;
          setCondition(cond ?? null);
          // Sync cache
          if (cond) {
            try {
              localStorage.setItem("userCondition", cond);
            } catch (e) {
              console.warn("⚠️ Failed to cache user condition", e);
            }
          }
          
          // Update lastActive timestamp
          await updateDoc(profileRef, {
            lastActive: new Date()
          });
        } catch (e) {
          console.warn("⚠️ Failed to load user condition or update lastActive", e);
          setCondition(null);
        }
      } else {
        setCondition(null);
        try {
          localStorage.removeItem("userCondition");
        } catch (e) {
          console.warn("⚠️ Failed to remove cached user condition", e);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      setLoading(true);
      console.log("🔓 Signing out user...");
      await signOut(auth);
      console.log("✅ User signed out successfully");
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("❌ Sign out failed:", error);
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    userId: user?.uid || null,
    loading,
    logout,
    condition,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
