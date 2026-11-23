"use client"

import * as React from "react"
import Link from "next/link"
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
  Trash2,
  Boxes,
  UtensilsCrossed,
  CheckCircle2,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"

interface DashboardOverviewProps {
  data: {
    kpis: {
      today_sales: number
      today_bills: number
      month_sales: number
      month_bills: number
      avg_order_value: number
      low_stock_count: number
    }
    today_cogs?: number
    today_gross_profit?: number
    today_wastage_loss?: number
    today_net_profit?: number
    month_cogs?: number
    month_wastage_loss?: number
    month_net_profit?: number
    total_expenses: number
    net_profit: number
    recent_trend: any[]
    low_stock_items: any[]
  } | null
  lowStockCount?: number
  recentClosings?: any[]
}

export function DashboardOverview({
  data,
  lowStockCount = 0,
  recentClosings = [],
}: DashboardOverviewProps) {
  const [period, setPeriod] = React.useState<"today" | "month">("today")

  if (!data) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[#705B51]">Failed to load dashboard data. Check Supabase connection.</p>
      </div>
    )
  }

  const {
    kpis,
    today_cogs = 0,
    today_wastage_loss = 0,
    today_net_profit = 0,
    month_cogs = 0,
    month_wastage_loss = 0,
    month_net_profit = 0,
    total_expenses = 0,
    recent_trend = [],
    low_stock_items = [],
  } = data

  const isToday = period === "today"
  const currentSales = isToday ? kpis.today_sales : kpis.month_sales
  const currentBills = isToday ? kpis.today_bills : kpis.month_bills
  const currentCogs = isToday ? today_cogs : month_cogs
  const currentWastage = isToday ? today_wastage_loss : month_wastage_loss
  const currentNetProfit = isToday ? today_net_profit : month_net_profit
  const currentMargin = currentSales > 0 ? ((currentNetProfit / currentSales) * 100).toFixed(1) : "0.0"

  return (
    <div className="space-y-6">
      {/* Welcome & Time Switcher Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div>
          <h1 className="font-serif text-fluid-h1 font-bold text-[#43291F]">
            Commercial Overview
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Real-time sales, manufacturing costs, wastage loss, and net profit for Heaven&apos;s Cafe
          </p>
        </div>

        {/* Period Switcher (Billzgo style) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <div className="flex bg-[#EFE7DA] p-1 rounded-lg border border-[#E8DED0]">
            <button
              onClick={() => setPeriod("today")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[36px] touch-manipulation ${
                isToday ? "bg-[#43291F] text-white shadow-xs" : "text-[#705B51] hover:text-[#43291F]"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod("month")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[36px] touch-manipulation ${
                !isToday ? "bg-[#43291F] text-white shadow-xs" : "text-[#705B51] hover:text-[#43291F]"
              }`}
            >
              This Month
            </button>
          </div>

          <Link href="/admin/menu" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="w-full sm:w-auto border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F] text-xs font-semibold min-h-[36px]">
              <UtensilsCrossed className="w-3.5 h-3.5 mr-1 text-[#B56C4A]" />
              Manage Costs &amp; Prices
            </Button>
          </Link>
        </div>
      </div>

      {/* ── LOW STOCK WATCHLIST BANNER ── */}
      {low_stock_items.length > 0 && (
        <Link href="/admin/inventory">
          <Card className="border-2 border-amber-300 bg-amber-50/70 shadow-sm cursor-pointer hover:bg-amber-50 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-950">
                    Product Stock Alert — {low_stock_items.length} item{low_stock_items.length > 1 ? "s" : ""} low in stock
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {low_stock_items.slice(0, 3).map((p) => `${p.name} (${p.current_stock} left)`).join(", ")}
                    {low_stock_items.length > 3 ? "..." : ""}
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-amber-800 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ── DAILY CLOSING DISCREPANCY BANNER ── */}
      {(() => {
        const discrepancyClosing = recentClosings?.find((c) => c.status === "discrepancy")
        if (!discrepancyClosing) return null
        return (
          <Link href="/admin/reports">
            <Card className="border-2 border-red-300 bg-red-50/80 shadow-sm cursor-pointer hover:bg-red-50 transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-700" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-950">
                      Daily Cash Discrepancy Alert — {formatDate(discrepancyClosing.closing_date)}
                    </p>
                    <p className="text-[11px] text-red-800 mt-0.5">
                      Physical cash shortage of {formatCurrency(Math.abs(Number(discrepancyClosing.difference || 0)))} reported by {discrepancyClosing.profiles?.full_name || "Store Manager"}. Click to inspect and audit register closings.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 shrink-0">
                  <span>Review Closing</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })()}

      {/* ── 4 CORE FINANCIAL PILLARS (Billzgo Model) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Gross Revenue */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#737B52]">
              {isToday ? "Today's Revenue" : "Month Revenue"}
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F0F1EA] text-[#737B52] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-serif text-xl sm:text-2xl font-bold text-[#43291F] block">
              {formatCurrency(currentSales)}
            </span>
            <span className="text-[11px] text-[#705B51] block mt-0.5">
              {currentBills} completed bill{currentBills !== 1 ? "s" : ""}
            </span>
          </div>
        </Card>

        {/* 2. Manufacturing Cost (COGS) */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#B56C4A]">
              Manufacturing Cost
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#FAF0EB] text-[#B56C4A] flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-serif text-xl sm:text-2xl font-bold text-[#705B51] block">
              {formatCurrency(currentCogs)}
            </span>
            <span className="text-[11px] text-[#A09289] block mt-0.5">
              Cost of ingredients used
            </span>
          </div>
        </Card>

        {/* 3. Product Wastage Loss */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-700">
              Wastage &amp; Loss
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-serif text-xl sm:text-2xl font-bold text-red-700 block">
              {formatCurrency(currentWastage)}
            </span>
            <span className="text-[11px] text-red-600 block mt-0.5">
              Spoiled &amp; expired items
            </span>
          </div>
        </Card>

        {/* 4. Net Operating Profit */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#43291F]">
              Net Gross Profit
            </span>
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${
                currentNetProfit >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`font-serif text-xl sm:text-2xl font-bold block ${
                currentNetProfit >= 0 ? "text-emerald-800" : "text-red-700"
              }`}
            >
              {formatCurrency(currentNetProfit)}
            </span>
            <span className="text-[11px] text-[#705B51] block mt-0.5">
              Margin: <strong>{currentMargin}%</strong>
            </span>
          </div>
        </Card>
      </div>

      {/* ── SECONDARY METRICS (AOV & Expenses) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#E8DED0] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-[#705B51] block">Average Order Value (AOV)</span>
            <span className="font-serif text-lg font-bold text-[#43291F]">
              {formatCurrency(kpis.avg_order_value)}
            </span>
          </div>
          <Receipt className="w-5 h-5 text-[#B56C4A]" />
        </div>

        <div className="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#E8DED0] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-[#705B51] block">Monthly Operating Expenses</span>
            <span className="font-serif text-lg font-bold text-[#43291F]">
              {formatCurrency(total_expenses)}
            </span>
          </div>
          <Wallet className="w-5 h-5 text-[#737B52]" />
        </div>
      </div>

      {/* ── RECENT SALES PROGRESS CHART ── */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
        <CardHeader className="pb-2 border-b border-[#E8DED0]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-[#43291F]">Sales Revenue Progression</CardTitle>
              <CardDescription className="text-xs">
                7-day daily turnover trend for Heaven&apos;s Cafe
              </CardDescription>
            </div>
            <Link href="/admin/reports">
              <Button variant="ghost" size="sm" className="text-xs text-[#B56C4A] hover:bg-[#FAF0EB]">
                Full P&amp;L Reports &rarr;
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-6">
          {recent_trend.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recent_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cafeRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B56C4A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#B56C4A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DED0" />
                  <XAxis
                    dataKey="sale_date"
                    stroke="#705B51"
                    fontSize={11}
                    tickFormatter={(v) => {
                      const d = new Date(v)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                  />
                  <YAxis stroke="#705B51" fontSize={11} />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), "Revenue"]}
                    contentStyle={{
                      backgroundColor: "#FFFDF8",
                      borderColor: "#E8DED0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_sales"
                    stroke="#B56C4A"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#cafeRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-[#705B51]">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#43291F]" />
              <p className="font-serif font-bold text-sm">No Sales Recorded in the Last 7 Days</p>
              <p className="text-xs text-[#A09289] mt-1">
                Completed bills from the POS will automatically populate this revenue timeline.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── INVENTORY STOCKS SNAPSHOT (Item-Level) ── */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
        <CardHeader className="pb-2 border-b border-[#E8DED0]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-[#43291F]">Product Inventory &amp; Stock Levels</CardTitle>
              <CardDescription className="text-xs">
                Real-time stock counts for cafe products (updated on each sale and day-end wastage)
              </CardDescription>
            </div>
            <Link href="/admin/inventory">
              <Button variant="ghost" size="sm" className="text-xs text-[#737B52] hover:bg-[#F0F1EA]">
                View All Stocks &rarr;
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card List (< md) */}
          <div className="block md:hidden divide-y divide-[#E8DED0]">
            {low_stock_items.map((p) => {
              const sp = Number(p.base_price || 0)
              const cp = Number(p.cost_price || 0)
              const profit = sp - cp
              const isLow = Number(p.current_stock) <= Number(p.min_stock)
              const isOut = Number(p.current_stock) <= 0

              return (
                <div key={p.id} className="p-3.5 space-y-2 hover:bg-[#F8F3E9]/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#43291F]">{p.name}</h4>
                      <p className="text-[11px] text-[#705B51] mt-0.5">
                        Selling: <strong>{formatCurrency(sp)}</strong> | Cost: {formatCurrency(cp)}
                      </p>
                    </div>
                    {isOut ? (
                      <Badge variant="destructive" className="text-[10px] shrink-0">
                        Out of Stock
                      </Badge>
                    ) : isLow ? (
                      <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-800 bg-amber-50 shrink-0">
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="olive" className="text-[10px] shrink-0">
                        Adequate
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8DED0]/60">
                    <span className="font-semibold text-emerald-700">Profit: +{formatCurrency(profit)}/unit</span>
                    <span className="font-bold font-mono text-[#43291F]">{p.current_stock} units left</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F3E9] text-[#705B51] uppercase text-[10px] tracking-wider border-b border-[#E8DED0]">
                <tr>
                  <th className="py-3 px-4">Menu Item</th>
                  <th className="py-3 px-3">Selling Price</th>
                  <th className="py-3 px-3">Manufacturing Cost</th>
                  <th className="py-3 px-3">Unit Profit</th>
                  <th className="py-3 px-3">Current Stock</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED0]">
                {low_stock_items.map((p) => {
                  const sp = Number(p.base_price || 0)
                  const cp = Number(p.cost_price || 0)
                  const profit = sp - cp
                  const isLow = Number(p.current_stock) <= Number(p.min_stock)
                  const isOut = Number(p.current_stock) <= 0

                  return (
                    <tr key={p.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#43291F]">{p.name}</td>
                      <td className="py-3 px-3 font-semibold text-[#43291F]">{formatCurrency(sp)}</td>
                      <td className="py-3 px-3 text-[#705B51]">{formatCurrency(cp)}</td>
                      <td className="py-3 px-3 font-semibold text-emerald-700">+{formatCurrency(profit)}</td>
                      <td className="py-3 px-3 font-bold font-mono text-[#43291F]">{p.current_stock} units</td>
                      <td className="py-3 px-4 text-right">
                        {isOut ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Out of Stock
                          </Badge>
                        ) : isLow ? (
                          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-800 bg-amber-50">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="olive" className="text-[10px]">
                            Adequate
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
