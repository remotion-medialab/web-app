// src/components/EventModal.tsx
import React, { useState } from "react";

type Props = {
  day: string;
  hour: number;
  onClose: () => void;
  onSave: (event: {
    title: string;
    day: string;
    startHour: number;
    endHour: number;
    color: string;
  }) => void;
};

export default function EventModal({ day, hour, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({
      title,
      day,
      startHour: hour,
      endHour: hour + 1,
      color: "bg-green-300",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-80">
        <h2 className="text-lg font-semibold mb-2">New Reflection</h2>
        <p className="text-sm mb-4">
          {day} at {hour}:00
        </p>
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          placeholder="e.g. Called mom, Bad meeting..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm text-gray-600 hover:underline"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
