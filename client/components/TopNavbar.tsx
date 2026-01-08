import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockDataManager } from "@/utils/mockData";
import { LogOut, Settings } from "lucide-react";
// 1. IMPORT THE IMAGE (Using the exact name from your screenshot)
import safarLogo from "@/assets/safar-logo.png.jpeg";

interface TopNavbarProps {
  userName?: string;
  userAvatar?: string;
  onLogout?: () => void;
}

export default function TopNavbar({ userName = "Student", userAvatar = "", onLogout }: TopNavbarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    mockDataManager.logoutUser();
    if (onLogout) {
      onLogout();
    }
    navigate("/login");
  };

  const handleProfile = () => {
    navigate("/profile");
  };

  return (
    <nav className="h-16 bg-white border-b border-border shadow-sm sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left side - Logo and Portal Name */}
        <div className="flex items-center gap-3">
          
          {/* 2. LOGO IMAGE (Replaces the 🎯 emoji) */}
          <img 
            src={safarLogo} 
            alt="Safar Logo" 
            className="w-10 h-10 rounded-full object-cover" 
          />
          
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              NISHTHA
            </h1>
          </div>
        </div>

        {/* Right side - User Avatar and Menu */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="rounded-full h-10 w-10 p-0 hover:bg-muted">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="bg-gradient-to-br from-pastel-blue to-pastel-lavender text-white font-semibold">
                    {userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">SSC Aspirant</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleProfile} className="cursor-pointer gap-2">
                <Settings className="w-4 h-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-destructive">
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}