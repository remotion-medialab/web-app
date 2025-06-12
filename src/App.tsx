import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import WeeklyCalendar from "./components/WeeklyCalendar";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4">SIMTREE: Weekly Reflection</h1>
      <WeeklyCalendar />
    </div>
  );
}

export default App;
