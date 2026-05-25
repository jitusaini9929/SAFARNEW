import { ReactNode, useState } from "react";
import M3TopNavbar from "./M3TopNavbar";
import GlobalPageFooter from "./GlobalPageFooter";
import GlobalSidebar from "./GlobalSidebar";


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
  const [isGlobalSidebarOpen, setIsGlobalSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background transition-colors duration-300 overflow-x-hidden">


      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-col flex-1 relative z-10 w-full overflow-hidden">
          <M3TopNavbar
            moduleName="PORTAL"
            homeRoute={homeRoute}
            onSidebarToggle={() => setIsGlobalSidebarOpen(true)}
          />
          <main className="flex-1 overflow-y-auto overflow-x-hidden text-foreground">
            <div className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
              {children}
              <GlobalPageFooter />
            </div>
          </main>
        </div>
      </div>

      <GlobalSidebar isOpen={isGlobalSidebarOpen} onClose={() => setIsGlobalSidebarOpen(false)} />
    </div>
  );
}

