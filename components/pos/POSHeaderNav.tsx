"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Coffee,
  Receipt,
  FileText,
  PackagePlus,
  Wallet,
  Trash2,
  CalendarCheck,
  LogOut,
  Wifi,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/lib/actions/auth"

interface POSHeaderNavProps {
  profileName?: string
  role?: string
}

export function POSHeaderNav({ profileName = "Manager", role = "Store Manager" }: POSHeaderNavProps) {
  const pathname = usePathname()

  const navLinks = [
    { href: "/pos", label: "Billing", icon: Receipt, activeColor: "text-[#B56C4A]" },
    { href: "/pos/bills", label: "Previous Bills", icon: FileText, activeColor: "text-[#705B51]" },
    { href: "/pos/stock", label: "Inward Stock", icon: PackagePlus, activeColor: "text-[#737B52]" },
    { href: "/pos/expenses", label: "Daily Expenses", icon: Wallet, activeColor: "text-[#B56C4A]" },
    { href: "/pos/wastage", label: "Wastage", icon: Trash2, activeColor: "text-red-600" },
    { href: "/pos/closing", label: "Closing", icon: CalendarCheck, activeColor: "text-[#43291F]" },
  ]

  const activeRef = React.useRef<HTMLAnchorElement | null>(null)

  // Scroll active mobile tab into view smoothly
  React.useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF8] border-b border-[#E8DED0] shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 min-w-0">
        {/* Brand Header */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/pos" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#43291F] text-[#FFFDF8] flex items-center justify-center shadow-xs group-hover:bg-[#341F17] transition-colors">
              <Coffee className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-serif text-base sm:text-lg font-bold text-[#43291F] leading-tight block truncate">
                Heaven&apos;s Cafe
              </span>
              <span className="text-[9px] sm:text-[10px] tracking-wider text-[#737B52] font-semibold uppercase block truncate">
                Store POS &amp; Counter
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop / Landscape Tablet Nav Links (>= 900px / lg) */}
        <nav className="hidden lg:flex items-center gap-1 shrink-0" aria-label="POS Primary">
          {navLinks.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link key={item.href} href={item.href} prefetch={true}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs font-semibold h-9 px-3 transition-all ${
                    isActive
                      ? "bg-[#EFE7DA] text-[#43291F] shadow-xs"
                      : "text-[#705B51] hover:text-[#43291F] hover:bg-[#F8F3E9]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 mr-1.5 ${isActive ? item.activeColor : "text-[#705B51]"}`} />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Status & User Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Live Online Badge */}
          <div className="hidden xs:flex sm:flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#F0F1EA] text-[#737B52] text-[11px] font-medium border border-[#DEE0D1]">
            <Wifi className="w-3 h-3 text-emerald-600 animate-pulse" />
            <span className="hidden sm:inline">Online</span>
          </div>

          {/* Manager Badge */}
          <div className="text-right hidden sm:block max-w-[120px] lg:max-w-xs">
            <p className="text-xs font-bold text-[#43291F] leading-tight truncate">
              {profileName}
            </p>
            <p className="text-[10px] text-[#705B51] leading-tight truncate">
              {role}
            </p>
          </div>

          {/* Logout */}
          <form action={logoutAction}>
            <Button
              variant="outline"
              size="sm"
              type="submit"
              className="h-8 px-2 sm:px-2.5 text-xs border-[#E8DED0] text-[#705B51] hover:text-red-700 hover:border-red-300"
              title="Sign out of POS terminal"
            >
              <LogOut className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </form>
        </div>
      </div>

      {/* ── MOBILE / TABLET HORIZONTAL TAB BAR (< lg) ── */}
      <div className="lg:hidden border-t border-[#E8DED0]/60 bg-[#FFFDF8]">
        <nav
          className="flex overflow-x-auto gap-1.5 px-3 py-1.5 scrollbar-none scroll-smooth min-w-0"
          aria-label="POS Mobile Tabs"
        >
          {navLinks.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                ref={isActive ? activeRef : null}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition-all select-none min-h-[40px] touch-manipulation ${
                  isActive
                    ? "bg-[#43291F] text-white shadow-xs"
                    : "bg-[#F8F3E9] text-[#705B51] border border-[#E8DED0] hover:bg-[#EFE7DA]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#FAF0EB]" : item.activeColor}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
