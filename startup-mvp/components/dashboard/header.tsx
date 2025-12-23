"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FiMenu } from "react-icons/fi";
import BreadcrumbNav from "./BreadcrumbNav";
import NotificationDropdown from "@/components/NotificationDropdown";
import { useAppDispatch } from "@/lib/redux/hooks";
import { toggleSidebar } from "@/lib/redux/slices/uiSlice";

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null | undefined;
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const dispatch = useAppDispatch();

  // Handle undefined/null user gracefully
  if (!user) {
    return (
      <header className="flex h-16 items-center justify-between border-b bg-card px-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Toggle sidebar"
          >
            <FiMenu className="h-5 w-5" />
          </Button>
          <BreadcrumbNav />
        </div>
      </header>
    );
  }

  const userName = user.name || "User";
  const userEmail = user.email || "";
  const initials = userName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", {
      method: "POST",
    });
    window.location.href = "/login";
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Toggle sidebar"
        >
          <FiMenu className="h-5 w-5" />
        </Button>
        <BreadcrumbNav />
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                {user.image && (
                  <AvatarImage src={user.image} alt={userName} />
                )}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
