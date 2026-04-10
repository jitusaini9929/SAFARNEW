import { ReactNode } from "react";
import TopNavbar from "./TopNavbar";
import LeftSidebar from "./LeftSidebar";
import GlobalPageFooter from "./GlobalPageFooter";


interface MainLayoutProps {
  children: ReactNode;
  userName?: string;
  userAvatar?: string;
  onLogout?: () => void;
  hideSidebar?: boolean;
  homeRoute?: string;
  showHome?: boolean;
}

export default function MainLayout({
  children,
  userName = "Student",
  userAvatar = "",
  onLogout,
  hideSidebar = false,
  homeRoute = "/home",
  showHome = true,
}: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background transition-colors duration-300 overflow-x-hidden">


      <div className="flex flex-1 overflow-hidden relative">
        {!hideSidebar && <LeftSidebar homeRoute={homeRoute} showHome={showHome} />}
        <div className="flex flex-col flex-1 relative z-10 w-full overflow-hidden">
          <TopNavbar userName={userName} userAvatar={userAvatar} onLogout={onLogout} homeRoute={homeRoute} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden text-foreground">
            <div className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
              {children}
              <GlobalPageFooter />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
