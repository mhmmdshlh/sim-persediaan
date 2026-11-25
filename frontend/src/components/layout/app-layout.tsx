import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/contexts/use-auth"

import { AppSidebar } from "./app-sidebar";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Status pengguna tetap dihapus oleh AuthContext.
    }

    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-svh bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r md:block">
        <AppSidebar />
      </aside>

      {/* Main Area */}
      <div className="md:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-8">
          {/* Mobile Navigation */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  aria-label="Buka navigasi"
                />
              }
            >
              <Menu className="size-4" />
            </SheetTrigger>

            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigasi utama</SheetTitle>

              <AppSidebar onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Header Information */}
          <div className="flex-1">
            <p className="text-sm font-semibold">Sistem Informasi Persediaan</p>
            <p className="text-xs text-muted-foreground">
              Griya Angkringan Sambel Bledek
            </p>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.nama}</p>
              <p className="text-xs text-muted-foreground">{user?.username}</p>
            </div>

            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
              {user?.nama.charAt(0).toUpperCase()}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => void handleLogout()}
              aria-label="Keluar dari sistem"
              title="Logout"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
