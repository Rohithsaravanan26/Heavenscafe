"use client"

import * as React from "react"
import Link from "next/link"
import {
  TrendingUp,
  Receipt,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
  Coffee,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

interface DashboardOverviewProps {
  data: {
    kpis: {
      today_sales: number
      today_bills: number
      month_sales: number
      month_bills: number
      avg_order_value: number
      items_today: number
      low_stock_count: number
    }
    total_expenses: number
    net_profit: number
    recent_trend: any[]
    low_stock_items: any[]
  } | null
  lowStockCount?: number
}

export function DashboardOverview({ data, lowStockCount }: DashboardOverviewProps) {
  if (!data) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[#705B51]">Failed to load dashboard data. Check Supabase connection.</p>
      </div>
    )
  }

  const { kpis, total_expenses, net_profit, recent_trend, low_stock_items } = data
  const hasSales = kpis.month_sales > 0 || kpis.month_bills > 0

  return (
    <div className="space-y-6">
      {/* Welcome & Time Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#43291F]">
            Business Overview
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Real-time commercial metrics for Heaven&apos;s Cafe
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/inventory">
            <Button size="sm" variant="outline" className="border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F] text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-[#B56C4A]" />
              View Stock Alerts
            </Button>
          </Link>
        </div>
      </div>

      {/* ── LOW STOCK ALERT BANNER ── */}
      {(lowStockCount ?? 0) > 0 && (
        <Link href="/admin/inventory">
          <Card className="border-2 border-red-500 bg-red-50/60 shadow-sm cursor-pointer hover:bg-red-50 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-800">
                  Low Stock Alert — {lowStockCount} ingredient{(lowStockCount ?? 0) > 1 ? "s" : ""} need restocking
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  Tap to view the Inventory &amp; Stock page and reorder supplies
                </p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-red-600 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#737B52]">Today&apos;s Sales</span>
            <div className="w-8 h-8 rounded-lg bg-[#F0F1EA] text-[#737B52] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-serif text-2xl font-bold text-[#43291F] block">
              {formatCurrency(kpis.today_sales)}
            </span>
            <span className="text-[11px] text-[#705B51] block mt-0.5">
              {kpis.today_bills} completed bills today
            </span>
          </div>
        </Card>

        {/* Month Sales */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B56C4A]">Month Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF0EB] text-[#B56C4A] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-serif text-2xl font-bold text-[#43291F] block">
              {formatCurrency(kpis.month_sales)}
            </span>
            <span className="text-[11px] text-[#705B51] block mt-0.5">
              {kpis.month_bills} bills this month
            </span>
          </div>
        </Card>

        {/* Operating Expenses */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#705B51]">Month Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-[#EFE7DA] text-[#43291F] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-serif text-2xl font-bold text-[#43291F] block">
              {formatCurrency(total_expenses)}
            </span>
            <span className="text-[11px] text-[#705B51] block mt-0.5">
              Rent, bills & operations
            </span>
          </div>
        </Card>

        {/* Estimated Net Profit */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#43291F]">Est. Net Profit</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              net_profit >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
            }`}>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`font-serif text-2xl font-bold block ${
              net_profit >= 0 ? "text-emerald-800" : "text-red-700"
            }`}>
              {formatCurrency(net_profit)}
            </span>
            <span className="text-[11px] text-[#705B51] block mt-0.5">
              Revenue minus expenses
            </span>
          </div>
        </Card>
      </div>

      {/* ── SECONDARY METRICS (AOV, Items sold, Low Stock) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#E8DED0] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#705B51] block">Average Order Value (AOV)</span>
            <span className="font-serif text-lg font-bold text-[#43291F]">
              {formatCurrency(kpis.avg_order_value)}
            </span>
          </div>
          <Receipt className="w-5 h-5 text-[#B56C4A]" />
        </div>

        <div className="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#E8DED0] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#705B51] block">Items Sold Today</span>
            <span className="font-serif text-lg font-bold text-[#43291F]">
              {kpis.items_today} units
            </span>
          </div>
          <ShoppingBag className="w-5 h-5 text-[#737B52]" />
        </div>

        <div className="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#E8DED0] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#705B51] block">Low Stock Alert Count</span>
            <span className={`font-serif text-lg font-bold ${
              kpis.low_stock_count > 0 ? "text-amber-800" : "text-emerald-800"
            }`}>
              {kpis.low_stock_count} items
            </span>
          </div>
          <AlertTriangle className={`w-5 h-5 ${
            kpis.low_stock_count > 0 ? "text-amber-600" : "text-emerald-600"
          }`} />
        </div>
      </div>

      {/* ── REVENUE TREND CHART ── */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#43291F]">
            Recent Revenue Trend
          </CardTitle>
          <CardDescription>
            Daily sales revenue from verified database invoices
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4">
          {!hasSales && recent_trend.length === 0 ? (
            <div className="py-14 text-center text-[#A09289]">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#43291F]" />
              <p className="font-serif font-bold text-base text-[#43291F]">
                No Transactions Recorded Yet
              </p>
              <p className="text-xs text-[#705B51] max-w-sm mx-auto mt-1">
                Real sales analytics will render automatically as orders are rung up through the Shop POS terminal.
              </p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={recent_trend}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#43291F" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#43291F" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DED0" />
                  <XAxis
                    dataKey="sale_date"
                    stroke="#705B51"
                    fontSize={11}
                    tickFormatter={(val) => {
                      const d = new Date(val)
                      return `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`
                    }}
                  />
                  <YAxis stroke="#705B51" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFDF8",
                      borderColor: "#E8DED0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_revenue"
                    stroke="#43291F"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── LOW STOCK WARNINGS ── */}
      {low_stock_items.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              Low Stock Warnings
            </CardTitle>
            <CardDescription className="text-amber-800">
              Ingredients currently at or below their configured minimum reorder threshold
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-amber-200 text-amber-900 font-bold">
                  <tr>
                    <th className="py-2 px-3">Ingredient</th>
                    <th className="py-2 px-3">Current Stock</th>
                    <th className="py-2 px-3">Minimum Stock</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-200/60">
                  {low_stock_items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 font-bold text-[#43291F]">{item.name}</td>
                      <td className="py-2.5 px-3 text-red-700 font-bold">
                        {item.current_stock} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-[#705B51]">
                        {item.min_stock} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Badge variant="destructive" className="text-[10px]">
                          {item.current_stock <= 0 ? "Out of Stock" : "Low Stock"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
