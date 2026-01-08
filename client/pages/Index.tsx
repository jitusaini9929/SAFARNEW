import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { mockDataManager } from "@/utils/mockData";

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const state = mockDataManager.getState();

    // Redirect based on authentication status
    if (state.isAuthenticated && state.user) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Loading screen while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-blue/20 via-background to-pastel-lavender/20 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 animate-pulse"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
