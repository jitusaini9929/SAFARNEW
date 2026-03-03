import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/utils/authService";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

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

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [examType, setExamType] = useState("");
    const [preparationStage, setPreparationStage] = useState("");
    const [gender, setGender] = useState("");
    const [profilePreview, setProfilePreview] = useState<string | null>(null);

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setName("");
        setConfirmPassword("");
        setExamType("");
        setPreparationStage("");
        setGender("");
        setProfilePreview(null);
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
            await authService.login(email, password);
            toast.success(t('auth.welcome_back_toast'));
            sessionStorage.setItem("showWelcomeNishtha", "true");
            resetForm();
            onAuthSuccess();
            onClose();
            setTimeout(() => {
                window.location.reload();
            }, 100);
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
            await authService.signup(
                name,
                email,
                password,
                examType || undefined,
                preparationStage || undefined,
                gender,
                profilePreview || undefined
            );
            toast.success(t('auth.signup_success'));
            sessionStorage.setItem("showWelcomeNishtha", "true");
            resetForm();
            onAuthSuccess();
            onClose();
            setTimeout(() => {
                window.location.reload();
            }, 100);
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
          background: rgba(255, 255, 255, 0.95);
          border-radius: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: modal-slide-up 0.3s ease-out;
        }
        .dark .auth-modal-container {
          background: rgba(17, 24, 39, 0.95);
        }
        @keyframes modal-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
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
      `}</style>

            <div className="auth-modal-backdrop" onClick={onClose}>
                <div className="auth-modal-container" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>

                    <div className="p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {mode === "login" ? t('auth.modal_welcome_back') : t('auth.modal_create_account')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {mode === "login" ? t('auth.modal_signin_desc') : t('auth.modal_signup_desc')}
                            </p>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
                            <button
                                type="button"
                                onClick={() => { setMode("login"); setError(""); }}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "login"
                                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow"
                                    : "text-gray-500 dark:text-gray-400"
                                    }`}
                            >
                                {t('auth.signin')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode("signup"); setError(""); }}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "signup"
                                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow"
                                    : "text-gray-500 dark:text-gray-400"
                                    }`}
                            >
                                {t('auth.signup')}
                            </button>
                        </div>

                        {/* Login Form */}
                        {mode === "login" && (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('auth.email')}
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value.toLowerCase())}
                                        placeholder={t('auth.email_placeholder')}
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        disabled={isLoading}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('auth.password')}
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={t('auth.password_placeholder')}
                                        disabled={isLoading}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { onClose(); navigate("/forgot-password"); }}
                                        className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn-gradient w-full py-3 rounded-xl text-white font-bold tracking-wide disabled:opacity-50"
                                >
                                    {isLoading ? t('auth.signin_loading') : t('auth.signin')}
                                </button>
                            </form>
                        )}

                        {/* Signup Form */}
                        {mode === "signup" && (
                            <form onSubmit={handleSignup} className="space-y-3">
                                {/* Profile Picture */}
                                <div className="flex flex-col items-center mb-2">
                                    <label htmlFor="modal-profile-upload" className="cursor-pointer">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-teal-500/50 flex items-center justify-center overflow-hidden hover:border-teal-500 transition-colors">
                                            {profilePreview ? (
                                                <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs text-gray-400 text-center px-1">{t('auth.add_photo')}</span>
                                            )}
                                        </div>
                                    </label>
                                    <input
                                        id="modal-profile-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('auth.full_name')}
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={t('auth.full_name_placeholder')}
                                        disabled={isLoading}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('auth.email')}
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value.toLowerCase())}
                                        placeholder="your.email@example.com"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        disabled={isLoading}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('auth.password')}
                                        </label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={t('auth.password_min')}
                                            disabled={isLoading}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('auth.confirm_short')}
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder={t('auth.confirm_password_placeholder')}
                                            disabled={isLoading}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('auth.exam_type')}
                                        </label>
                                        <select
                                            value={examType}
                                            onChange={(e) => setExamType(e.target.value)}
                                            disabled={isLoading}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('auth.prep_stage_short')}
                                        </label>
                                        <select
                                            value={preparationStage}
                                            onChange={(e) => setPreparationStage(e.target.value)}
                                            disabled={isLoading}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                        >
                                            <option value="">{t('auth.select')}</option>
                                            <option value="Beginner">{t('auth.beginner')}</option>
                                            <option value="Intermediate">{t('auth.intermediate')}</option>
                                            <option value="Advanced">{t('auth.advanced')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('auth.gender')}
                                    </label>
                                    <select
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        disabled={isLoading}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                    >
                                        <option value="">{t('auth.select_gender')}</option>
                                        <option value="male">{t('auth.male')}</option>
                                        <option value="female">{t('auth.female')}</option>
                                        <option value="other">{t('auth.other')}</option>
                                    </select>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn-gradient w-full py-3 rounded-xl text-white font-bold tracking-wide disabled:opacity-50"
                                >
                                    {isLoading ? t('auth.signup_loading') : t('auth.signup')}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
