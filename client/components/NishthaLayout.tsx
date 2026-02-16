import { ReactNode, useState, useEffect } from "react";
import WelcomeDialog from "./WelcomeDialog";
import TopNavbar from "./TopNavbar";
import LeftSidebar from "./LeftSidebar";
import GlobalPageFooter from "./GlobalPageFooter";
import { authService } from "@/utils/authService";
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
            try {
                const authData = await authService.getCurrentUser();
                await runGoalRolloverPromptFlow(authData?.user?.id || null);
            } catch (error) {
                console.error("Failed to run rollover prompt flow:", error);
            }
        };
        checkMissedGoals();
    }, []);

    const handleCloseWelcome = () => {
        setShowWelcome(false);
        sessionStorage.removeItem("showWelcomeNishtha");
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300 relative">
            {showWelcome && <WelcomeDialog onClose={handleCloseWelcome} userName={userName} />}

            <div className="flex flex-1 overflow-hidden relative">
                <LeftSidebar />
                <div className="flex flex-col flex-1 relative z-10 w-full overflow-hidden">
                    <TopNavbar userName={userName} userAvatar={userAvatar} onLogout={onLogout} showMobileMenu={false} />
                    <main className="flex-1 overflow-y-auto overflow-x-hidden text-slate-800 dark:text-slate-100 flex flex-col">
                        <div className="flex-1 flex flex-col min-h-full pb-20 lg:pb-0">
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
