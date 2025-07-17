// src/pages/EntryPage.tsx

import React from "react";
import { useLocation } from "react-router-dom";

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const EntryPage: React.FC = () => {
  const query = useQuery();
  const date = query.get("date");
  const time = query.get("time");

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex">
      <div className="w-1/2 bg-white border rounded-lg p-6">
        <h1 className="text-xl font-semibold" style={{ color: "#545454" }}>
          Voice Log Overview
        </h1>
        <p className="text-sm" style={{ color: "#b0b0b0" }}>
          Daily voice entries • {date} {time}
        </p>
        {/* Optionally you can render the calendar again here if desired */}
      </div>

      <div className="w-1/2 bg-white border rounded-lg p-6 flex flex-col overflow-y-auto ml-4">
        <h2 className="text-lg font-semibold" style={{ color: "#545454" }}>
          {date}, {time}
        </h2>
        <p className="text-sm mb-4" style={{ color: "#b0b0b0" }}>
          Voice entry transcript
        </p>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {[
            "What is the situation you engaged in or avoided?",
            "Did you do anything to impact how the situation unfolded, if any?",
            "Can you remember what caught your attention or focused on the situation?",
            "How did you interpret the situation at the time?",
          ].map((prompt, idx) => (
            <div key={idx} className="flex flex-col">
              <label
                className="text-sm font-medium mb-1"
                style={{ color: "#545454" }}
              >
                {prompt}
              </label>
              <textarea
                className="border rounded p-2 text-sm"
                rows={3}
                style={{ borderColor: "#d4d4d4", color: "#545454" }}
                defaultValue={"Your saved text here..."}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EntryPage;
