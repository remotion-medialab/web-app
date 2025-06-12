import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="h-screen bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
      <h1 className="text-4xl font-bold text-indigo-800">Hello SIMTREE 🌱</h1>
    </div>
  );  
}

export default App
