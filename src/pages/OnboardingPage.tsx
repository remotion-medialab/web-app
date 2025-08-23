// src/pages/OnboardingPage.tsx

// src/pages/OnboardingPage.tsx

import React, { useState } from "react";
import Logo from "../assets/logo.svg";
import { useNavigate } from "react-router-dom";

const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [participantId, setParticipantId] = useState("");
  const navigate = useNavigate();

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 2));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

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
              src={Logo}
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
                Welcome to your mind.
              </p>
            </div>

            {/* Button */}
            <button
              onClick={nextStep}
              className="border text-blue-500 border-blue-500 px-6 py-2 rounded-full text-base sm:text-lg hover:bg-blue-50 transition"
              style={{
                fontFamily: "'SF Pro Display', sans-serif",
                borderWidth: "1.2px",
              }}
            >
              Get Started
            </button>
          </div>
        )}

        {step === 1 && (
          <>
            <h2 className="text-xl font-medium mt-8">
              First, please enter your participant ID.
            </h2>
            <input
              type="text"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="Enter your response here"
              className="mt-4 border border-blue-300 rounded-full px-4 py-2 w-64 text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex space-x-4 mt-8">
              <button
                onClick={prevStep}
                className="border border-blue-600 text-blue-600 px-6 py-2 rounded-full hover:bg-blue-50"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="border border-blue-600 text-blue-600 px-6 py-2 rounded-full hover:bg-blue-50"
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-medium mt-8">
              Welcome! <br />
              Ready to get started?
            </h2>
            <div className="flex space-x-4 mt-8">
              <button
                onClick={prevStep}
                className="border border-blue-600 text-blue-600 px-6 py-2 rounded-full hover:bg-blue-50"
              >
                Back
              </button>
              <button
                onClick={() => {
                  navigate("/study");
                }}
                className="border border-blue-600 text-blue-600 px-6 py-2 rounded-full hover:bg-blue-50"
              >
                Enter
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
