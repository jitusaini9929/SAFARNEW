import { ReactNode, useState, useEffect } from "react";
import WelcomeDialog from "./WelcomeDialog";
import TopNavbar from "./TopNavbar";
import LeftSidebar from "./LeftSidebar";
import GlobalPageFooter from "./GlobalPageFooter";
import { useAuth } from "@/contexts/AuthContext";
import { runGoalRolloverPromptFlow } from "@/utils/goalRolloverPrompt";


interface NishthaLayoutProps {
    children: ReactNode;
    userName?: string;
    userAvatar?: string;
    onLogout?: () => void;
}

export default function NishthaLayout({
    children,
    userName = "Student",
    userAvatar = "",
    onLogout,
}: NishthaLayoutProps) {
    const { user } = useAuth();
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        // Check if we should show the welcome modal for Nishtha section
        const shouldShow = sessionStorage.getItem("showWelcomeNishtha");
        if (shouldShow === "true") {
            setShowWelcome(true);
        }
    }, []);

    useEffect(() => {
        const checkMissedGoals = async () => {
            if (!user?.id) return;

            try {
                await runGoalRolloverPromptFlow(user.id);
            } catch (error) {
                console.error("Failed to run rollover prompt flow:", error);
            }
        };
        checkMissedGoals();
    }, [user?.id]);

    const handleCloseWelcome = () => {
        setShowWelcome(false);
        sessionStorage.removeItem("showWelcomeNishtha");
    };

    return (
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-background transition-colors duration-300 relative">
            {showWelcome && <WelcomeDialog onClose={handleCloseWelcome} userName={userName} />}

            <div className="flex flex-1 overflow-hidden relative min-h-0">
                <LeftSidebar showHome={false} />
                <div className="flex flex-col flex-1 relative z-10 w-full overflow-hidden min-h-0 min-w-0">
                    <TopNavbar
                        userName={userName}
                        userAvatar={userAvatar}
                        onLogout={onLogout}
                        showMobileMenu={true}
                        showMenuButton={false}
                    />
                    <main className="flex-1 overflow-y-auto overflow-x-hidden text-foreground flex flex-col">
                        <div className="flex-1 flex flex-col min-h-full pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
                            <div className="flex-1 flex flex-col relative z-0">
                                {children}
                            </div>
                            <GlobalPageFooter />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
