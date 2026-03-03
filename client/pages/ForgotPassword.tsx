import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/utils/authService";
import nishthaLogo from "@/assets/nishtha-logo.jpg";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Mail, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

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
        <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4 transition-colors duration-300">
            <Card className="w-full max-w-md border-primary/10 shadow-lg glass-card">
                <CardHeader className="space-y-2">
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <img loading="lazy"
                                src={nishthaLogo}
                                alt="Nishtha Logo"
                                className="w-full h-full rounded-full object-cover shadow-lg border-2 border-primary/20"
                            />
                        </div>

                        <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                            <KeyRound className="w-6 h-6 text-primary" />
                            {t('forgotpwd.title')}
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                            {step === "email"
                                ? t('forgotpwd.step_email_desc')
                                : t('forgotpwd.step_reset_desc')}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {step === "email" ? (
                        <form onSubmit={handleRequestReset} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    {t('forgotpwd.email_label')}
                                </label>
                                <Input
                                    type="email"
                                    placeholder="your.email@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    disabled={isLoading}
                                    className="border-input focus:border-primary focus:ring-primary/20"
                                />
                            </div>

                            {emailSent && !error && (
                                <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm">
                                    {t('forgotpwd.check_inbox')}
                                </div>
                            )}

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
                                {isLoading ? t('forgotpwd.send_loading') : t('forgotpwd.send_btn')}
                            </Button>

                            <Link
                                to="/login"
                                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {t('forgotpwd.back_login')}
                            </Link>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm mb-4">
                                {t('forgotpwd.one_time')}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">{t('forgotpwd.new_password')}</label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={isLoading}
                                        className="border-input focus:border-primary focus:ring-primary/20 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">{t('forgotpwd.confirm_password')}</label>
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isLoading}
                                    className="border-input focus:border-primary focus:ring-primary/20"
                                />
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
                                {isLoading ? t('forgotpwd.resetting') : t('forgotpwd.reset_btn')}
                            </Button>

                            <Link
                                to="/forgot-password"
                                className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {t('forgotpwd.request_new')}
                            </Link>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
