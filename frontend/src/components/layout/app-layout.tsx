import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Flame,
  History,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Package,
  Ruler,
  Tags,
  Truck,
} from "lucide-react";
import { useAuth } from "@/contexts/use-auth";

import { AppSidebar } from "./app-sidebar";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const primaryMobileNav = [
  { title: "Stok", href: "/", icon: LayoutDashboard },
  { title: "Riwayat", href: "/riwayat", icon: History },
  { title: "Laporan", href: "/laporan", icon: BarChart3 },
];

const moreMenuItems = [
  {
    title: "Belanja Borongan",
    description: "Catat 1 nota untuk banyak bahan",
    href: "/transaksi/masuk",
    icon: ArrowDownToLine,
  },
  {
    title: "Masak Manual",
    description: "Kurangi beberapa bahan manual",
    href: "/transaksi/keluar",
    icon: ArrowUpFromLine,
  },
  {
    title: "Daftar Bahan",
    description: "Tambah bahan & batas minimum",
    href: "/bahan",
    icon: Package,
  },
  {
    title: "Toko Pemasok",
    description: "Daftar toko langganan",
    href: "/pemasok",
    icon: Truck,
  },
  {
    title: "Kategori",
    description: "Kelompok bahan",
    href: "/kategori",
    icon: Tags,
  },
  {
    title: "Satuan",
    description: "kg, liter, butir, botol",
    href: "/satuan",
    icon: Ruler,
  },
];

export function AppLayout() {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isMoreRouteActive = moreMenuItems.some((item) =>
    location.pathname.startsWith(item.href),
  );

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Status pengguna tetap dihapus oleh AuthContext.
    }

    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-card md:block">
        <AppSidebar />
      </aside>

      {/* Main Area */}
      <div className="pb-24 md:pb-0 md:pl-64">
        {/* Header Bersih dengan Identitas Sambel Bledek (Merah Cabai & Api) */}
        <header className="sticky top-0 z-30 flex h-15 items-center gap-3 border-b bg-card px-4 md:h-16 md:px-8">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-orange-500 text-white shadow-xs md:hidden">
            <Flame className="size-5" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-foreground">
              Stok Sambel Bledek
            </p>
            <p className="truncate text-xs font-medium text-muted-foreground">
              Griya Angkringan Sambel Bledek
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user?.nama}</p>
              <p className="text-xs text-muted-foreground">{user?.username}</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleLogout()}
              aria-label="Keluar dari akun"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span>Keluar</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-6xl p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation Bar — Jelas terbaca dengan nuansa Merah Cabai senada */}
      <nav
        aria-label="Menu utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1.5 px-2.5 py-1.5">
          {primaryMobileNav.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                className={({ isActive }) =>
                  `flex min-h-13 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-xs font-extrabold transition-colors ${
                    isActive
                      ? "bg-red-600 text-white shadow-xs"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`
                }
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.title}</span>
              </NavLink>
            );
          })}

          <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  aria-label="Menu lainnya"
                  className={`flex min-h-13 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-xs font-extrabold transition-colors ${
                    isMoreRouteActive
                      ? "bg-red-600 text-white shadow-xs"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                />
              }
            >
              <MoreHorizontal className="size-5 shrink-0" aria-hidden="true" />
              <span>Lainnya</span>
            </SheetTrigger>

            {/* Bottom Sheet Grid Lingkaran Ikon Senada Nuansa Api/Merah Hangat */}
            <SheetContent
              side="bottom"
              className="max-h-[85dvh] overflow-y-auto rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            >
              <SheetHeader className="p-0 pb-5 text-left">
                <SheetTitle className="text-lg font-extrabold">
                  Menu & Pengaturan
                </SheetTitle>
                <SheetDescription className="text-sm">
                  Pilih fitur tambahan atau kelola daftar bahan dan toko.
                </SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-3 gap-y-5 gap-x-3 text-center">
                {moreMenuItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setMoreMenuOpen(false)}
                      className="group flex flex-col items-center gap-2 rounded-2xl p-2 hover:bg-orange-50/70"
                    >
                      <div className="flex size-14 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-red-700 transition-transform group-hover:scale-105">
                        <Icon className="size-6" aria-hidden="true" />
                      </div>
                      <span className="text-xs font-extrabold text-stone-800">
                        {item.title}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
