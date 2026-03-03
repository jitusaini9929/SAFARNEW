import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface WelcomeDialogProps {
    onClose: () => void;
    userName?: string;
}

export default function WelcomeDialog({ onClose, userName }: WelcomeDialogProps) {
    const [isVisible, setIsVisible] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        // Animate in
        setTimeout(() => setIsVisible(true), 100);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to complete
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? "bg-black/40 backdrop-blur-sm" : "bg-transparent"
                }`}
        >
            <Card
                className={`glass-high max-w-md w-full transform transition-all duration-300 shadow-2xl border-2 border-primary/20 ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
                    }`}
            >
                <CardContent className="p-8 text-center space-y-6 font-['Poppins']">
                    {/* Greeting */}
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-primary">{t('welcome.hello')}{userName ? `, ${userName}` : ""}.</h2>
                        <p className="text-lg text-foreground font-medium">
                            {t('welcome.subtitle_1')} <span className="text-accent font-bold">NISHTHA</span>{t('welcome.subtitle_2')}
                        </p>
                    </div>

                    {/* Message Body */}
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                        <p className="italic">
                            {t('welcome.body1')}
                        </p>

                        <div className="space-y-2">
                            <p>{t('welcome.body2')}</p>
                            <p>{t('welcome.body3')}</p>
                        </div>

                        <p className="text-foreground font-medium pt-2">
                            {t('welcome.body4')}
                        </p>

                        <p className="text-2xl">
                            {t('welcome.smile')}
                        </p>
                    </div>

                    {/* OK Button */}
                    <Button
                        onClick={handleClose}
                        className="w-full bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg transition-all duration-300 py-6 text-lg font-semibold"
                    >
                        {t('welcome.cta')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
