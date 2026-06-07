import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React, { Suspense, useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { canAccessMehfilModeration } from "@/utils/mehfilModerationAccess";
import { GuidedTourProvider } from "@/contexts/GuidedTourContext";
import { GuidedTour } from "@/components/guided-tour";
import { FocusProvider } from "@/contexts/FocusContext";
import { GlobalFeedbackWidget } from "@/components/feedback/GlobalFeedbackWidget";

// Lazy-loaded pages (code splitting)
const Test = React.lazy(() => import("./pages/Test"));
const Login = React.lazy(() => import("./pages/Login"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const CheckIn = React.lazy(() => import("./pages/CheckIn"));
const Journal = React.lazy(() => import("./pages/Journal"));
const Goals = React.lazy(() => import("./pages/Goals"));
const Streaks = React.lazy(() => import("./pages/Streaks"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const Suggestions = React.lazy(() => import("./pages/Suggestions"));
const Profile = React.lazy(() => import("./pages/Profile"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const StudyWithMe = React.lazy(() => import("./pages/StudyWithMe"));
const Achievements = React.lazy(() => import("./pages/Achievements"));
const Landing = React.lazy(() => import("./pages/Landing"));
const Challenge100K = React.lazy(() => import("./pages/Challenge100K"));
const Mehfil = React.lazy(() => import("./pages/Mehfil"));
const Meditation = React.lazy(() => import("./pages/Meditation"));
const StudyPlannerPage = React.lazy(() => import("./pages/StudyPlannerPage"));
const Courses = React.lazy(() => import("./pages/Courses"));
const LiveSessions = React.lazy(() => import("./pages/LiveSessions"));
const Updates = React.lazy(() => import("./pages/Updates"));
const SafarVictoryModeToday = React.lazy(() => import("./pages/mission/today"));
const AdminNotificationComposer = React.lazy(() => import("./pages/AdminNotificationComposer"));
const MehfilReportModeration = React.lazy(() => import("./pages/MehfilReportModeration"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const DeleteAccount = React.lazy(() => import("./pages/DeleteAccount"));
const MehfilDmPaywall = React.lazy(() => import("./pages/premium/MehfilDmPaywall"));

const queryClient = new QueryClient();
const GA_MEASUREMENT_ID = "G-JGR9ENZ8W0";

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined" || typeof (window as any).gtag !== "function") {
      return;
    }

    (window as any).gtag("config", GA_MEASUREMENT_ID, {
      page_path: `${location.pathname}${location.search}${location.hash}`,
    });
  }, [location]);

  return null;
}

function NishthaRouteAlias() {
  const location = useLocation();
  const suffix = location.pathname.replace(/^\/nishtha/, "") || "/";

  const routeMap: Record<string, string> = {
    "/": "/check-in",
    "/dashboard": "/dashboard",
    "/check-in": "/check-in",
    "/journal": "/journal",
    "/goals": "/goals",
    "/streaks": "/streaks",
    "/analytics": "/analytics",
    "/achievements": "/achievements",
    "/suggestions": "/suggestions",
    "/focus": "/study",
    "/study": "/study",
    "/mehfil": "/mehfil",
    "/history": "/goals",
  };

  const target = routeMap[suffix] ?? routeMap["/"];
  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
}

/** Overlay layer for global UI (feedback, tours, etc.). */
function GlobalOverlayLayer() {
  const location = useLocation();

  // Hide overlays on Ekagra / focus routes for now
  const isEkagraRoute = location.pathname === "/study" || location.pathname === "/nishtha/focus";

  if (isEkagraRoute) {
    return null;
  }

  return (
    <>
      {/* GuidedTour temporarily disabled while feedback UI is active */}
      {/* <GuidedTour /> */}
      <GlobalFeedbackWidget />
    </>
  );
}

// Suspense fallback spinner
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-[100dvh]">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 animate-pulse"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, isAuthenticated } = useAuth();

  if (status === "loading") {
    return <PageLoadingFallback />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/?signin=true" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { status, isAuthenticated, isAdmin } = useAuth();

  if (status === "loading") {
    return <PageLoadingFallback />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/?signin=true" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

/** Mehfil report review — steve123@example.com only (not general admin). */
function MehfilModeratorRoute({ children }: { children: React.ReactNode }) {
  const { status, isAuthenticated, user, isAdmin } = useAuth();

  if (status === "loading") {
    return <PageLoadingFallback />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/?signin=true" replace />;
  }
  if (!canAccessMehfilModeration(user?.email, isAdmin)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

/** Show the push notification opt-in banner only for authenticated users. */
function AuthenticatedPushBanner() {
  // Temporarily disabled for web clients while Android push remains active.
  return null;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AnalyticsTracker />
            <AuthenticatedPushBanner />
            <FocusProvider>
              <GuidedTourProvider>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Routes>
                    {/* Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ForgotPassword />} />

                    {/* Protected Routes */}
                    <Route path="/nishtha/*" element={<NishthaRouteAlias />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/check-in"
                      element={
                        <ProtectedRoute>
                          <CheckIn />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/journal"
                      element={
                        <ProtectedRoute>
                          <Journal />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/goals"
                      element={
                        <ProtectedRoute>
                          <Goals />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/streaks"
                      element={
                        <ProtectedRoute>
                          <Streaks />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/suggestions"
                      element={
                        <ProtectedRoute>
                          <Suggestions />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <ProtectedRoute>
                          <Analytics />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/admin/notifications"
                      element={
                        <AdminRoute>
                          <AdminNotificationComposer />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/mehfil/reports"
                      element={
                        <MehfilModeratorRoute>
                          <MehfilReportModeration />
                        </MehfilModeratorRoute>
                      }
                    />
                    <Route
                      path="/study"
                      element={
                        <ProtectedRoute>
                          <StudyWithMe />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/study/planner"
                      element={
                        <ProtectedRoute>
                          <StudyPlannerPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/study/planner/:planId"
                      element={
                        <ProtectedRoute>
                          <StudyPlannerPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/study/planner/:planId/:section"
                      element={
                        <ProtectedRoute>
                          <StudyPlannerPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/study/analytics"
                      element={
                        <ProtectedRoute>
                          <Navigate to="/analytics?tab=focus" replace />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/achievements"
                      element={
                        <ProtectedRoute>
                          <Achievements />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/mehfil" element={<Mehfil />} />
                    <Route
                      path="/premium/mehfil-dm"
                      element={
                        <ProtectedRoute>
                          <MehfilDmPaywall />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/meditation"
                      element={
                        <ProtectedRoute>
                          <Meditation />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/courses"
                      element={
                        <ProtectedRoute>
                          <Courses />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/live-sessions"
                      element={
                        <ProtectedRoute>
                          <LiveSessions />
                        </ProtectedRoute>
                      }
                    />
                    {/* 
                <Route
                  path="/mission/today"
                  element={
                    <ProtectedRoute>
                      <SafarVictoryModeToday />
                    </ProtectedRoute>
                  }
                />
                */}

                    {/* Landing page - Public Home */}
                    <Route path="/landing" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<Landing />} />
                    <Route path="/challenge-100k" element={<Challenge100K />} />
                    <Route path="/updates" element={<Updates />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/delete-account" element={<DeleteAccount />} />

                    {/* Default route - Landing page is now home */}
                    <Route path="/" element={<Landing />} />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <GlobalOverlayLayer />
              </GuidedTourProvider>
            </FocusProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

// HMR and rendering logic is handled in main.tsx
export default App;
