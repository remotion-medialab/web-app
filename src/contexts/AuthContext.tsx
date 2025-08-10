import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import toast from "react-hot-toast";
import { auth } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
  userId: string | null;
  loading: boolean;
  logout: () => Promise<void>;
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
