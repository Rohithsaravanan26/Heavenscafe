"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Coffee,
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  Boxes,
  Wallet,
  FileBarChart,
  Users,
  Settings,
  History,
  Bell,
  LogOut,
  AlertTriangle,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/lib/actions/auth"

interface AdminSidebarNavProps {
  profileName?: string
  role?: string
  unreadCount?: number
  lowStockCount?: number
  children: React.ReactNode
}

export function AdminSidebarNav({
  profileName = "Cafe Owner",
  role = "Remote Owner",
  unreadCount = 0,
  lowStockCount = 0,
  children,
}: AdminSidebarNavProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const navLinks = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/sales", label: "Sales & History", icon: Receipt },
    { href: "/admin/menu", label: "Menu & Pricing", icon: UtensilsCrossed },
    { href: "/admin/inventory", label: "Inventory & Stock", icon: Boxes },
    { href: "/admin/expenses", label: "Expenses", icon: Wallet },
    { href: "/admin/reports", label: "Reports & P&L", icon: FileBarChart },
    { href: "/admin/staff", label: "Staff Accounts", icon: Users },
    { href: "/admin/settings", label: "Business Settings", icon: Settings },
    { href: "/admin/audit", label: "Audit Logs", icon: History },
  ]

  // Close drawer on path change or Esc key
  React.useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false)
    }
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [mobileMenuOpen])

  return (
    <div className="min-h-[100dvh] flex bg-[#F8F3E9] text-[#30231E]">
      {/* ── 1. DESKTOP PERMANENT SIDEBAR (>= 1024px) ── */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-40 bg-[#FFFDF8] border-r border-[#E8DED0] shadow-sm select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#E8DED0]">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#43291F] text-[#FFFDF8] flex items-center justify-center shadow-xs group-hover:bg-[#341F17] transition-colors">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold text-[#43291F] leading-tight block">
                Heaven&apos;s Cafe
              </span>
              <span className="text-[10px] tracking-widest text-[#B56C4A] font-semibold uppercase block">
                Remote Administration
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin" aria-label="Admin Desktop">
          {navLinks.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#43291F] text-white shadow-xs font-bold"
                    : "text-[#705B51] hover:text-[#43291F] hover:bg-[#F8F3E9]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#FAF0EB]" : "text-[#737B52]"}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer with User Info */}
        <div className="p-4 border-t border-[#E8DED0] space-y-3">
          <div className="flex items-center justify-between pt-1">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-[#43291F] truncate">
                {profileName}
              </p>
              <p className="text-[10px] text-[#737B52] font-semibold uppercase truncate">
                {role}
              </p>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                title="Sign out of Admin Dashboard"
                className="text-[#705B51] hover:text-red-700 p-2 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── 2. MOBILE / TABLET SLIDE-OUT DRAWER (< 1024px) ── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu */}
          <div className="relative w-4/5 max-w-xs bg-[#FFFDF8] border-r border-[#E8DED0] flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-250">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E8DED0] flex items-center justify-between bg-[#F8F3E9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#43291F] text-[#FFFDF8] flex items-center justify-center shadow-xs">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-serif text-base font-bold text-[#43291F] leading-tight block">
                    Heaven&apos;s Cafe
                  </span>
                  <span className="text-[9px] tracking-wider text-[#B56C4A] font-semibold uppercase block">
                    Admin Portal
                  </span>
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-[#705B51] hover:text-[#43291F] hover:bg-[#EFE7DA] transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1.5" aria-label="Admin Mobile">
              {navLinks.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                      isActive
                        ? "bg-[#43291F] text-white shadow-xs font-bold"
                        : "text-[#705B51] hover:text-[#43291F] hover:bg-[#F8F3E9]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#FAF0EB]" : "text-[#737B52]"}`} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Drawer Footer with User & Signout */}
            <div className="p-4 border-t border-[#E8DED0] bg-[#F8F3E9]/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#43291F] truncate">
                  {profileName}
                </p>
                <p className="text-[10px] text-[#737B52] font-semibold uppercase">
                  {role}
                </p>
              </div>

              <form action={logoutAction}>
                <Button
                  variant="outline"
                  size="sm"
                  type="submit"
                  className="h-8 px-2.5 text-xs border-[#E8DED0] text-[#705B51] hover:text-red-700"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Logout
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. MAIN CONTENT CONTAINER (Offset by sidebar width on desktop) ── */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#FFFDF8] border-b border-[#E8DED0] px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs">
          {/* Mobile Hamburger + Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#43291F] hover:bg-[#F8F3E9] border border-[#E8DED0] min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
              aria-label="Open administration navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="font-serif font-bold text-base sm:text-lg text-[#43291F] lg:hidden truncate">
              Heaven&apos;s Cafe Admin
            </span>
          </div>

          {/* Quick Action Badges (Notifications & Alerts) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Notification Bell */}
            <Link href="/admin/notifications">
              <div
                className="relative p-2 rounded-lg text-[#705B51] hover:text-[#43291F] hover:bg-[#F8F3E9] cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                title={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#B56C4A] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </div>
            </Link>

            {/* Low Stock Alert Badge */}
            {lowStockCount > 0 && (
              <Link href="/admin/inventory">
                <div
                  className="relative p-2 rounded-lg text-[#705B51] hover:text-[#43291F] hover:bg-[#F8F3E9] cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title={`${lowStockCount} items at or below minimum stock threshold`}
                >
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-700 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {lowStockCount}
                  </span>
                </div>
              </Link>
            )}
          </div>
        </header>

        {/* Page Children: Fully responsive container */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
