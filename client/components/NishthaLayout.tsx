import { ReactNode } from "react";
import TopNavbar from "./TopNavbar";
import LeftSidebar from "./LeftSidebar";

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
    return (
        <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
            <LeftSidebar />
            <div className="flex flex-col flex-1 relative z-10">
                <TopNavbar userName={userName} userAvatar={userAvatar} onLogout={onLogout} showMobileMenu={false} />
                <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 text-slate-800 dark:text-slate-100">
                    {children}
                </main>
            </div>
        </div>
    );
}
