// src/components/Auth.tsx
import { useState } from "react";
import { auth } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";

export default function Auth({ onAuth }: { onAuth: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleSignUp = async () => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCred.user, { displayName: username });
      onAuth();
    } catch (err) {
      alert("Signup failed: " + (err as Error).message);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onAuth();
    } catch (err) {
      alert("Login failed: " + (err as Error).message);
    }
  };

  return (
    <div className="p-4 max-w-sm mx-auto space-y-3">
      <h2 className="text-xl font-bold">Log in / Sign up</h2>
      <input
        className="w-full border px-2 py-1"
        type="text"
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        className="w-full border px-2 py-1"
        type="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="w-full border px-2 py-1"
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex gap-2">
        <button className="bg-blue-500 text-white px-3 py-1" onClick={handleSignIn}>Log In</button>
        <button className="bg-gray-300 px-3 py-1" onClick={handleSignUp}>Sign Up</button>
      </div>
    </div>
  );
}
