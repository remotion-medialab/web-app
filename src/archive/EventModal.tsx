// import React, { useState } from "react";

// interface EventModalProps {
//   day: string;
//   hour: number;
//   onClose: () => void;
//   onSave: (event: { title: string; entry: string; day: string; startHour: number; endHour: number; color: string }) => void;
// }

// export default function EventModal({ day, hour, onClose, onSave }: EventModalProps) {
//   const [title, setTitle] = useState("");
//   const [entry, setEntry] = useState("");
//   const [color, setColor] = useState("bg-green-300");

//   const handleSave = () => {
//     if (!entry.trim()) {
//       alert("Entry cannot be empty.");
//       return;
//     }
//     onSave({
//       title,
//       entry,
//       day,
//       startHour: hour,
//       endHour: hour + 1,
//       color,
//     });
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white p-4 rounded w-full max-w-md">
//         <h2 className="text-lg font-semibold mb-2">New Journal Entry</h2>
//         <input
//           className="w-full border mb-2 px-2 py-1"
//           placeholder="Optional title (e.g. Workplace Fiasco)"
//           value={title}
//           onChange={(e) => setTitle(e.target.value)}
//         />
//         <textarea
//           className="w-full border mb-2 px-2 py-1 h-24"
//           placeholder="Write your journal entry..."
//           value={entry}
//           onChange={(e) => setEntry(e.target.value)}
//         />
//         <div className="mb-2">
//           <label className="block text-sm">Label Color:</label>
//           <select
//             className="w-full border px-2 py-1"
//             value={color}
//             onChange={(e) => setColor(e.target.value)}
//           >
//             <option value="bg-green-300">Green</option>
//             <option value="bg-blue-300">Blue</option>
//             <option value="bg-yellow-300">Yellow</option>
//             <option value="bg-red-300">Red</option>
//             <option value="bg-purple-300">Purple</option>
//           </select>
//         </div>
//         <div className="flex justify-end gap-2">
//           <button className="bg-gray-200 px-3 py-1" onClick={onClose}>Cancel</button>
//           <button className="bg-blue-500 text-white px-3 py-1" onClick={handleSave}>Save</button>
//         </div>
//       </div>
//     </div>
//   );
// }