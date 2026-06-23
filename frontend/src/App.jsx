import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { despertarBackend } from "./services/api";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Welcome from "./pages/Welcome";
import Register from "./pages/Register";
import Panel from "./pages/Panel"; 
import Especialidad from './pages/Especialidad';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

export default function App() {
  useEffect(() => { despertarBackend(); }, []);

  return (
    <BrowserRouter>
      <div className="bg-[#D9F0FB] min-h-screen">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/especialidad/:id" element={<Especialidad />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/panel" element={<Panel />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}