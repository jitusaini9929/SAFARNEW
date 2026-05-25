import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "@/utils/authService";
import nishthaLogo from "@/assets/nishtha-logo.webp";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Mail, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/styles/mehfil-m3.css";
import { MdFilledButtonReact, MdOutlinedTextFieldReact } from "@/components/mehfil/material/MdComponents";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState<"email" | "reset">("email");
    const [token, setToken] = useState("");
    const [email, setEmail] = useState("");
    const [emailSent, setEmailSent] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const tokenFromQuery = (searchParams.get("token") || "").trim();
        if (tokenFromQuery) {
            setStep("reset");
            setToken(tokenFromQuery);
        } else {
            setStep("email");
            setToken("");
        }
    }, [searchParams]);

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email.trim()) {
            setError(t('forgotpwd.error_enter_email'));
            return;
        }

        if (!email.includes("@")) {
            setError(t('forgotpwd.error_valid_email'));
            return;
        }

        setIsLoading(true);
        try {
            const message = await authService.requestPasswordReset(email);
            setEmailSent(true);
            toast.success(message);
        } catch (err: any) {
            setEmailSent(false);
            setError(err.message || t('forgotpwd.error_send_link'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!newPassword.trim() || !confirmPassword.trim()) {
            setError(t('forgotpwd.error_fill_fields'));
            return;
        }

        if (newPassword.length < 8) {
            setError(t('forgotpwd.error_min_chars'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t('forgotpwd.error_no_match'));
            return;
        }

        if (!token) {
            setError(t('forgotpwd.error_no_token'));
            return;
        }

        setIsLoading(true);
        try {
            await authService.confirmPasswordReset(token, newPassword);
            toast.success(t('forgotpwd.success_reset'));
            navigate("/login");
        } catch (err: any) {
            setError(err.message || t('forgotpwd.error_reset'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-background mehfil-m3 flex items-center justify-center p-4 transition-colors duration-300">
            <div className="mehfil-m3-card w-full max-w-md p-8 md:p-10 transition-all duration-300">
                <div className="space-y-2 mb-6">
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-full overflow-hidden border-2 border-slate-200 dark:border-white/10 shadow-lg">
                            <img loading="lazy"
                                src={nishthaLogo}
                                alt="Nishtha Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-905 dark:text-white flex items-center justify-center gap-2">
                            <KeyRound className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                            {t('forgotpwd.title')}
                        </h1>
                        <p className="text-sm mt-2 text-slate-500 dark:text-slate-400">
                            {step === "email"
                                ? t('forgotpwd.step_email_desc')
                                : t('forgotpwd.step_reset_desc')}
                        </p>
                    </div>
                </div>
                <div>
                    {step === "email" ? (
                        <form onSubmit={handleRequestReset} className="space-y-6">
                            <div className="w-full flex flex-col gap-2">
                                <MdOutlinedTextFieldReact
                                    id="email"
                                    type="email"
                                    label={t('forgotpwd.email_label')}
                                    value={email}
                                    onInput={(e: any) => setEmail(e.target.value.toLowerCase())}
                                    required
                                    disabled={isLoading}
                                    style={{ width: "100%" }}
                                />
                            </div>

                            {emailSent && !error && (
                                <div className="p-3 rounded-xl bg-teal-500/10 text-teal-650 dark:text-teal-400 text-sm border border-teal-500/25">
                                    {t('forgotpwd.check_inbox')}
                                </div>
                            )}

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
                                    <span>{isLoading ? t('forgotpwd.send_loading') : t('forgotpwd.send_btn')}</span>
                                </MdFilledButtonReact>
                            </div>

                            <div className="flex items-center justify-center mt-4">
                                <Link
                                    to="/login"
                                    className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('forgotpwd.back_login')}
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div className="p-3 rounded-xl bg-teal-500/10 text-teal-655 dark:text-teal-400 text-sm mb-4 border border-teal-500/25">
                                {t('forgotpwd.one_time')}
                            </div>

                            <div className="w-full flex flex-col gap-2 relative">
                                <MdOutlinedTextFieldReact
                                    id="new-password"
                                    type={showPassword ? "text" : "password"}
                                    label={t('forgotpwd.new_password')}
                                    value={newPassword}
                                    onInput={(e: any) => setNewPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    style={{ width: "100%" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            <div className="w-full flex flex-col gap-2">
                                <MdOutlinedTextFieldReact
                                    id="confirm-password"
                                    type={showPassword ? "text" : "password"}
                                    label={t('forgotpwd.confirm_password')}
                                    value={confirmPassword}
                                    onInput={(e: any) => setConfirmPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    style={{ width: "100%" }}
                                />
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
                                    <span>{isLoading ? t('forgotpwd.resetting') : t('forgotpwd.reset_btn')}</span>
                                </MdFilledButtonReact>
                            </div>

                            <div className="flex items-center justify-center mt-4">
                                <Link
                                    to="/forgot-password"
                                    className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-teal-650 dark:hover:text-teal-400 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('forgotpwd.request_new')}
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>);
}
