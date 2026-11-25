import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  History,
  LayoutDashboard,
  Package,
  Ruler,
  Tags,
  Truck,
} from "lucide-react"

import { NavLink } from "react-router-dom"

type AppSidebarProps = {
  onNavigate?: () => void
}

const navGroups = [
  {
    label: "MENU UTAMA",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "MASTER DATA",
    items: [
      { title: "Data Bahan", href: "/bahan", icon: Package },
      { title: "Kategori", href: "/kategori", icon: Tags },
      { title: "Satuan", href: "/satuan", icon: Ruler },
      { title: "Pemasok", href: "/pemasok", icon: Truck },
    ],
  },
  {
    label: "TRANSAKSI",
    items: [
      {
        title: "Barang Masuk",
        href: "/transaksi/masuk",
        icon: ArrowDownToLine,
      },
      {
        title: "Barang Keluar",
        href: "/transaksi/keluar",
        icon: ArrowUpFromLine,
      },
      { title: "Riwayat Transaksi", href: "/riwayat", icon: History },
    ],
  },
  {
    label: "LAINNYA",
    items: [
      { title: "Laporan", href: "/laporan", icon: BarChart3 },
    ],
  },
]

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Boxes className="size-5" />
        </div>

        <div>
          <p className="text-sm font-semibold">Sambel Bledek</p>
          <p className="text-xs text-muted-foreground">
            Sistem Persediaan
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground">
              {group.label}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon

                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === "/"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`
                    }
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.title}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          SIM Persediaan v1.0
        </p>
      </div>
    </div>
  )
}