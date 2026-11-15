"use client"

import * as React from "react"
import {
  FileBarChart,
  Printer,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  DollarSign,
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
  const kpis = overviewData?.kpis || {}
  const totalExpenses = overviewData?.total_expenses || 0
  const netProfit = overviewData?.net_profit || 0

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#43291F]">
            Monthly Financial & P&L Statement
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Commercial profit analysis and performance breakdown for Heaven&apos;s Cafe
          </p>
        </div>

        <div className="flex gap-2">
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

      {/* P&L Financial Summary Card */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
        <CardHeader className="border-b border-[#E8DED0] pb-3">
          <CardTitle className="text-lg text-[#43291F] flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-[#B56C4A]" />
            Profit & Loss Accounting Breakdown
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-3 text-sm">
            {/* Gross Revenue */}
            <div className="flex justify-between items-center py-2 border-b border-[#E8DED0]">
              <span className="font-semibold text-[#43291F]">A. Total Gross Sales Revenue</span>
              <span className="font-serif font-bold text-base text-[#43291F]">
                {formatCurrency(kpis.month_sales || 0)}
              </span>
            </div>

            {/* Operating Expenses */}
            <div className="flex justify-between items-center py-2 border-b border-[#E8DED0] text-red-700">
              <span>B. Less: Operating Expenses (Rent, Gas, Salaries, Maintenance)</span>
              <span className="font-serif font-bold text-base">
                - {formatCurrency(totalExpenses)}
              </span>
            </div>

            {/* Net Profit */}
            <div className="flex justify-between items-center py-3 bg-[#FAF0EB] px-4 rounded-xl border border-[#F3DDD2]">
              <div>
                <span className="font-serif font-bold text-lg text-[#43291F] block">
                  Net Commercial Operating Profit (A - B)
                </span>
                <span className="text-xs text-[#705B51]">
                  Current calendar period net performance
                </span>
              </div>
              <span className={`font-serif text-2xl font-bold ${
                netProfit >= 0 ? "text-emerald-800" : "text-red-700"
              }`}>
                {formatCurrency(netProfit)}
              </span>
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
