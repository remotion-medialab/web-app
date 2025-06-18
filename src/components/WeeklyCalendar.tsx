import React, { useState, useEffect, useRef } from "react";
import { addDays, startOfWeek, format } from "date-fns";
import { db, auth } from "../lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23

type EventType = {
  id: string;
  title?: string;
  entry: string;
  day: string;
  startHour: number;
  endHour: number;
  color: string;
  uid: string;
};

export default function WeeklyCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventType[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => {
      const nowHour = new Date().getHours();
      const scrollTarget = containerRef.current?.querySelector(`[data-hour='${nowHour}']`);
      scrollTarget?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const snapshot = await getDocs(collection(db, "events"));
      const loaded = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((doc: any) => doc.uid === uid) as EventType[];

      setEvents(loaded);
    };

    fetchEvents();
  }, []);

  const weekDates = Array.from({ length: 7 }).map((_, i) =>
    addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), i)
  );

  const handleCreateEvent = (day: string, hour: number) => {
    const timestamp = `Recording ${format(new Date(day), "dd.MM.yy")}`;
    navigate("/reflection", { state: { timestamp } });
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      await deleteDoc(doc(db, "events", id));
      setEvents(events.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12} ${ampm}`;
  };

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const minuteOffset = (currentMinute / 60) * 100;

  return (
    <div className="font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white z-20">
        <div className="flex justify-between items-center px-6 pt-6 pb-2">
          <div className="text-xl font-semibold text-gray-800 tracking-wide w-1/4" />
          <div className="text-center text-lg font-semibold text-gray-800 w-1/2">
            {format(currentDate, "MMMM yyyy").toUpperCase()}
          </div>
          <div className="w-1/4 flex justify-end gap-4 text-gray-500 text-lg">
            <button onClick={() => setCurrentDate((prev) => addDays(prev, -7))}>{"<"}</button>
            <button onClick={() => setCurrentDate(new Date())}>Today</button>
            <button onClick={() => setCurrentDate((prev) => addDays(prev, 7))}>{">"}</button>
          </div>
        </div>

        {/* Days Header Row */}
        <div className="grid grid-cols-8 border-t border-b border-gray-200 px-6">
          <div className="text-xs text-gray-500 text-right pr-2">GMT-04</div>
          {weekDates.map((date) => {
            const isToday = format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
            return (
              <div
                key={date.toISOString()}
                className={`text-center py-2 border-l border-gray-200 ${
                  isToday ? "text-blue-600 font-bold bg-blue-50" : "text-gray-900"
                }`}
              >
                <div className="text-sm">{format(date, "EEE")}</div>
                <div className="text-lg font-bold">{format(date, "d")}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable Grid */}
      <div className="overflow-auto" ref={containerRef}>
        <div className="grid grid-cols-8 px-6">
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div
                className="text-xs text-gray-500 text-right pr-2 pt-1 border-t border-gray-200"
                data-hour={hour}
              >
                {formatHour(hour)}
              </div>
              {weekDates.map((date, i) => {
                const isCurrentDay = format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
                const showNowLine = isCurrentDay && hour === currentHour;
                const event = events.find(
                  (e) =>
                    e.startHour === hour &&
                    format(date, "yyyy-MM-dd") === e.day
                );

                return (
                  <div
                    key={`${date}-${hour}`}
                    className={`relative h-10 border-t border-l border-gray-200 hover:bg-blue-50 cursor-pointer ${
                      isCurrentDay ? "bg-blue-50" : "bg-white"
                    }`}
                    onClick={() => handleCreateEvent(format(date, "yyyy-MM-dd"), hour)}
                  >
                    {/* Time dot and line */}
                    {showNowLine && (
                      <div
                        className="absolute left-0 w-full z-10"
                        style={{ top: `${minuteOffset}%` }}
                      >
                        <div className="h-0.5 bg-blue-500 w-full" />
                        <div className="w-2 h-2 bg-blue-500 rounded-full absolute -top-1 left-0" />
                      </div>
                    )}

                    {/* Event */}
                    {event && (
                      <div className="absolute inset-0 flex items-center justify-start px-2 text-sm text-blue-600 bg-blue-100 rounded-full mx-2 my-1">
                        {event.title || "Untitled Entry"}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                          }}
                          className="ml-2 text-xs text-red-500 underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
