import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, UserRole } from "@/context/AuthContext";
import { ShieldAlert } from "lucide-react";
import { AlertProvider } from "@/context/AlertContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import AnalystProfile from "./pages/AnalystProfile";
import ManagerProfile from "./pages/ManagerProfile";
import Alerts from "./pages/Alerts";
import CriticalAlerts from "./pages/CriticalAlerts";
import EscalatedAlerts from "./pages/EscalatedAlerts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: UserRole[] }) => {
  const { user, isVerifyingSession } = useAuth();
  
  // While verifying if this is a duplicate tab, don't render anything
  if (isVerifyingSession) return null;
  
  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'soc_manager' ? '/manager' : '/dashboard'} replace />;
  }
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={user.role === 'soc_manager' ? '/manager' : '/dashboard'} replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AlertProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['junior_analyst']}><Dashboard /></ProtectedRoute>} />
              <Route path="/manager" element={<ProtectedRoute allowedRoles={['soc_manager']}><ManagerDashboard /></ProtectedRoute>} />
              <Route path="/critical" element={<ProtectedRoute><CriticalAlerts /></ProtectedRoute>} />
              <Route path="/escalated" element={<ProtectedRoute><EscalatedAlerts /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
              <Route path="/profile/analyst" element={<ProtectedRoute allowedRoles={['junior_analyst']}><AnalystProfile /></ProtectedRoute>} />
              <Route path="/profile/manager" element={<ProtectedRoute allowedRoles={['soc_manager']}><ManagerProfile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AlertProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
