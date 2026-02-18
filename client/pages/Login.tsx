import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "@/utils/authService";
import nishthaLogo from "@/assets/nishtha-logo.jpg";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
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
    try {
      const user = await authService.login(email, password, rememberMe);
      toast.success("Welcome back!");
      sessionStorage.setItem("showWelcomeNishtha", "true");
      // Redirect after a brief delay to ensure state is saved
      setTimeout(() => {
        window.location.href = "/landing";
      }, 100);
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .mesh-gradient {
          background-color: #d1fae5;
          background-image: 
            radial-gradient(at 0% 0%, hsla(165,65%,75%,1) 0px, transparent 50%),
            radial-gradient(at 50% 0%, hsla(170,80%,85%,1) 0px, transparent 50%),
            radial-gradient(at 100% 0%, hsla(45,90%,85%,1) 0px, transparent 50%),
            radial-gradient(at 0% 100%, hsla(160,60%,80%,1) 0px, transparent 50%),
            radial-gradient(at 50% 100%, hsla(180,70%,85%,1) 0px, transparent 50%),
            radial-gradient(at 100% 100%, hsla(165,65%,75%,1) 0px, transparent 50%);
          background-size: 150% 150%;
          animation: gradient-animation 15s ease infinite;
        }
        .dark .mesh-gradient {
          background-color: #0f172a;
          background-image: 
            radial-gradient(at 0% 0%, hsla(165,55%,15%,1) 0px, transparent 50%),
            radial-gradient(at 50% 0%, hsla(170,60%,20%,1) 0px, transparent 50%),
            radial-gradient(at 100% 0%, hsla(45,30%,20%,1) 0px, transparent 50%),
            radial-gradient(at 0% 100%, hsla(160,50%,15%,1) 0px, transparent 50%),
            radial-gradient(at 50% 100%, hsla(180,60%,20%,1) 0px, transparent 50%),
            radial-gradient(at 100% 100%, hsla(165,55%,15%,1) 0px, transparent 50%);
        }
        @keyframes gradient-animation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .btn-gradient {
          background: linear-gradient(135deg, #047857 0%, #881337 100%);
          transition: all 0.3s ease;
        }
        .btn-gradient:hover {
          background: linear-gradient(135deg, #059669 0%, #9f1239 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(4, 120, 87, 0.4);
        }
        .glass-surface {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .dark .glass-surface {
          background: rgba(17, 24, 39, 0.7);
        }
      `}</style>

      <div className="mesh-gradient min-h-screen flex items-center justify-center p-4 antialiased text-gray-800 dark:text-gray-100 font-sans transition-colors duration-500">
        {/* Floating decorative blobs */}
        <div
          className="fixed top-20 left-20 w-32 h-32 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 hidden lg:block dark:bg-teal-900"
          style={{ animation: 'float 6s ease-in-out infinite' }}
        ></div>
        <div
          className="fixed bottom-20 right-20 w-32 h-32 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 hidden lg:block dark:bg-yellow-900"
          style={{ animation: 'float 6s ease-in-out infinite', animationDelay: '2s' }}
        ></div>
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-10 pointer-events-none dark:bg-black dark:opacity-20"></div>

        <main className="relative z-10 w-full max-w-md">
          <div className="glass-surface border border-white/40 dark:border-white/10 rounded-3xl shadow-lg p-8 md:p-10 transition-all duration-300">

            {/* Logo and Title */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative w-24 h-24 mb-4 rounded-full shadow-lg overflow-hidden border-2 border-white/50 dark:border-white/10 group hover:scale-105 transition-transform duration-300">
                <img loading="lazy"
                  src={nishthaLogo}
                  alt="Nishtha wellness logo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              <h1 className="text-3xl font-bold text-center mb-1 tracking-tight text-teal-700 dark:text-teal-400">
                SAFAR
              </h1>
              <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide mt-2">
                Your emotional well-being & productivity portal
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1" htmlFor="email">
                  Email
                </label>
                <input
                  className="block w-full px-4 py-3 rounded-xl border-transparent bg-white/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:bg-white/80 dark:focus:bg-black/50 transition-all duration-200 shadow-sm"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={isLoading}
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1" htmlFor="password">
                  Password
                </label>
                <input
                  className="block w-full px-4 py-3 rounded-xl border-transparent bg-white/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:bg-white/80 dark:focus:bg-black/50 transition-all duration-200 shadow-sm"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded cursor-pointer transition-colors"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 font-medium cursor-pointer select-none">
                      Remember me
                    </label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-gradient w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white tracking-wider focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-gray-800 relative overflow-hidden group disabled:opacity-50"
              >
                <span className="relative z-10">{isLoading ? "Signing in..." : "Sign In"}</span>
                <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:underline transition-colors"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-teal-800/60 dark:text-teal-200/40 font-medium">
              © 2026 SAFAR. All rights reserved.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
