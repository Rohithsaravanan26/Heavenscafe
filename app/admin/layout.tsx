import * as React from "react"
import Link from "next/link"
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
  ExternalLink,
} from "lucide-react"
import { getCurrentUser } from "@/lib/actions/auth"
import { getNotifications } from "@/lib/actions/notifications"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/lib/actions/auth"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [authData, notifications] = await Promise.all([
    getCurrentUser(),
    getNotifications(true), // unread only
  ])

  const profile = authData?.profile
  const unreadCount = notifications?.length || 0

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

  return (
    <div className="min-h-screen flex bg-[#F8F3E9] text-[#30231E]">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-50 bg-[#FFFDF8] border-r border-[#E8DED0] shadow-sm">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#E8DED0]">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#43291F] text-[#FFFDF8] flex items-center justify-center shadow">
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
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-[#705B51] hover:text-[#43291F] hover:bg-[#F8F3E9] transition-colors"
              >
                <Icon className="w-4 h-4 text-[#737B52]" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer with switch to POS & User Info */}
        <div className="p-4 border-t border-[#E8DED0] space-y-3">
          <Link href="/pos" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs border-[#E8DED0] bg-[#F8F3E9] hover:bg-[#EFE7DA] text-[#43291F] font-semibold justify-between"
            >
              <span>Launch POS Terminal</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#B56C4A]" />
            </Button>
          </Link>

          <div className="flex items-center justify-between pt-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#43291F] truncate">
                {profile?.full_name || "Admin"}
              </p>
              <p className="text-[10px] text-[#737B52] font-semibold uppercase">
                Remote Owner
              </p>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                title="Logout"
                className="text-[#705B51] hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT CONTAINER (Offset by sidebar width on desktop) ── */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-[#FFFDF8] border-b border-[#E8DED0] px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-lg text-[#43291F] lg:hidden">
              Heaven&apos;s Cafe Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <Link href="/admin/notifications">
              <div className="relative p-2 rounded-lg text-[#705B51] hover:text-[#43291F] hover:bg-[#F8F3E9] cursor-pointer">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#B56C4A] text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
            </Link>

            {/* Quick POS link on tablet */}
            <Link href="/pos" className="hidden sm:inline-block">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F]"
              >
                Open POS
              </Button>
            </Link>
          </div>
        </header>

        {/* Mobile Nav Bar */}
        <div className="flex lg:hidden overflow-x-auto gap-1 p-2 bg-[#FFFDF8] border-b border-[#E8DED0] scrollbar-none">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              <span className="whitespace-nowrap px-3 py-1.5 rounded text-xs font-semibold bg-[#F8F3E9] text-[#43291F] border border-[#E8DED0] inline-block">
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Page Children */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
