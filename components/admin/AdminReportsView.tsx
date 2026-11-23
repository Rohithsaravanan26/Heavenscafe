"use client"

import * as React from "react"
import {
  FileBarChart,
  Printer,
  Calendar,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  TrendingUp,
  TrendingDown,
  Trash2,
  DollarSign,
  Percent,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface AdminReportsViewProps {
  overviewData: any
  topProducts: any[]
  paymentMethods: any[]
}

export function AdminReportsView({
  overviewData,
  topProducts,
  paymentMethods,
}: AdminReportsViewProps) {
  const [period, setPeriod] = React.useState<"today" | "month">("month")

  const kpis = overviewData?.kpis || {}
  const isToday = period === "today"

  // Period-dependent metrics
  const sales = isToday ? Number(kpis.today_sales || 0) : Number(kpis.month_sales || 0)
  const billsCount = isToday ? Number(kpis.today_bills || 0) : Number(kpis.month_bills || 0)
  const cogs = isToday ? Number(overviewData?.today_cogs || 0) : Number(overviewData?.month_cogs || 0)
  const grossProfit = Math.max(0, sales - cogs)
  const wastageLoss = isToday ? Number(overviewData?.today_wastage_loss || 0) : Number(overviewData?.month_wastage_loss || 0)
  const expenses = isToday ? Number(overviewData?.total_expenses || 0) / 30 : Number(overviewData?.total_expenses || 0)
  const netProfit = grossProfit - wastageLoss - (isToday ? 0 : expenses)
  const netMargin = sales > 0 ? ((netProfit / sales) * 100).toFixed(1) : "0.0"

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#43291F]">
            Commercial Reports &amp; P&amp;L Statement
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Real-time profit &amp; loss statement: Revenue, Manufacturing Costs (CP), Day-End Wastage Loss &amp; Net Profit
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Filter Switcher */}
          <div className="flex bg-[#EFE7DA] p-1 rounded-lg border border-[#E8DED0]">
            <button
              onClick={() => setPeriod("today")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                isToday ? "bg-[#43291F] text-white shadow-xs" : "text-[#705B51] hover:text-[#43291F]"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod("month")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                !isToday ? "bg-[#43291F] text-white shadow-xs" : "text-[#705B51] hover:text-[#43291F]"
              }`}
            >
              This Month
            </button>
          </div>

          <Button
            size="sm"
            onClick={handlePrint}
            className="text-xs bg-[#43291F] hover:bg-[#341F17] text-white"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print Statement
          </Button>
        </div>
      </div>

      {/* 4 Core Highlight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#737B52]">
            {isToday ? "Today's Gross Sales" : "Monthly Gross Sales"}
          </span>
          <p className="font-serif text-2xl font-bold text-[#43291F] mt-1 font-mono">
            {formatCurrency(sales)}
          </p>
          <p className="text-[11px] text-[#705B51] mt-0.5">{billsCount} completed bills</p>
        </Card>

        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#705B51]">
            Manufacturing Cost (COGS)
          </span>
          <p className="font-serif text-2xl font-bold text-[#705B51] mt-1 font-mono">
            {formatCurrency(cogs)}
          </p>
          <p className="text-[11px] text-[#705B51] mt-0.5">Product unit cost of items sold</p>
        </Card>

        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
            Day-End Wastage Loss
          </span>
          <p className="font-serif text-2xl font-bold text-red-700 mt-1 font-mono">
            -{formatCurrency(wastageLoss)}
          </p>
          <p className="text-[11px] text-red-600 mt-0.5">Manager logged expired/spilled</p>
        </Card>

        <Card className="border-[#E8DED0] bg-[#FAF0EB] p-4 shadow-xs border-[#F3DDD2]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B56C4A]">
            Net Operating Profit
          </span>
          <p className={`font-serif text-2xl font-bold mt-1 font-mono ${netProfit >= 0 ? "text-emerald-800" : "text-red-700"}`}>
            {formatCurrency(netProfit)}
          </p>
          <p className="text-[11px] text-[#705B51] mt-0.5">{netMargin}% net operating margin</p>
        </Card>
      </div>

      {/* P&L Commercial Statement Table */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
        <CardHeader className="border-b border-[#E8DED0] bg-[#F8F3E9] p-4">
          <CardTitle className="text-base text-[#43291F] flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-[#B56C4A]" />
            Commercial Profit &amp; Loss Statement ({isToday ? "Today" : "This Month"})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-3 text-sm">
            {/* 1. Gross Revenue */}
            <div className="flex justify-between items-center py-2.5 border-b border-[#E8DED0]">
              <div>
                <span className="font-semibold text-[#43291F] block">1. Gross Sales Revenue</span>
                <span className="text-xs text-[#705B51]">Total revenue billed across all cashier counters</span>
              </div>
              <span className="font-serif font-bold text-base text-[#43291F] font-mono">
                {formatCurrency(sales)}
              </span>
            </div>

            {/* 2. COGS (Manufacturing Cost) */}
            <div className="flex justify-between items-center py-2.5 border-b border-[#E8DED0] text-[#705B51]">
              <div>
                <span className="font-semibold block">2. Less: Cost of Goods Sold (COGS)</span>
                <span className="text-xs text-[#A09289]">Total manufacturing cost of all products sold</span>
              </div>
              <span className="font-serif font-bold text-base font-mono text-red-700">
                - {formatCurrency(cogs)}
              </span>
            </div>

            {/* 3. Gross Operating Profit */}
            <div className="flex justify-between items-center py-2.5 border-b border-[#E8DED0] bg-[#F8F3E9]/50 px-3 rounded-lg">
              <div>
                <span className="font-bold text-[#43291F] block">3. Gross Trading Margin (1 - 2)</span>
                <span className="text-xs text-[#737B52]">Commercial profit before wastage &amp; overhead</span>
              </div>
              <span className="font-serif font-bold text-base text-[#737B52] font-mono">
                {formatCurrency(grossProfit)}
              </span>
            </div>

            {/* 4. Day-End Wastage Loss */}
            <div className="flex justify-between items-center py-2.5 border-b border-[#E8DED0] text-red-700">
              <div>
                <span className="font-semibold block">4. Less: Day-End Product Wastage &amp; Spoilage</span>
                <span className="text-xs text-red-600">Financial manufacturing loss from expired/damaged items</span>
              </div>
              <span className="font-serif font-bold text-base font-mono">
                - {formatCurrency(wastageLoss)}
              </span>
            </div>

            {/* 5. Operating Expenses */}
            {!isToday && (
              <div className="flex justify-between items-center py-2.5 border-b border-[#E8DED0] text-[#705B51]">
                <div>
                  <span className="font-semibold block">5. Less: Operating Expenses</span>
                  <span className="text-xs text-[#A09289]">Rent, utility bills, maintenance &amp; store expenses</span>
                </div>
                <span className="font-serif font-bold text-base font-mono text-red-700">
                  - {formatCurrency(expenses)}
                </span>
              </div>
            )}

            {/* 6. Net Profit Final Row */}
            <div className="flex justify-between items-center py-4 bg-[#FAF0EB] px-4 rounded-xl border border-[#F3DDD2] mt-2">
              <div>
                <span className="font-serif font-bold text-lg text-[#43291F] block">
                  Net Commercial Operating Profit
                </span>
                <span className="text-xs text-[#705B51]">
                  Final profit after manufacturing costs, day-end wastages &amp; operations
                </span>
              </div>
              <div className="text-right">
                <span className={`font-serif text-2xl font-bold font-mono block ${netProfit >= 0 ? "text-emerald-800" : "text-red-700"}`}>
                  {formatCurrency(netProfit)}
                </span>
                <span className="text-xs font-bold text-[#737B52]">
                  {netMargin}% Margin
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Performance & Payment Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
          <CardHeader className="border-b border-[#E8DED0] pb-3">
            <CardTitle className="text-base text-[#43291F] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#737B52]" />
              Top Selling Products
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {topProducts.length === 0 ? (
              <div className="py-8 text-center text-[#A09289] text-xs">
                No product sales logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F3E9] text-[#43291F] font-bold border-b border-[#E8DED0]">
                    <tr>
                      <th className="py-2.5 px-4">Product</th>
                      <th className="py-2.5 px-4 text-center">Units Sold</th>
                      <th className="py-2.5 px-4 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DED0]">
                    {topProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-[#F8F3E9]/50">
                        <td className="py-2.5 px-4 font-bold text-[#43291F]">{p.product_name}</td>
                        <td className="py-2.5 px-4 text-center font-bold">{p.total_quantity}</td>
                        <td className="py-2.5 px-4 text-right font-serif font-bold text-[#43291F]">
                          {formatCurrency(p.total_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
          <CardHeader className="border-b border-[#E8DED0] pb-3">
            <CardTitle className="text-base text-[#43291F] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#B56C4A]" />
              Payment Tender Distribution
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {paymentMethods.length === 0 ? (
              <div className="py-8 text-center text-[#A09289] text-xs">
                No payment data recorded yet.
              </div>
            ) : (
              paymentMethods.map((pm, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#F8F3E9] border border-[#E8DED0]"
                >
                  <div className="flex items-center gap-2.5">
                    {pm.method === "cash" && <Banknote className="w-5 h-5 text-emerald-700" />}
                    {pm.method === "upi" && <QrCode className="w-5 h-5 text-blue-700" />}
                    {pm.method === "card" && <CreditCard className="w-5 h-5 text-purple-700" />}
                    <div>
                      <span className="font-bold text-xs uppercase text-[#43291F] block">
                        {pm.method} Payments
                      </span>
                      <span className="text-[11px] text-[#705B51]">
                        {pm.count} transactions completed
                      </span>
                    </div>
                  </div>
                  <span className="font-serif font-bold text-sm text-[#43291F]">
                    {formatCurrency(pm.total)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
