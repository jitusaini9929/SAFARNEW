import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/utils/authService";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import SafarLogo from "@/components/landing/SafarLogo";
import "@/styles/mehfil-m3.css";
import { MdFilledButtonReact, MdOutlinedTextFieldReact, MdCheckboxReact } from "@/components/mehfil/material/MdComponents";

const ALLOWED_SIGNUP_DOMAINS = new Set(["gmail.com", "outlook.com"]);
const SIGNUP_EMAIL_EXCEPTION = "steve123@example.com";

function isAllowedSignupEmail(email: string): boolean {
    if (email === SIGNUP_EMAIL_EXCEPTION) return true;
    const domain = email.split("@")[1] || "";
    return ALLOWED_SIGNUP_DOMAINS.has(domain);
}

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
    const navigate = useNavigate();
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

    // Dynamic state initialization based on returning vs new user
    useEffect(() => {
        if (isOpen) {
            const isReturning = localStorage.getItem("safar_returning_user") === "true";
            setMode(isReturning ? "login" : "signup");
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setName("");
        setConfirmPassword("");
        setExamType("");
        setPreparationStage("");
        setGender("");
        setError("");
    };

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
            resetForm();
            onAuthSuccess();
            onClose();
            navigate("/home", { replace: true });
        } catch (err: any) {
            setError(err.message || t('auth.error_invalid_creds'));
        } finally {
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
            resetForm();
            onAuthSuccess();
            onClose();
            navigate("/home", { replace: true });
        } catch (err: any) {
            setError(err.message || t('auth.error_invalid_creds'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <style>{`
        .auth-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .auth-modal-container {
          position: relative;
          width: 100%;
          max-width: 28rem;
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: modal-slide-up 0.3s ease-out;
        }
        @keyframes modal-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

            <div className="auth-modal-backdrop" onClick={onClose}>
                <div className="auth-modal-container mehfil-m3 mehfil-m3-card p-8 md:p-10" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>

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
                                    id="modal-email"
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
                                    id="modal-password"
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
                                            id="modal-remember-me"
                                            checked={rememberMe}
                                            disabled={isLoading}
                                        />
                                        <label htmlFor="modal-remember-me" className="text-sm text-gray-700 dark:text-gray-300 font-medium cursor-pointer">
                                            {t('auth.remember_me')}
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { onClose(); navigate("/forgot-password"); }}
                                        className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors bg-transparent border-none p-0 cursor-pointer"
                                    >
                                        Forgot password?
                                    </button>
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
                                    id="modal-signup-name"
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
                                    id="modal-signup-email"
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
                                    id="modal-signup-password"
                                    label={t('auth.password')}
                                    type="password"
                                    value={password}
                                    onInput={(e: any) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    style={{ width: "100%" }}
                                />
                                <MdOutlinedTextFieldReact
                                    id="modal-signup-confirm-password"
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
            </div>
        </>
    );
}
