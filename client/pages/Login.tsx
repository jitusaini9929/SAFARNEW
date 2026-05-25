import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "@/utils/authService";
import nishthaLogo from "@/assets/nishtha-logo.webp";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import "@/styles/mehfil-m3.css";
import { MdFilledButtonReact, MdOutlinedTextFieldReact, MdCheckboxReact } from "@/components/mehfil/material/MdComponents";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError(t('auth.error_fill_email_password'));
      return;
    }

    if (!email.includes("@")) {
      setError(t('auth.error_valid_email'));
      return;
    }

    setIsLoading(true);
    try {
      const user = await authService.login(email, password, rememberMe);
      toast.success(t('auth.welcome_back_toast'));
      sessionStorage.setItem("showWelcomeNishtha", "true");
      navigate("/home", { replace: true });
    } catch (err: any) {
      setError(err.message || t('auth.error_invalid_creds'));
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
                {t('auth.login_subtitle')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="w-full flex flex-col gap-2">
                <MdOutlinedTextFieldReact
                  id="email"
                  label={t('auth.email')}
                  type="email"
                  value={email}
                  onInput={(e: any) => setEmail(e.target.value.toLowerCase())}
                  required
                  disabled={isLoading}
                  style={{ width: "100%" }}
                />
              </div>

              <div className="w-full flex flex-col gap-2">
                <MdOutlinedTextFieldReact
                  id="password"
                  label={t('auth.password')}
                  type="password"
                  value={password}
                  onInput={(e: any) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{ width: "100%" }}
                />
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => !isLoading && setRememberMe(prev => !prev)}>
                    <MdCheckboxReact
                      id="remember-me"
                      checked={rememberMe}
                      disabled={isLoading}
                    />
                    <label htmlFor="remember-me" className="text-sm text-gray-700 dark:text-gray-300 font-medium cursor-pointer">
                      {t('auth.remember_me')}
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

              <div className="w-full">
                <MdFilledButtonReact
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    "--md-filled-button-container-height": "48px",
                    "--md-filled-button-container-shape": "12px",
                    "--md-filled-button-container-color": "var(--md-sys-color-primary)",
                  } as React.CSSProperties}
                >
                  <span>{isLoading ? t('auth.signin_loading') : t('auth.signin')}</span>
                </MdFilledButtonReact>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.no_account')}{" "}
                <Link
                  to="/signup"
                  className="font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:underline transition-colors"
                >
                  {t('auth.signup_here')}
                </Link>
              </p>
            </div>
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
