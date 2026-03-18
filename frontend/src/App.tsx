import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Toaster } from "@/components/ui/toaster";

// Pages
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import SalonSetupPage from "@/pages/SalonSetupPage";
import StylistListPage from "@/pages/StylistListPage";
import StylistFormPage from "@/pages/StylistFormPage";
import GeneratePage from "@/pages/GeneratePage";
import ChatPage from "@/pages/ChatPage";
import HistoryPage from "@/pages/HistoryPage";
import LandingPage from "@/pages/LandingPage";
import CsvImportPage from "@/pages/CsvImportPage";
import TeamSalonListPage from "@/pages/TeamSalonListPage";
import OrgMembersPage from "@/pages/OrgMembersPage";
import BillingPage from "@/pages/BillingPage";
import BillingSuccessPage from "@/pages/BillingSuccessPage";
import SettingsPage from "@/pages/SettingsPage";

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">読み込み中...</p>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirect to dashboard if logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/salon/setup"
          element={
            <ProtectedRoute>
              <SalonSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stylists"
          element={
            <ProtectedRoute>
              <StylistListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stylists/new"
          element={
            <ProtectedRoute>
              <StylistFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stylists/:id/edit"
          element={
            <ProtectedRoute>
              <StylistFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/generate"
          element={
            <ProtectedRoute>
              <GeneratePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:contentId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Billing routes */}
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <BillingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing/success"
          element={
            <ProtectedRoute>
              <BillingSuccessPage />
            </ProtectedRoute>
          }
        />

        {/* Team routes */}
        <Route
          path="/team/salons"
          element={
            <ProtectedRoute>
              <TeamSalonListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team/import"
          element={
            <ProtectedRoute>
              <CsvImportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team/members"
          element={
            <ProtectedRoute>
              <OrgMembersPage />
            </ProtectedRoute>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Landing page (public) / redirect to dashboard if logged in */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-foreground">404</h1>
                <p className="mt-2 text-muted-foreground">
                  ページが見つかりません
                </p>
              </div>
            </div>
          }
        />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
