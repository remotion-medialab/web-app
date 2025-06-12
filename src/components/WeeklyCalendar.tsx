// src/components/WeeklyCalendar.tsx
import React from "react";
import { sampleEvents } from "../data/sampleEvents";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

export default function WeeklyCalendar() {
  return (
    <div className="overflow-auto p-4">
      <div className="grid grid-cols-8 gap-px border border-gray-300 bg-gray-100">
        {/* Header row */}
        <div className="bg-white sticky top-0 z-10" />
        {days.map((day) => (
          <div key={day} className="bg-white text-center font-semibold py-2 sticky top-0 z-10">
            {day}
          </div>
        ))}

        {/* Time rows */}
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            <div className="bg-white text-right pr-2 text-sm py-6">
              {hour}:00
            </div>
            {days.map((day) => {
              const event = sampleEvents.find(
                (e) => e.day === day && e.startHour === hour
              );
              return (
                <div
                  key={`${day}-${hour}`}
                  className={`relative h-16 border-t border-gray-200 ${
                    event ? event.color : "bg-white"
                  }`}
                >
                  {event && (
                    <div className="absolute inset-0 px-2 py-1 text-sm text-black font-medium">
                      {event.title}
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
