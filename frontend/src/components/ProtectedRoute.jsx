import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth_store'; 

export default function ProtectedRoute() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  // Si no hay usuario en el store, mandamos al login preservando parámetros (ej: ?checkin_token=...)
  if (!user) {
    return <Navigate to={`/login${location.search}`} replace />;
  }

  return <Outlet />;
}