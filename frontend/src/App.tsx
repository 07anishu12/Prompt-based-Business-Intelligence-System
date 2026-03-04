import { Routes, Route, Navigate } from "react-router-dom";

function App() {
  return (
    <Routes>
      {/* Routes will be added as pages are built */}
      <Route path="/" element={<div className="p-8 text-center text-lg">Prompt BI — Dashboard List (coming soon)</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
