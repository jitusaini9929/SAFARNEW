import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
const Achievements = React.lazy(() => import("./pages/Achievements"));
const Landing = React.lazy(() => import("./pages/Landing"));
const Mehfil = React.lazy(() => import("./pages/Mehfil"));
const Meditation = React.lazy(() => import("./pages/Meditation"));

const queryClient = new QueryClient();

// Suspense fallback spinner
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
                <Route path="/landing" element={<Landing />} />

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

// HMR and rendering logic is handled in main.tsx
export default App;
