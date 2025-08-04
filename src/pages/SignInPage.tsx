// src/pages/SignInPage.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../lib/firebase";

const SignInPage: React.FC = () => {
  const [step, setStep] = useState(0); // 0: Welcome, 1: Sign In, 2: Sign Up
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 2));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));
  const goToSignUp = () => setStep(2);
  const goToSignIn = () => setStep(1);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/insights");
    } catch (error: any) {
      setError(error.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/insights");
    } catch (error: any) {
      setError(error.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    // For demo purposes, encourage users to create an account
    setError("Please create an account or sign in to access the app.");
    setStep(2); // Go to sign up
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-center text-blue-600 px-4">
      {/* Progress Bar */}
      {step > 0 && (
        <div className="h-1 bg-gray-200 w-full mt-4">
          <div
            className="h-1 bg-blue-500"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col justify-center items-center space-y-8">
        {step === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center space-y-8">
            {/* Logo */}
            <img
              src="src/assets/logo.svg"
              alt="Logo"
              className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40"
            />

            {/* Text Block */}
            <div
              className="text-blue-500"
              style={{ fontFamily: "'SF Pro Display', sans-serif" }}
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                RE:SELF
              </h1>
              <p className="text-base sm:text-lg md:text-xl mt-2">
                Welcome to your insights dashboard.
              </p>
            </div>

            {/* Buttons */}
            <div className="space-y-4">
              <button
                onClick={goToSignIn}
                className="border text-blue-500 border-blue-500 px-6 py-2 rounded-full text-base sm:text-lg hover:bg-blue-50 transition block w-full"
                style={{
                  fontFamily: "'SF Pro Display', sans-serif",
                  borderWidth: "1.2px",
                  minWidth: "200px",
                }}
              >
                Sign In
              </button>

              <button
                onClick={goToSignUp}
                className="border text-blue-500 border-blue-500 px-6 py-2 rounded-full text-base sm:text-lg hover:bg-blue-50 transition block w-full"
                style={{
                  fontFamily: "'SF Pro Display', sans-serif",
                  borderWidth: "1.2px",
                  minWidth: "200px",
                }}
              >
                Sign Up
              </button>

              <button
                onClick={handleDemoAccess}
                className="text-blue-400 text-sm underline hover:text-blue-600 transition mt-4"
                style={{ fontFamily: "'SF Pro Display', sans-serif" }}
              >
                Need an account? Click here
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSignIn} className="space-y-6">
            <h2 className="text-xl font-medium mt-8">
              Sign in to your account
            </h2>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-full">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="border border-blue-300 rounded-full px-4 py-2 w-64 text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
                disabled={loading}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="border border-blue-300 rounded-full px-4 py-2 w-64 text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
                disabled={loading}
              />
            </div>

            <div className="flex space-x-4 mt-8">
              <button
                type="button"
                onClick={prevStep}
                className="border border-blue-600 text-blue-600 px-6 py-2 rounded-full hover:bg-blue-50"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="border border-blue-600 text-blue-600 px-6 py-2 rounded-full hover:bg-blue-50 disabled:opacity-50"
                disabled={loading || !email || !password}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={goToSignUp}
                className="text-blue-400 text-sm underline hover:text-blue-600"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSignUp} className="space-y-6">
            <h2 className="text-xl font-medium mt-8">Create your account</h2>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-full">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="border border-blue-300 rounded-full px-4 py-2 w-64 text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
                disabled={loading}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="border border-blue-300 rounded-full px-4 py-2 w-64 text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
                disabled={loading}
                minLength={6}
              />

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="border border-blue-300 rounded-full px-4 py-2 w-64 text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div className="flex space-x-4 mt-8">
              <button
                type="button"
                onClick={prevStep}
                className="border border-blue-600 text-blue-600 px-6 py-2 rounded-full hover:bg-blue-50"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="border border-blue-600 text-blue-600 px-6 py-2 rounded-full hover:bg-blue-50 disabled:opacity-50"
                disabled={loading || !email || !password || !confirmPassword}
              >
                {loading ? "Creating Account..." : "Sign Up"}
              </button>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={goToSignIn}
                className="text-blue-400 text-sm underline hover:text-blue-600"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SignInPage;
