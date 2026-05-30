import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layouts/Navbar';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import PredictionForm from '@/pages/PredictionForm';
import PredictionResults from '@/pages/PredictionResults';
import PredictionHistory from '@/pages/PredictionHistory';
import MedicalProfilePage from '@/pages/MedicalProfilePage';
import MLPrediction from '@/pages/MLPrediction';
import ChatPage from '@/pages/ChatPage';
import AdminPage from '@/pages/AdminPage';
import NotFound from '@/pages/NotFound';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/predict" element={<RequireAuth><PredictionForm /></RequireAuth>} />
          <Route path="/results/:id" element={<RequireAuth><PredictionResults /></RequireAuth>} />
          <Route path="/history" element={<RequireAuth><PredictionHistory /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><MedicalProfilePage /></RequireAuth>} />
          <Route path="/ml-predict" element={<RequireAuth><MLPrediction /></RequireAuth>} />
          <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
