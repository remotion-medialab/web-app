import React, { useState, useEffect } from "react";
import { addDays, startOfWeek, format, isSameDay } from "date-fns";
import EventModal from "./EventModal";
import { db, auth } from "../lib/firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

type EventType = {
  id: string;
  title: string;
  day: string;
  startHour: number;
  endHour: number;
  color: string;
  uid: string;
};

export default function WeeklyCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventType[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newEventSlot, setNewEventSlot] = useState<{ day: string; hour: number } | null>(null);

  const user = auth.currentUser;

  // Load events for current user
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
    setNewEventSlot({ day, hour });
    setModalOpen(true);
  };

  const handleSaveEvent = async (event: Omit<EventType, "id" | "uid">) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not logged in");

      const docRef = await addDoc(collection(db, "events"), { ...event, uid });
      setEvents([...events, { ...event, id: docRef.id, uid }]);
      setModalOpen(false);
    } catch (err) {
      console.error("Error adding event:", err);
    }
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
      <div className="overflow-auto">
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
              <div className="bg-white text-right pr-2 text-sm py-6">{hour}:00</div>
              {weekDates.map((date) => {
                const day = format(date, "EEEE");
                const event = events.find(
                  (e) =>
                    e.day === day &&
                    e.startHour === hour &&
                    isSameDay(date, new Date(currentDate))
                );
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`relative h-16 border-t border-gray-200 hover:bg-blue-50 cursor-pointer ${
                      format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                        ? "bg-yellow-50"
                        : "bg-white"
                    }`}
                    onClick={() => handleCreateEvent(day, hour)}
                  >
                    {event && (
                      <div
                        className={`absolute inset-0 px-2 py-1 text-sm font-medium text-black ${event.color}`}
                      >
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

      {/* Modal */}
      {modalOpen && newEventSlot && (
        <EventModal
          day={newEventSlot.day}
          hour={newEventSlot.hour}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
}
