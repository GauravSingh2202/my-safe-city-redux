import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Navbar from "@/components/Navbar";
import SOSButton from "@/components/SOSButton";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ReportCrimePage from "@/pages/ReportCrimePage";
import MyReportsPage from "@/pages/MyReportsPage";
import HeatmapPage from "@/pages/HeatmapPage";
import EmergencyServicesPage from "@/pages/EmergencyServicesPage";
import AdminDashboard from "@/pages/AdminDashboard";
import NotificationsPage from "@/pages/NotificationsPage";
import ProfilePage from "@/pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/report" element={<ReportCrimePage />} />
        <Route path="/my-reports" element={<MyReportsPage />} />
        <Route path="/heatmap" element={<HeatmapPage />} />
        <Route path="/emergency-services" element={<EmergencyServicesPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <SOSButton />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
