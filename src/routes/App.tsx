import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./Home";
import VideoChat from "./VideoChat";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/chat" element={<VideoChat />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

