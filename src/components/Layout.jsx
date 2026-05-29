import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FollowUpAlert } from "./FollowUpAlert";
import { NotificationBell } from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import { useFollowUpEngine } from "@/lib/useFollowUpEngine";
import { useAuth } from "@/lib/AuthContext";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  useFollowUpEngine();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 shrink-0 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div
            className="ml-3 lg:hidden rounded-md px-2.5 py-1 flex items-center"
            style={{ background: "#0B1E3D" }}
          >
            <img
              src="/brand/logo.png"
              alt="PassagensComDesconto"
              className="h-5 w-auto object-contain select-none"
              draggable={false}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <FollowUpAlert />
            <NotificationBell />
            <ThemeToggle />
            <span className="hidden sm:inline text-sm text-text-secondary ml-1">
              {user?.name}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}