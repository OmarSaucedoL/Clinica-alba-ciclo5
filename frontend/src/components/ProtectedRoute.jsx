import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth_store'; 

export default function ProtectedRoute() {
  const user = useAuthStore((state) => state.user);

  // Si no hay usuario en el store, mandamos al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}