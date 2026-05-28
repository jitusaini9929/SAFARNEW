import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { authService } from "@/utils/authService";
import SafarLogo from "@/components/landing/SafarLogo";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import "@/styles/mehfil-m3.css";
import { MdFilledButtonReact, MdOutlinedTextFieldReact, MdCheckboxReact } from "@/components/mehfil/material/MdComponents";

const ALLOWED_SIGNUP_DOMAINS = new Set(["gmail.com", "outlook.com"]);
const SIGNUP_EMAIL_EXCEPTION = "steve123@example.com";

function isAllowedSignupEmail(email: string): boolean {
  if (email === SIGNUP_EMAIL_EXCEPTION) return true;
  const domain = email.split("@")[1] || "";
  return ALLOWED_SIGNUP_DOMAINS.has(domain);
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const [mode, setMode] = useState<"login" | "signup">("login");

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Signup fields
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [examType, setExamType] = useState("");
  const [preparationStage, setPreparationStage] = useState("");
  const [gender, setGender] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check URL path or query params or returning user status
  useEffect(() => {
    const isSignupUrl = location.pathname === "/signup" || searchParams.get("mode") === "signup";
    if (isSignupUrl) {
      setMode("signup");
    } else {
      const isReturning = localStorage.getItem("safar_returning_user") === "true";
      setMode(isReturning ? "login" : "signup");
    }
  }, [location.pathname, searchParams]);

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
      await authService.login(email, password, rememberMe);
      toast.success(t('auth.welcome_back_toast'));
      sessionStorage.setItem("showWelcomeNishtha", "true");
      localStorage.setItem("safar_returning_user", "true");
      navigate("/home", { replace: true });
    } catch (err: any) {
      setError(err.message || t('auth.error_invalid_creds'));
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim() || !gender) {
      setError(t('auth.error_fill_all'));
      return;
    }

    if (!email.includes("@")) {
      setError(t('auth.error_valid_email'));
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedSignupEmail(normalizedEmail)) {
      setError(t('auth.error_gmail_only'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.error_password_min'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.error_password_match'));
      return;
    }

    setIsLoading(true);
    try {
      // Create account
      await authService.signup(
        name,
        email,
        password,
        examType || undefined,
        preparationStage || undefined,
        gender
      );

      toast.success(t('auth.signup_success'));
      sessionStorage.setItem("showWelcomeNishtha", "true");
      localStorage.setItem("safar_returning_user", "true");
      navigate("/home", { replace: true });
    } catch (err: any) {
      setError(err.message || t('auth.error_invalid_creds'));
    } finally {
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

            {/* Login Form */}
            {mode === "login" && (
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
            )}

            {/* Signup Form */}
            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="w-full flex flex-col gap-2">
                  <MdOutlinedTextFieldReact
                    id="signup-name"
                    label={t('auth.full_name')}
                    type="text"
                    value={name}
                    onInput={(e: any) => setName(e.target.value)}
                    required
                    disabled={isLoading}
                    style={{ width: "100%" }}
                  />
                </div>

                <div className="w-full flex flex-col gap-2">
                  <MdOutlinedTextFieldReact
                    id="signup-email"
                    label={t('auth.email')}
                    type="email"
                    value={email}
                    onInput={(e: any) => setEmail(e.target.value.toLowerCase())}
                    required
                    disabled={isLoading}
                    style={{ width: "100%" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MdOutlinedTextFieldReact
                    id="signup-password"
                    label={t('auth.password')}
                    type="password"
                    value={password}
                    onInput={(e: any) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    style={{ width: "100%" }}
                  />
                  <MdOutlinedTextFieldReact
                    id="signup-confirm-password"
                    label="Confirm"
                    type="password"
                    value={confirmPassword}
                    onInput={(e: any) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    style={{ width: "100%" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('auth.exam_type')}</label>
                    <select
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      disabled={isLoading}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-xs font-sans"
                    >
                      <option value="">{t('auth.select')}</option>
                      <option value="CGL">CGL</option>
                      <option value="CHSL">CHSL</option>
                      <option value="GD">GD</option>
                      <option value="MTS">MTS</option>
                      <option value="12th Boards">12th Boards</option>
                      <option value="NTPC">NTPC</option>
                      <option value="JEE">JEE</option>
                      <option value="Other">{t('auth.other')}</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Prep Stage</label>
                    <select
                      value={preparationStage}
                      onChange={(e) => setPreparationStage(e.target.value)}
                      disabled={isLoading}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-xs font-sans"
                    >
                      <option value="">{t('auth.select')}</option>
                      <option value="Beginner">{t('auth.beginner')}</option>
                      <option value="Intermediate">{t('auth.intermediate')}</option>
                      <option value="Advanced">{t('auth.advanced')}</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('auth.gender')}</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-xs font-sans"
                  >
                    <option value="">{t('auth.select_gender')}</option>
                    <option value="male">{t('auth.male')}</option>
                    <option value="female">{t('auth.female')}</option>
                    <option value="other">{t('auth.other')}</option>
                  </select>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-800">
                    {error}
                  </div>
                )}

                <div className="w-full pt-2">
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
                    <span>{isLoading ? t('auth.signup_loading') : t('auth.signup')}</span>
                  </MdFilledButtonReact>
                </div>
              </form>
            )}

            {mode === "login" ? (
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('auth.no_account')}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                    }}
                    className="font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer"
                  >
                    {t('auth.signup_here')}
                  </button>
                </p>
              </div>
            ) : (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('auth.have_account')}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                    className="font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer"
                  >
                    {t('auth.signin_here')}
                  </button>
                </p>
              </div>
            )}
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
