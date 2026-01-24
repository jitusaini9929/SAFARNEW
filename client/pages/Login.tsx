import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/utils/authService";
// 1. Import the logo
import nishthaLogo from "@/assets/nishtha-logo.jpg";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Kept for UI consistency, though not needed for login
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in email and password");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    setIsLoading(true);
    console.log('🔵 [CLIENT LOGIN] Starting login...');
    try {
      const user = await authService.login(email, password);
      console.log('🟢 [CLIENT LOGIN] Login successful, user:', user);
      toast.success("Welcome back!");
      console.log('🟢 [CLIENT LOGIN] Calling navigate("/")...');
      // Set flag to show welcome dialog on dashboard
      sessionStorage.setItem("showWelcome", "true");
      // Navigate to Landing page after successful login
      navigate("/");
      console.log('🟢 [CLIENT LOGIN] navigate() called');
    } catch (err: any) {
      console.error('🔴 [CLIENT LOGIN] Error:', err);
      setError(err.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors duration-300">
      <Card className="w-full max-w-md border-primary/10 shadow-lg glass-card">
        <CardHeader className="space-y-2">
          <div className="text-center">
            {/* 2. Replaced the emoji <div> with this image <div> */}
            <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <img
                src={nishthaLogo}
                alt="Nishtha Logo"
                className="w-full h-full rounded-full object-cover shadow-lg border-2 border-primary/20"
              />
            </div>

            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              NISHTHA- Consistency ka सफर
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Your emotional well-being & productivity portal
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="border-input focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="border-input focus:border-primary focus:ring-primary/20"
              />
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary/80 hover:text-primary transition-colors hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all duration-300"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Sign up here
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
