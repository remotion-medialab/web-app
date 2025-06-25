// src/App.tsx
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import Auth from "./components/Auth";
import WeeklyCalendar from "./components/WeeklyCalendar";
import ReflectionPage from "./pages/ReflectionPage";
import RecordingPage from "./pages/RecordingPage";
import CreatePathPage from "./pages/CreatePathPage";

export default function App() {
  const [user, setUser] = useState(() => auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);

      // // Always redirect to calendar on login
      // if (user && window.location.pathname !== "/") {
      //   window.history.replaceState(null, "", "/");
      // }
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!user) return <Auth onAuth={() => setUser(auth.currentUser)} />;

  return (
    <Router>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm">
            Welcome back {user.displayName || user.email}!
          </div>
          <button
            onClick={async () => {
              await signOut(auth);
              setUser(null);
            }}
            className="text-sm bg-red-500 text-white px-3 py-1 rounded"
          >
            Log Out
          </button>
        </div>
        <Routes>
          <Route path="/" element={<WeeklyCalendar />} />
          <Route path="/record" element={<RecordingPage />} />
          <Route path="/reflection" element={<ReflectionPage />} />
          <Route path="/create-path" element={<CreatePathPage />} />
        </Routes>
      </div>
    </Router>
  );
}
