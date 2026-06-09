import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import SafarLogo from "@/components/landing/SafarLogo";
import { useTranslation } from "react-i18next";
import AuthForm from "@/components/AuthForm";
import "@/styles/mehfil-m3.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [key, setKey] = useState(0);

  // Check URL path or query params or returning user status
  useEffect(() => {
    const isSignupUrl = location.pathname === "/signup" || searchParams.get("mode") === "signup";
    if (isSignupUrl) {
      setMode("signup");
    } else {
      const isReturning = localStorage.getItem("safar_returning_user") === "true";
      setMode(isReturning ? "login" : "signup");
    }
    setKey(prev => prev + 1); // remount form
  }, [location.pathname, searchParams]);

  const handleSuccess = () => {
    navigate("/home", { replace: true });
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
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
        .glass-surface {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .dark .glass-surface {
          background: rgba(17, 24, 39, 0.7);
        }
      `}</style>

      <div className="mesh-gradient min-h-[100dvh] mehfil-m3 flex items-center justify-center p-4 antialiased text-gray-800 dark:text-gray-100 font-sans transition-colors duration-500">
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
          <div className="mehfil-m3-card p-8 md:p-10 transition-all duration-300">
            {/* Logo and Title */}
            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="flex h-12 w-12 items-center justify-center overflow-visible text-[#042854] dark:text-white group hover:scale-105 transition-transform duration-300">
                  <SafarLogo
                    className="h-12 w-12 origin-center scale-[1.3]"
                    title="Safar Logo"
                  />
                </div>
                <span className="text-3xl font-playfair font-bold text-[#042854] dark:text-white tracking-tight select-none">
                  SAFAR
                </span>
              </div>
              <p className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide">
                {mode === "login" ? t('auth.login_subtitle') : t('auth.modal_signup_desc')}
              </p>
            </div>

            <AuthForm
              key={key}
              initialMode={mode}
              onSuccess={handleSuccess}
              onForgotPassword={handleForgotPassword}
              onModeChange={setMode}
            />
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-teal-800/60 dark:text-teal-200/40 font-medium">
              {t('auth.copyright')}
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
