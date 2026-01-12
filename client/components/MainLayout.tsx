import { ReactNode } from "react";
import TopNavbar from "./TopNavbar";
import LeftSidebar from "./LeftSidebar";

interface MainLayoutProps {
  children: ReactNode;
  userName?: string;
  userAvatar?: string;
  onLogout?: () => void;
}

export default function MainLayout({
  children,
  userName = "Student",
  userAvatar = "",
  onLogout,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background transition-colors duration-300">
      <LeftSidebar />
      <div className="flex flex-col flex-1 relative z-10">
        <TopNavbar userName={userName} userAvatar={userAvatar} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
