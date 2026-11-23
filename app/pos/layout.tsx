import * as React from "react"
import Link from "next/link"
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
import { getCurrentUser } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/lib/actions/auth"

export const dynamic = "force-dynamic"

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authData = await getCurrentUser()
  const profile = authData?.profile

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#30231E]">
      {/* Top POS Header */}
      <header className="sticky top-0 z-40 bg-[#FFFDF8] border-b border-[#E8DED0] px-4 py-2.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Brand & Store Info */}
          <div className="flex items-center gap-3">
            <Link href="/pos" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-[#43291F] text-[#FFFDF8] flex items-center justify-center shadow">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif text-lg font-bold text-[#43291F] leading-none block">
                  Heaven&apos;s Cafe
                </span>
                <span className="text-[10px] tracking-widest text-[#737B52] font-semibold uppercase block">
                  Store POS &amp; Operations
                </span>
              </div>
            </Link>
          </div>

          {/* Operational Navigation for On-Premises Store Manager */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/pos" prefetch={true}>
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-[#43291F] hover:bg-[#EFE7DA]">
                <Receipt className="w-4 h-4 mr-1 text-[#B56C4A]" />
                Billing
              </Button>
            </Link>
            <Link href="/pos/bills" prefetch={true}>
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-[#43291F] hover:bg-[#EFE7DA]">
                <FileText className="w-4 h-4 mr-1 text-[#705B51]" />
                Previous Bills
              </Button>
            </Link>
            <Link href="/pos/stock" prefetch={true}>
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-[#43291F] hover:bg-[#EFE7DA]">
                <PackagePlus className="w-4 h-4 mr-1 text-[#737B52]" />
                Inward Stock
              </Button>
            </Link>
            <Link href="/pos/expenses" prefetch={true}>
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-[#43291F] hover:bg-[#EFE7DA]">
                <Wallet className="w-4 h-4 mr-1 text-[#B56C4A]" />
                Daily Expenses
              </Button>
            </Link>
            <Link href="/pos/wastage" prefetch={true}>
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-[#43291F] hover:bg-[#EFE7DA]">
                <Trash2 className="w-4 h-4 mr-1 text-red-600" />
                Day-End Wastage
              </Button>
            </Link>
            <Link href="/pos/closing" prefetch={true}>
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-[#43291F] hover:bg-[#EFE7DA]">
                <CalendarCheck className="w-4 h-4 mr-1 text-[#43291F]" />
                Daily Closing
              </Button>
            </Link>
          </nav>

          {/* User & Status Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Online Status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0F1EA] text-[#737B52] text-xs font-medium border border-[#DEE0D1]">
              <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Online</span>
            </div>

            {/* Cashier Badge */}
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#43291F] leading-tight">
                {profile?.full_name || "Manager"}
              </p>
              <p className="text-[10px] text-[#705B51] leading-tight">
                Store Manager
              </p>
            </div>

            {/* Logout */}
            <form action={logoutAction}>
              <Button
                variant="outline"
                size="sm"
                type="submit"
                className="h-8 px-2.5 text-xs border-[#E8DED0] text-[#705B51] hover:text-red-700 hover:border-red-300"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden overflow-x-auto gap-1.5 pt-2 pb-1 scrollbar-none border-t border-[#E8DED0]/50 mt-2">
          <Link href="/pos" prefetch={true}>
            <span className="whitespace-nowrap px-2.5 py-1 rounded bg-[#EFE7DA] text-[#43291F] text-xs font-semibold inline-block">
              Billing
            </span>
          </Link>
          <Link href="/pos/bills" prefetch={true}>
            <span className="whitespace-nowrap px-2.5 py-1 rounded bg-[#FFFDF8] text-[#705B51] text-xs font-semibold border border-[#E8DED0] inline-block">
              Bills
            </span>
          </Link>
          <Link href="/pos/stock" prefetch={true}>
            <span className="whitespace-nowrap px-2.5 py-1 rounded bg-[#FFFDF8] text-[#705B51] text-xs font-semibold border border-[#E8DED0] inline-block">
              Inward Stock
            </span>
          </Link>
          <Link href="/pos/expenses" prefetch={true}>
            <span className="whitespace-nowrap px-2.5 py-1 rounded bg-[#FFFDF8] text-[#705B51] text-xs font-semibold border border-[#E8DED0] inline-block">
              Expenses
            </span>
          </Link>
          <Link href="/pos/wastage" prefetch={true}>
            <span className="whitespace-nowrap px-2.5 py-1 rounded bg-[#FFFDF8] text-[#705B51] text-xs font-semibold border border-[#E8DED0] inline-block">
              Wastage
            </span>
          </Link>
          <Link href="/pos/closing" prefetch={true}>
            <span className="whitespace-nowrap px-2.5 py-1 rounded bg-[#FFFDF8] text-[#705B51] text-xs font-semibold border border-[#E8DED0] inline-block">
              Closing
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
