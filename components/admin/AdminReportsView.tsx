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
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Search,
  ReceiptText,
  ShieldCheck,
  Building,
  User,
  ArrowRight,
  Filter,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { reviewDailyClosingAction } from "@/lib/actions/closing"
import { formatCurrency, formatDate } from "@/lib/utils"

interface AdminReportsViewProps {
  overviewData: any
  topProducts: any[]
  paymentMethods: any[]
  closingHistory?: any[]
}

export function AdminReportsView({
  overviewData,
  topProducts,
  paymentMethods,
  closingHistory = [],
}: AdminReportsViewProps) {
  // Top-level Navigation: "pnl" | "closings"
  const [activeTab, setActiveTab] = React.useState<"pnl" | "closings">("pnl")
  const [period, setPeriod] = React.useState<"today" | "month">("month")

  // Daily Closings State
  const [closings, setClosings] = React.useState<any[]>(closingHistory)
  const [closingFilter, setClosingFilter] = React.useState<"all" | "discrepancy" | "reviewed">("all")
  const [closingSearch, setClosingSearch] = React.useState("")
  const [selectedClosing, setSelectedClosing] = React.useState<any | null>(null)
  const [reviewNotes, setReviewNotes] = React.useState("")
  const [reviewing, setReviewing] = React.useState(false)
  const [reviewError, setReviewError] = React.useState<string | null>(null)
  const [reviewSuccess, setReviewSuccess] = React.useState<string | null>(null)

  // Synchronize when prop updates
  React.useEffect(() => {
    setClosings(closingHistory)
  }, [closingHistory])

  // Count pending discrepancies
  const discrepancyCount = React.useMemo(() => {
    return closings.filter((c) => c.status === "discrepancy").length
  }, [closings])

  // Filtered closings list
  const filteredClosings = React.useMemo(() => {
    return closings.filter((c) => {
      if (closingFilter === "discrepancy" && c.status !== "discrepancy") return false
      if (closingFilter === "reviewed" && c.status !== "reviewed") return false

      if (closingSearch.trim()) {
        const query = closingSearch.toLowerCase().trim()
        const dateMatch = (c.closing_date || "").toLowerCase().includes(query)
        const managerMatch = (c.profiles?.full_name || "").toLowerCase().includes(query)
        const remarksMatch = (c.remarks || "").toLowerCase().includes(query)
        return dateMatch || managerMatch || remarksMatch
      }
      return true
    })
  }, [closings, closingFilter, closingSearch])

  // Aggregate closing KPIs
  const totalDrawerCash = React.useMemo(() => {
    return closings.reduce((acc, c) => acc + Number(c.actual_cash || 0), 0)
  }, [closings])

  const totalDiscrepancyAmount = React.useMemo(() => {
    return closings.reduce((acc, c) => acc + Number(c.difference || 0), 0)
  }, [closings])

  const totalDigitalSales = React.useMemo(() => {
    return closings.reduce((acc, c) => acc + Number(c.upi_sales || 0) + Number(c.card_sales || 0), 0)
  }, [closings])

  // P&L Period-dependent metrics
  const kpis = overviewData?.kpis || {}
  const isToday = period === "today"
  const sales = isToday ? Number(kpis.today_sales || 0) : Number(kpis.month_sales || 0)
  const billsCount = isToday ? Number(kpis.today_bills || 0) : Number(kpis.month_bills || 0)
  const cogs = isToday ? Number(overviewData?.today_cogs || 0) : Number(overviewData?.month_cogs || 0)
  const grossProfit = Math.max(0, sales - cogs)
  const wastageLoss = isToday ? Number(overviewData?.today_wastage_loss || 0) : Number(overviewData?.month_wastage_loss || 0)
  const expenses = isToday ? Number(overviewData?.today_expenses || 0) : Number(overviewData?.total_expenses || 0)
  const netProfit = grossProfit - wastageLoss - expenses
  const netMargin = sales > 0 ? ((netProfit / sales) * 100).toFixed(1) : "0.0"

  const handlePrint = () => {
    window.print()
  }

  // Handle Admin Review of a Closing
  const handleReviewClosing = async () => {
    if (!selectedClosing) return
    setReviewing(true)
    setReviewError(null)
    setReviewSuccess(null)

    try {
      const res = await reviewDailyClosingAction(selectedClosing.id, reviewNotes)
      if (res.success && res.closing) {
        setClosings((prev) =>
          prev.map((item) =>
            item.id === selectedClosing.id
              ? {
                  ...item,
                  status: "reviewed",
                  remarks: res.closing.remarks,
                  reviewed_by: res.closing.reviewed_by,
                  reviewer: { full_name: "Cafe Owner (Admin)" },
                }
              : item
          )
        )
        setSelectedClosing((prev: any) =>
          prev
            ? {
                ...prev,
                status: "reviewed",
                remarks: res.closing.remarks,
                reviewed_by: res.closing.reviewed_by,
                reviewer: { full_name: "Cafe Owner (Admin)" },
              }
            : null
        )
        setReviewSuccess("Daily register closing successfully marked as reviewed & audited.")
        setReviewNotes("")
      } else {
        setReviewError(res.error || "Failed to review closing.")
      }
    } catch (err: any) {
      setReviewError(err?.message || "Failed to review closing.")
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div>
          <h1 className="font-serif text-fluid-h1 font-bold text-[#43291F]">
            {activeTab === "pnl" ? "Commercial Reports & P&L Statement" : "Daily Register Closings & Audits"}
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            {activeTab === "pnl"
              ? "Real-time profit & loss statement: Revenue, Manufacturing Costs (CP), Day-End Wastage Loss & Net Profit"
              : "End-of-day register closing records, cash drawer reconciliations, and shortage/overage audit log"}
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          {/* Main Module Switcher (P&L vs Closings) */}
          <div className="flex bg-[#EFE7DA] p-1 rounded-xl border border-[#E8DED0] shadow-xs">
            <button
              onClick={() => setActiveTab("pnl")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[38px] touch-manipulation flex items-center gap-1.5 ${
                activeTab === "pnl"
                  ? "bg-[#43291F] text-white shadow-xs"
                  : "text-[#705B51] hover:text-[#43291F]"
              }`}
            >
              <FileBarChart className="w-3.5 h-3.5" />
              P&amp;L Statement
            </button>
            <button
              onClick={() => setActiveTab("closings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[38px] touch-manipulation flex items-center gap-1.5 ${
                activeTab === "closings"
                  ? "bg-[#43291F] text-white shadow-xs"
                  : "text-[#705B51] hover:text-[#43291F]"
              }`}
            >
              <ReceiptText className="w-3.5 h-3.5" />
              Daily Register Closings
              {discrepancyCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-red-600 text-white animate-pulse">
                  {discrepancyCount}
                </span>
              )}
            </button>
          </div>

          <Button
            size="sm"
            onClick={handlePrint}
            className="text-xs bg-[#43291F] hover:bg-[#341F17] text-white min-h-[38px] touch-manipulation shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: COMMERCIAL P&L STATEMENT ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "pnl" && (
        <div className="space-y-6">
          {/* Period Filter Switcher for P&L */}
          <div className="flex items-center justify-between bg-[#FFFDF8] border border-[#E8DED0] p-3 rounded-xl shadow-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#B56C4A]" />
              <span className="text-xs font-bold text-[#43291F]">Statement Horizon:</span>
            </div>
            <div className="flex bg-[#EFE7DA] p-0.5 rounded-lg border border-[#E8DED0]">
              <button
                onClick={() => setPeriod("today")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[32px] touch-manipulation ${
                  isToday ? "bg-[#43291F] text-white shadow-xs" : "text-[#705B51] hover:text-[#43291F]"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setPeriod("month")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[32px] touch-manipulation ${
                  !isToday ? "bg-[#43291F] text-white shadow-xs" : "text-[#705B51] hover:text-[#43291F]"
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {/* 4 Core Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: DAILY REGISTER CLOSINGS & AUDITS ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "closings" && (
        <div className="space-y-6">
          {/* 4 Summary Highlight Cards for Daily Closings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Latest Register Status */}
            <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#705B51]">
                Latest Register Status
              </span>
              <div className="mt-2 flex items-center gap-2">
                {closings.length === 0 ? (
                  <Badge variant="outline" className="text-[#A09289] border-[#E8DED0]">
                    No Submissions
                  </Badge>
                ) : closings[0].status === "discrepancy" ? (
                  <Badge className="bg-red-100 text-red-800 border-red-300 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    Discrepancy Detected
                  </Badge>
                ) : closings[0].status === "reviewed" ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    Audited &amp; Reconciled
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-600" />
                    Submitted
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-[#705B51] mt-2">
                {closings.length > 0
                  ? `Last closed: ${formatDate(closings[0].closing_date)}`
                  : "Awaiting end-of-day closing"}
              </p>
            </Card>

            {/* 2. Total Drawer Cash Reconciled */}
            <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#737B52]">
                Total Counted Cash Drawer
              </span>
              <p className="font-serif text-2xl font-bold text-[#43291F] mt-1 font-mono">
                {formatCurrency(totalDrawerCash)}
              </p>
              <p className="text-[11px] text-[#705B51] mt-0.5">Physical currency counted across shifts</p>
            </Card>

            {/* 3. Net Cash Discrepancy */}
            <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#705B51]">
                Net Cash Drawer Variance
              </span>
              <p
                className={`font-serif text-2xl font-bold mt-1 font-mono ${
                  totalDiscrepancyAmount < 0
                    ? "text-red-700"
                    : totalDiscrepancyAmount > 0
                    ? "text-blue-700"
                    : "text-emerald-800"
                }`}
              >
                {totalDiscrepancyAmount < 0
                  ? `-${formatCurrency(Math.abs(totalDiscrepancyAmount))}`
                  : totalDiscrepancyAmount > 0
                  ? `+${formatCurrency(totalDiscrepancyAmount)}`
                  : "₹0.00 (Balanced)"}
              </p>
              <p className="text-[11px] text-[#705B51] mt-0.5">
                {totalDiscrepancyAmount < 0
                  ? "Cumulative shortage in physical drawer"
                  : totalDiscrepancyAmount > 0
                  ? "Net cash overage counted"
                  : "All registers perfectly balanced"}
              </p>
            </Card>

            {/* 4. Digital & UPI Inflows */}
            <Card className="border-[#E8DED0] bg-[#FAF0EB] p-4 shadow-xs border-[#F3DDD2]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B56C4A]">
                Digital &amp; UPI Inflows
              </span>
              <p className="font-serif text-2xl font-bold text-[#43291F] mt-1 font-mono">
                {formatCurrency(totalDigitalSales)}
              </p>
              <p className="text-[11px] text-[#705B51] mt-0.5">Direct to cafe bank account</p>
            </Card>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFFDF8] p-3 rounded-xl border border-[#E8DED0] shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#705B51]" />
              <Input
                placeholder="Search closing date, manager, notes..."
                value={closingSearch}
                onChange={(e) => setClosingSearch(e.target.value)}
                className="pl-9 h-9 text-xs border-[#E8DED0] bg-[#F8F3E9] focus:bg-white"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setClosingFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] touch-manipulation whitespace-nowrap ${
                  closingFilter === "all"
                    ? "bg-[#43291F] text-white shadow-xs"
                    : "bg-[#F8F3E9] text-[#705B51] hover:text-[#43291F] border border-[#E8DED0]"
                }`}
              >
                All Closings ({closings.length})
              </button>
              <button
                onClick={() => setClosingFilter("discrepancy")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] touch-manipulation whitespace-nowrap flex items-center gap-1 ${
                  closingFilter === "discrepancy"
                    ? "bg-red-700 text-white shadow-xs"
                    : "bg-[#F8F3E9] text-red-700 hover:bg-red-50 border border-red-200"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Discrepancies ({closings.filter((c) => c.status === "discrepancy").length})
              </button>
              <button
                onClick={() => setClosingFilter("reviewed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] touch-manipulation whitespace-nowrap flex items-center gap-1 ${
                  closingFilter === "reviewed"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-[#F8F3E9] text-emerald-800 hover:bg-emerald-50 border border-emerald-200"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Reviewed &amp; Balanced
              </button>
            </div>
          </div>

          {/* ── Desktop Audit Table (>= 768px) ── */}
          <div className="hidden md:block">
            <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F3E9] text-[#43291F] font-bold border-b border-[#E8DED0]">
                    <tr>
                      <th className="py-3 px-4">Closing Date</th>
                      <th className="py-3 px-4">Manager</th>
                      <th className="py-3 px-4 text-right">Total Sales</th>
                      <th className="py-3 px-4">Payment Tender</th>
                      <th className="py-3 px-4 text-right">Expected Drawer</th>
                      <th className="py-3 px-4 text-right">Counted Cash</th>
                      <th className="py-3 px-4 text-right">Variance / Diff</th>
                      <th className="py-3 px-4 text-center">Audit Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DED0]">
                    {filteredClosings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-[#A09289]">
                          <ReceiptText className="w-8 h-8 mx-auto mb-2 text-[#C8BCB3]" />
                          No daily closing records match your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredClosings.map((c) => {
                        const diff = Number(c.difference || 0)
                        return (
                          <tr key={c.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                            {/* Date */}
                            <td className="py-3 px-4 font-bold text-[#43291F] whitespace-nowrap">
                              {formatDate(c.closing_date)}
                            </td>

                            {/* Manager */}
                            <td className="py-3 px-4 text-[#705B51] whitespace-nowrap">
                              <span className="font-semibold text-[#43291F]">
                                {c.profiles?.full_name || "Store Manager"}
                              </span>
                            </td>

                            {/* Total Sales */}
                            <td className="py-3 px-4 text-right font-serif font-bold text-[#43291F] font-mono whitespace-nowrap">
                              {formatCurrency(c.total_sales)}
                            </td>

                            {/* Tender Breakdown */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 text-[11px]">
                                <span className="text-emerald-800 font-semibold">
                                  Cash: {formatCurrency(c.cash_sales)}
                                </span>
                                <span className="text-blue-700 font-semibold">
                                  UPI: {formatCurrency(c.upi_sales)}
                                </span>
                              </div>
                            </td>

                            {/* Expected Drawer */}
                            <td className="py-3 px-4 text-right font-mono text-[#705B51] whitespace-nowrap">
                              {formatCurrency(c.expected_cash)}
                            </td>

                            {/* Counted Cash */}
                            <td className="py-3 px-4 text-right font-serif font-bold text-[#43291F] font-mono whitespace-nowrap">
                              {formatCurrency(c.actual_cash)}
                            </td>

                            {/* Variance */}
                            <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                              {diff < 0 ? (
                                <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                  -{formatCurrency(Math.abs(diff))}
                                </span>
                              ) : diff > 0 ? (
                                <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  +{formatCurrency(diff)}
                                </span>
                              ) : (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  Balanced
                                </span>
                              )}
                            </td>

                            {/* Status Badge */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {c.status === "discrepancy" ? (
                                <Badge className="bg-red-100 text-red-800 border-red-300 font-bold inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-red-600" />
                                  Discrepancy
                                </Badge>
                              ) : c.status === "reviewed" ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  Reviewed
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-blue-600" />
                                  Submitted
                                </Badge>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedClosing(c)
                                  setReviewError(null)
                                  setReviewSuccess(null)
                                  setReviewNotes("")
                                }}
                                className="text-xs border-[#E8DED0] hover:bg-[#FAF0EB] text-[#43291F] min-h-[32px] touch-manipulation"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1 text-[#B56C4A]" />
                                Inspect &amp; Audit
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* ── Mobile Audit Cards (< 768px) ── */}
          <div className="block md:hidden space-y-3">
            {filteredClosings.length === 0 ? (
              <Card className="border-[#E8DED0] bg-[#FFFDF8] p-8 text-center text-[#A09289]">
                <ReceiptText className="w-8 h-8 mx-auto mb-2 text-[#C8BCB3]" />
                No daily closing records found.
              </Card>
            ) : (
              filteredClosings.map((c) => {
                const diff = Number(c.difference || 0)
                return (
                  <Card key={c.id} className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E8DED0] pb-2.5">
                      <div>
                        <span className="font-bold text-sm text-[#43291F] block">
                          {formatDate(c.closing_date)}
                        </span>
                        <span className="text-[11px] text-[#705B51]">
                          Submitted by {c.profiles?.full_name || "Store Manager"}
                        </span>
                      </div>
                      {c.status === "discrepancy" ? (
                        <Badge className="bg-red-100 text-red-800 border-red-300 font-bold text-[10px]">
                          Discrepancy
                        </Badge>
                      ) : c.status === "reviewed" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                          Reviewed
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold text-[10px]">
                          Submitted
                        </Badge>
                      )}
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#F8F3E9] p-2 rounded-lg">
                        <span className="text-[10px] text-[#705B51] uppercase font-bold block">
                          Total Gross Sales
                        </span>
                        <span className="font-serif font-bold text-[#43291F] font-mono text-sm">
                          {formatCurrency(c.total_sales)}
                        </span>
                      </div>
                      <div className="bg-[#F8F3E9] p-2 rounded-lg">
                        <span className="text-[10px] text-[#705B51] uppercase font-bold block">
                          Actual Counted Cash
                        </span>
                        <span className="font-serif font-bold text-[#43291F] font-mono text-sm">
                          {formatCurrency(c.actual_cash)}
                        </span>
                      </div>
                      <div className="bg-[#F8F3E9] p-2 rounded-lg">
                        <span className="text-[10px] text-[#705B51] uppercase font-bold block">
                          Expected Cash Drawer
                        </span>
                        <span className="font-mono text-[#705B51] text-xs">
                          {formatCurrency(c.expected_cash)}
                        </span>
                      </div>
                      <div className="bg-[#F8F3E9] p-2 rounded-lg">
                        <span className="text-[10px] text-[#705B51] uppercase font-bold block">
                          Cash Variance
                        </span>
                        <span
                          className={`font-mono font-bold text-xs ${
                            diff < 0 ? "text-red-700" : diff > 0 ? "text-blue-700" : "text-emerald-700"
                          }`}
                        >
                          {diff < 0
                            ? `-${formatCurrency(Math.abs(diff))}`
                            : diff > 0
                            ? `+${formatCurrency(diff)}`
                            : "Balanced"}
                        </span>
                      </div>
                    </div>

                    {/* Tender split */}
                    <div className="text-[11px] text-[#705B51] flex justify-between px-1">
                      <span>Cash: {formatCurrency(c.cash_sales)}</span>
                      <span>UPI: {formatCurrency(c.upi_sales)}</span>
                    </div>

                    {/* Remarks snippet if any */}
                    {c.remarks && (
                      <p className="text-[11px] bg-[#FAF0EB] p-2 rounded-lg text-[#705B51] border border-[#F3DDD2] italic">
                        &ldquo;{c.remarks}&rdquo;
                      </p>
                    )}

                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedClosing(c)
                        setReviewError(null)
                        setReviewSuccess(null)
                        setReviewNotes("")
                      }}
                      className="w-full text-xs bg-[#43291F] hover:bg-[#341F17] text-white min-h-[38px] touch-manipulation"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Inspect &amp; Review Closing
                    </Button>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: INSPECT & AUDIT DAILY CLOSING ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Dialog open={Boolean(selectedClosing)} onOpenChange={(open) => !open && setSelectedClosing(null)}>
        {selectedClosing && (
          <DialogContent className="max-w-lg bg-[#FFFDF8] border-[#E8DED0] p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-[#E8DED0] pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="font-serif text-lg font-bold text-[#43291F]">
                    Register Closing Audit: {formatDate(selectedClosing.closing_date)}
                  </DialogTitle>
                  <p className="text-xs text-[#705B51] mt-0.5">
                    Submitted by {selectedClosing.profiles?.full_name || "Store Manager"}
                  </p>
                </div>
                {selectedClosing.status === "discrepancy" ? (
                  <Badge className="bg-red-100 text-red-800 border-red-300 font-bold">
                    Discrepancy
                  </Badge>
                ) : selectedClosing.status === "reviewed" ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
                    Audited &amp; Reviewed
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold">
                    Submitted
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {reviewError && (
                <Alert className="bg-red-50 border-red-200 text-red-900 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription>{reviewError}</AlertDescription>
                </Alert>
              )}

              {reviewSuccess && (
                <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <AlertDescription>{reviewSuccess}</AlertDescription>
                </Alert>
              )}

              {/* Mathematical Cash Reconciliation Box */}
              <div className="bg-[#F8F3E9] p-4 rounded-xl border border-[#E8DED0] space-y-2.5 text-xs">
                <span className="font-bold text-[#43291F] block text-xs uppercase tracking-wide">
                  Cash Drawer Mathematical Reconciliation
                </span>

                <div className="flex justify-between items-center text-[#705B51]">
                  <span>Total Cash Sales Collected</span>
                  <span className="font-mono font-semibold text-[#43291F]">
                    {formatCurrency(selectedClosing.cash_sales)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#705B51]">
                  <span>Less: Cash Store Expenses Deducted</span>
                  <span className="font-mono font-semibold text-red-700">
                    - {formatCurrency(Math.max(0, Number(selectedClosing.cash_sales || 0) - Number(selectedClosing.expected_cash || 0)))}
                  </span>
                </div>

                <div className="border-t border-[#E8DED0] pt-2 flex justify-between items-center font-bold text-[#43291F]">
                  <span>= Expected Cash in Drawer</span>
                  <span className="font-mono text-sm">
                    {formatCurrency(selectedClosing.expected_cash)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#43291F] bg-white p-2.5 rounded-lg border border-[#E8DED0]">
                  <span className="font-bold">Physical Currency Counted by Manager</span>
                  <span className="font-serif font-bold text-sm text-[#43291F] font-mono">
                    {formatCurrency(selectedClosing.actual_cash)}
                  </span>
                </div>

                <div
                  className={`p-2.5 rounded-lg border flex justify-between items-center font-bold ${
                    Number(selectedClosing.difference || 0) < 0
                      ? "bg-red-50 border-red-200 text-red-800"
                      : Number(selectedClosing.difference || 0) > 0
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : "bg-emerald-50 border-emerald-200 text-emerald-800"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {Number(selectedClosing.difference || 0) < 0 && <AlertTriangle className="w-4 h-4 text-red-600" />}
                    {Number(selectedClosing.difference || 0) === 0 && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {Number(selectedClosing.difference || 0) < 0
                      ? "Cash Shortage Detected:"
                      : Number(selectedClosing.difference || 0) > 0
                      ? "Cash Overage Detected:"
                      : "Register Status:"}
                  </span>
                  <span className="font-mono text-sm">
                    {Number(selectedClosing.difference || 0) < 0
                      ? `-${formatCurrency(Math.abs(selectedClosing.difference))}`
                      : Number(selectedClosing.difference || 0) > 0
                      ? `+${formatCurrency(selectedClosing.difference)}`
                      : "Zero Discrepancy (Balanced)"}
                  </span>
                </div>
              </div>

              {/* Digital & UPI Overview */}
              <div className="bg-[#FAF0EB] p-3 rounded-xl border border-[#F3DDD2] text-xs space-y-1.5">
                <div className="flex justify-between items-center text-[#705B51]">
                  <span>UPI / QR Digital Collections (Direct to Bank):</span>
                  <span className="font-mono font-bold text-[#43291F]">
                    {formatCurrency(selectedClosing.upi_sales)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#705B51]">
                  <span>Card / POS Machine Collections:</span>
                  <span className="font-mono font-bold text-[#43291F]">
                    {formatCurrency(selectedClosing.card_sales)}
                  </span>
                </div>
                <div className="border-t border-[#F3DDD2] pt-1.5 flex justify-between items-center font-bold text-[#43291F]">
                  <span>Total Gross Turnover Registered:</span>
                  <span className="font-serif font-bold text-sm font-mono text-[#B56C4A]">
                    {formatCurrency(selectedClosing.total_sales)}
                  </span>
                </div>
              </div>

              {/* Manager's Closing Remarks */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#43291F]">Store Manager Closing Explanation</Label>
                <div className="bg-[#F8F3E9] p-3 rounded-lg border border-[#E8DED0] text-xs text-[#43291F]">
                  {selectedClosing.remarks || "No explanation remarks entered by the cashier/manager."}
                </div>
              </div>

              {/* Admin Review Action Area */}
              {selectedClosing.status !== "reviewed" ? (
                <div className="space-y-3 border-t border-[#E8DED0] pt-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-[#43291F]">
                      Admin Audit Verification Remarks (Optional)
                    </Label>
                    <Input
                      placeholder="e.g. Verified change shortage of ₹25. Discrepancy acknowledged."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="text-xs border-[#E8DED0] bg-[#F8F3E9] focus:bg-white"
                    />
                  </div>

                  <Button
                    onClick={handleReviewClosing}
                    disabled={reviewing}
                    className="w-full bg-[#43291F] hover:bg-[#341F17] text-white text-xs font-bold min-h-[42px] touch-manipulation shadow-xs flex items-center justify-center gap-2"
                  >
                    {reviewing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving Audit Verification...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Acknowledge &amp; Mark as Reviewed
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    This daily register closing has been reviewed and acknowledged by the cafe administration.
                  </span>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
