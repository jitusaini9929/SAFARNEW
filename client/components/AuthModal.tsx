import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import SafarLogo from "@/components/landing/SafarLogo";
import AuthForm from "./AuthForm";
import "@/styles/mehfil-m3.css";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [key, setKey] = useState(0);

    // Dynamic state initialization based on returning vs new user
    useEffect(() => {
        if (isOpen) {
            const isReturning = localStorage.getItem("safar_returning_user") === "true";
            setMode(isReturning ? "login" : "signup");
            setKey(prev => prev + 1); // remount form to reset its state
        }
    }, [isOpen]);

    const handleSuccess = () => {
        onAuthSuccess();
        onClose();
        navigate("/home", { replace: true });
    };

    const handleForgotPassword = () => {
        onClose();
        navigate("/forgot-password");
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
          font-family: "Source Sans 3", "Source Sans Pro", system-ui, sans-serif;
        }
        @keyframes modal-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

            <div className="auth-modal-backdrop" onClick={onClose}>
                <div
                    className="auth-modal-container mehfil-m3 mehfil-m3-card p-8 md:p-10 font-sans antialiased"
                    onClick={(e) => e.stopPropagation()}
                >
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

                    <AuthForm
                        key={key}
                        initialMode={mode}
                        onSuccess={handleSuccess}
                        onForgotPassword={handleForgotPassword}
                        onModeChange={setMode}
                    />
                </div>
            </div>
        </>
    );
}
