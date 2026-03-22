import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React, { Suspense, useEffect, useState } from "react";
import { authService } from "./utils/authService";
import { GuidedTourProvider } from "@/contexts/GuidedTourContext";
import { GuidedTour } from "@/components/guided-tour";
import { FocusProvider } from "@/contexts/FocusContext";

// Lazy-loaded pages (code splitting)
const Test = React.lazy(() => import("./pages/Test"));
const Login = React.lazy(() => import("./pages/Login"));
const Signup = React.lazy(() => import("./pages/Signup"));
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
const FocusAnalytics = React.lazy(() => import("./pages/FocusAnalytics"));
const Achievements = React.lazy(() => import("./pages/Achievements"));
const Landing = React.lazy(() => import("./pages/Landing"));
const Challenge100K = React.lazy(() => import("./pages/Challenge100K"));
const Mehfil = React.lazy(() => import("./pages/Mehfil"));
const Meditation = React.lazy(() => import("./pages/Meditation"));

const queryClient = new QueryClient();
const GA_MEASUREMENT_ID = "G-JGR9ENZ8W0";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚧 MAINTENANCE MODE — Set to false to disable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MAINTENANCE_MODE = true;

function MaintenancePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-[#0a0a1a] to-slate-950 text-white relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.04),transparent_50%)] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-lg">
        {/* Animated gear icon */}
        <div className="mx-auto mb-8 w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-400 animate-[spin_4s_linear_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-serif italic tracking-wide mb-4 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
          Under Maintenance
        </h1>

        {/* Subtitle */}
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-6">
          We're upgrading our systems to serve you better. <br className="hidden sm:block" />
          This will only take a few minutes.
        </p>

        {/* Divider */}
        <div className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-blue-500/40 to-transparent mb-6" />

        {/* Brand */}
        <p className="text-xs text-slate-500 tracking-widest uppercase">
          SAFAR • Be back shortly
        </p>
      </div>
    </div>
  );
}

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    console.log("🔵 [PROTECTED ROUTE] Checking authentication...");
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        console.log("🔵 [PROTECTED ROUTE] getCurrentUser result:", user);
        setIsAuthenticated(!!user);
        console.log("🟢 [PROTECTED ROUTE] isAuthenticated set to:", !!user);
      } catch (error) {
        console.error("🔴 [PROTECTED ROUTE] Error checking auth:", error);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    console.log("🟡 [PROTECTED ROUTE] Still checking auth, showing loading...");
    return <PageLoadingFallback />;
  }

  if (!isAuthenticated) {
    console.log(
      "🔴 [PROTECTED ROUTE] Not authenticated, redirecting to Landing with signin modal",
    );
  } else {
    console.log("🟢 [PROTECTED ROUTE] Authenticated, rendering children");
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/?signin=true" replace />;
}

const App = () => {
  useEffect(() => {
    authService.initAuth();
  }, []);

  // 🚧 Maintenance mode — blocks the entire app
  if (MAINTENANCE_MODE) {
    return <MaintenancePage />;
  }

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnalyticsTracker />
        <FocusProvider>
          <GuidedTourProvider>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ForgotPassword />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Nishtha - Wellness App with 5 sections */}
                <Route path="/nishtha">
                  <Route
                    index
                    element={
                      <ProtectedRoute>
                        <Navigate to="/nishtha/check-in" replace />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="check-in"
                    element={
                      <ProtectedRoute>
                        <CheckIn />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="journal"
                    element={
                      <ProtectedRoute>
                        <Journal />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="goals"
                    element={
                      <ProtectedRoute>
                        <Goals />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="streaks"
                    element={
                      <ProtectedRoute>
                        <Streaks />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="suggestions"
                    element={
                      <ProtectedRoute>
                        <Suggestions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="analytics"
                    element={
                      <ProtectedRoute>
                        <Analytics />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                <Route
                  path="/study"
                  element={
                    <ProtectedRoute>
                      <StudyWithMe />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/study/analytics"
                  element={
                    <ProtectedRoute>
                      <FocusAnalytics />
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
                <Route
                  path="/mehfil"
                  element={
                    <ProtectedRoute>
                      <Mehfil />
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

                {/* Landing page - Public Home */}
                <Route path="/home" element={<Landing />} />
                <Route path="/challenge-100k" element={<Challenge100K />} />

                {/* Default route - Landing page is now home */}
                <Route path="/" element={<Landing />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <GuidedTour />
          </GuidedTourProvider>
        </FocusProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

// HMR and rendering logic is handled in main.tsx
export default App;
