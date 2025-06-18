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

  // Scroll to current hour on mount
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
    return `${hour12}:00 ${ampm}`;
  };

  return (
    <div className="p-4">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Today
        </button>
        <div className="space-x-2">
          <button
            onClick={() => setCurrentDate((prev) => addDays(prev, -7))}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            ← Prev
          </button>
          <button
            onClick={() => setCurrentDate((prev) => addDays(prev, 7))}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-auto" ref={containerRef}>
        <div className="grid grid-cols-8 gap-px border border-gray-300 bg-gray-100">
          {/* Header row */}
          <div className="bg-white sticky top-0 z-10" />
          {weekDates.map((date) => (
            <div
              key={date.toISOString()}
              className={`text-center font-semibold py-2 sticky top-0 z-10 ${
                format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                  ? "bg-yellow-100 text-indigo-700"
                  : "bg-white"
              }`}
            >
              {format(date, "EEE d")}
            </div>
          ))}

          {/* Time rows */}
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div
                className="bg-white text-right pr-2 text-sm py-6"
                data-hour={hour}
              >
                {formatHour(hour)}
              </div>
              {weekDates.map((date) => {
                const event = events.find(
                  (e) =>
                    e.startHour === hour &&
                    format(date, "yyyy-MM-dd") === e.day
                );
                return (
                  <div
                    key={`${date}-${hour}`}
                    className={`relative h-16 border-t border-gray-200 hover:bg-blue-50 cursor-pointer ${
                      format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                        ? "bg-yellow-50"
                        : "bg-white"
                    }`}
                    onClick={() => handleCreateEvent(format(date, "yyyy-MM-dd"), hour)}
                  >
                    {event && (
                      <div className={`absolute inset-0 p-2 text-sm text-black ${event.color}`}>
                        <div className="font-semibold">{event.title || "Untitled Entry"}</div>
                        <div className="text-xs italic text-gray-500">"Dive deeper" placeholder</div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                          }}
                          className="text-red-500 text-xs underline mt-1"
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
