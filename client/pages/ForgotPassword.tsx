import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/utils/authService";
import nishthaLogo from "@/assets/nishtha-logo.jpg";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Mail, Eye, EyeOff } from "lucide-react";

export default function ForgotPassword() {
    const navigate = useNavigate();
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
            setError("Please enter your email");
            return;
        }

        if (!email.includes("@")) {
            setError("Please enter a valid email");
            return;
        }

        setIsLoading(true);
        try {
            const message = await authService.requestPasswordReset(email);
            setEmailSent(true);
            toast.success(message);
        } catch (err: any) {
            setEmailSent(false);
            setError(err.message || "Failed to send reset link");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!newPassword.trim() || !confirmPassword.trim()) {
            setError("Please fill in all fields");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!token) {
            setError("Invalid or missing reset token. Please request a new reset link.");
            return;
        }

        setIsLoading(true);
        try {
            await authService.confirmPasswordReset(token, newPassword);
            toast.success("Password reset successfully!");
            navigate("/login");
        } catch (err: any) {
            setError(err.message || "Failed to reset password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors duration-300">
            <Card className="w-full max-w-md border-primary/10 shadow-lg glass-card">
                <CardHeader className="space-y-2">
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <img
                                src={nishthaLogo}
                                alt="Nishtha Logo"
                                className="w-full h-full rounded-full object-cover shadow-lg border-2 border-primary/20"
                            />
                        </div>

                        <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                            <KeyRound className="w-6 h-6 text-primary" />
                            Reset Password
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                            {step === "email"
                                ? "Enter your email and we'll send a secure reset link"
                                : "Create a new password for your account"}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {step === "email" ? (
                        <form onSubmit={handleRequestReset} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email Address
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
                                    Check your inbox for the reset link.
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
                                {isLoading ? "Sending link..." : "Send Reset Link"}
                            </Button>

                            <Link
                                to="/login"
                                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Login
                            </Link>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm mb-4">
                                Enter your new password. This link is one-time use.
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">New Password</label>
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
                                <label className="text-sm font-medium text-foreground">Confirm Password</label>
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
                                {isLoading ? "Resetting..." : "Reset Password"}
                            </Button>

                            <Link
                                to="/forgot-password"
                                className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Request a new link
                            </Link>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
