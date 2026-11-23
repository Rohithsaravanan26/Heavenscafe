"use client"

import * as React from "react"
import {
  Boxes,
  AlertTriangle,
  Trash2,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  RefreshCw,
  PackageCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { adjustProductStockAction } from "@/lib/actions/billing"
import { formatCurrency, formatDateTime } from "@/lib/utils"

interface AdminInventoryManagerProps {
  products: any[]
  wastages: any[]
}

export function AdminInventoryManager({
  products: initialProducts,
  wastages: initialWastages,
}: AdminInventoryManagerProps) {
  const [products, setProducts] = React.useState<any[]>(initialProducts)
  const [wastages, setWastages] = React.useState<any[]>(initialWastages)
  const [activeTab, setActiveTab] = React.useState<"stocks" | "wastage">("stocks")
  const [search, setSearch] = React.useState("")
  const [onlyLowStock, setOnlyLowStock] = React.useState(false)

  // Quick Stock Inward / Adjustment Modal
  const [selectedProduct, setSelectedProduct] = React.useState<any | null>(null)
  const [adjustmentAmount, setAdjustmentAmount] = React.useState<number>(10)
  const [loading, setLoading] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  // Computed metrics
  const lowStockItems = React.useMemo(() => {
    return products.filter((p) => {
      const stock = Number(p.current_stock ?? 0)
      const min = Number(p.min_stock ?? 10)
      return stock <= min
    })
  }, [products])

  const totalCostValue = React.useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.current_stock ?? 0) * Number(p.cost_price ?? 0)), 0)
  }, [products])

  const totalSalesValue = React.useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.current_stock ?? 0) * Number(p.base_price ?? 0)), 0)
  }, [products])

  const todayStr = new Date().toISOString().split("T")[0]
  const todayWastages = React.useMemo(() => {
    return wastages.filter((w) => w.wastage_date === todayStr)
  }, [wastages, todayStr])

  const todayWastageLoss = React.useMemo(() => {
    return todayWastages.reduce((acc, w) => acc + Number(w.total_loss || w.total_cost_loss || 0), 0)
  }, [todayWastages])

  const totalWastageLoss = React.useMemo(() => {
    return wastages.reduce((acc, w) => acc + Number(w.total_loss || w.total_cost_loss || 0), 0)
  }, [wastages])

  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.menu_categories?.name?.toLowerCase().includes(search.toLowerCase())
      const isLow = Number(p.current_stock ?? 0) <= Number(p.min_stock ?? 10)
      const matchLow = onlyLowStock ? isLow : true
      return matchSearch && matchLow
    })
  }, [products, search, onlyLowStock])

  const handleQuickAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || adjustmentAmount === 0) return

    setLoading(true)
    try {
      const res = await adjustProductStockAction(selectedProduct.id, adjustmentAmount)
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === selectedProduct.id ? { ...p, current_stock: res.newStock } : p
          )
        )
        setStatusMsg({
          type: "success",
          text: `Stock for "${selectedProduct.name}" updated to ${res.newStock} units (${adjustmentAmount > 0 ? `+${adjustmentAmount}` : adjustmentAmount}).`,
        })
        setSelectedProduct(null)
      } else {
        setStatusMsg({ type: "error", text: res.error || "Failed to adjust stock" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#43291F]">
            Product Inventory &amp; Wastage
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Billzgo-style product stock tracking, quick inward adjustments, and day-end manager wastage loss audits
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-[#EFE7DA] p-1 rounded-lg border border-[#E8DED0]">
          <button
            onClick={() => setActiveTab("stocks")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "stocks"
                ? "bg-[#43291F] text-white shadow-xs"
                : "text-[#705B51] hover:text-[#43291F]"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Product Stocks ({products.length})
            {lowStockItems.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                {lowStockItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("wastage")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "wastage"
                ? "bg-[#43291F] text-white shadow-xs"
                : "text-[#705B51] hover:text-[#43291F]"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Day-End Wastage &amp; Loss ({wastages.length})
          </button>
        </div>
      </div>

      {statusMsg && (
        <Alert variant={statusMsg.type === "success" ? "olive" : "destructive"}>
          <AlertDescription>{statusMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* ── TAB 1: PRODUCT STOCKS & QUICK INWARD ── */}
      {activeTab === "stocks" && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#737B52]">
                Tracked Products
              </span>
              <p className="font-serif text-2xl font-bold text-[#43291F] mt-1 font-mono">
                {products.length}
              </p>
              <p className="text-[11px] text-[#705B51] mt-0.5">Finished cafe catalogue</p>
            </Card>

            <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                Low Stock Alerts
              </span>
              <p className="font-serif text-2xl font-bold text-red-700 mt-1 font-mono">
                {lowStockItems.length}
              </p>
              <p className="text-[11px] text-red-600 mt-0.5">Requires immediate restock</p>
            </Card>

            <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#737B52]">
                Stock Value (Cost)
              </span>
              <p className="font-serif text-2xl font-bold text-[#43291F] mt-1 font-mono">
                {formatCurrency(totalCostValue)}
              </p>
              <p className="text-[11px] text-[#705B51] mt-0.5">Total manufacturing value</p>
            </Card>

            <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B56C4A]">
                Sales Potential
              </span>
              <p className="font-serif text-2xl font-bold text-[#B56C4A] mt-1 font-mono">
                {formatCurrency(totalSalesValue)}
              </p>
              <p className="text-[11px] text-[#705B51] mt-0.5">Estimated gross retail value</p>
            </Card>
          </div>

          {/* Low Stock Watchlist Banner */}
          {lowStockItems.length > 0 && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-950">
                    Low Stock Alert — {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} at or below minimum threshold
                  </p>
                  <p className="text-[11px] text-red-800 mt-0.5">
                    {lowStockItems.slice(0, 4).map((p) => `${p.name} (${p.current_stock} left)`).join(", ")}
                    {lowStockItems.length > 4 ? "..." : ""}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOnlyLowStock(!onlyLowStock)}
                className="text-xs border-red-300 text-red-800 hover:bg-red-100"
              >
                {onlyLowStock ? "Show All Products" : "Filter Low Stock Items"}
              </Button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <Card className="border-[#E8DED0] bg-[#FFFDF8] p-3 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#A09289]" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9 bg-[#F8F3E9]"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-[#705B51] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyLowStock}
                    onChange={(e) => setOnlyLowStock(e.target.checked)}
                    className="rounded text-red-600"
                  />
                  Only Low Stock ({lowStockItems.length})
                </label>
              </div>
            </div>
          </Card>

          {/* Product Stocks Table */}
          <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
                  <tr>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Mfg Cost (CP)</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-center">Min Alert</th>
                    <th className="py-3 px-4 text-right">Stock Valuation</th>
                    <th className="py-3 px-4 text-right">Quick Inward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DED0]">
                  {filteredProducts.map((p) => {
                    const stock = Number(p.current_stock ?? 0)
                    const min = Number(p.min_stock ?? 10)
                    const cp = Number(p.cost_price ?? 0)
                    const sp = Number(p.base_price ?? 0)
                    const isLow = stock <= min

                    return (
                      <tr key={p.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                        <td className="py-3 px-4 font-serif font-bold text-sm text-[#43291F]">
                          {p.name}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="olive" className="text-[10px]">
                            {p.menu_categories?.name || "General"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#43291F]">
                          {formatCurrency(sp)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#705B51]">
                          {formatCurrency(cp)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isLow
                                ? "bg-red-100 text-red-800"
                                : "bg-[#F0F1EA] text-[#737B52]"
                            }`}
                          >
                            {isLow && <AlertTriangle className="w-3 h-3 text-red-600" />}
                            {stock} units
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-[#A09289] font-mono">
                          {min} units
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#43291F]">
                          {formatCurrency(stock * cp)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(p)
                              setAdjustmentAmount(10)
                            }}
                            className="h-7 text-xs border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F]"
                          >
                            <PackageCheck className="w-3 h-3 mr-1 text-[#737B52]" />
                            Adjust / Inward
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredProducts.length === 0 && (
              <div className="py-12 text-center text-[#A09289]">
                <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-serif font-bold text-base text-[#43291F]">No Products Found</p>
                <p className="text-xs text-[#705B51] mt-1">Try adjusting your search query.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 2: DAY-END WASTAGE & LOSS LOG ── */}
      {activeTab === "wastage" && (
        <div className="space-y-6">
          {/* Wastage Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                Today&apos;s Wastage Loss
              </span>
              <p className="font-serif text-2xl font-bold text-red-700 mt-1 font-mono">
                {formatCurrency(todayWastageLoss)}
              </p>
              <p className="text-[11px] text-[#705B51] mt-0.5">
                {todayWastages.length} product entries today
              </p>
            </Card>

            <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#705B51]">
                Today&apos;s Units Wasted
              </span>
              <p className="font-serif text-2xl font-bold text-[#43291F] mt-1 font-mono">
                {todayWastages.reduce((acc, w) => acc + Number(w.quantity || 0), 0)}
              </p>
              <p className="text-[11px] text-[#705B51] mt-0.5">Logged by managers at day end</p>
            </Card>

            <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                Total Recorded Loss
              </span>
              <p className="font-serif text-2xl font-bold text-red-700 mt-1 font-mono">
                {formatCurrency(totalWastageLoss)}
              </p>
              <p className="text-[11px] text-[#705B51] mt-0.5">Deducted from operating profit</p>
            </Card>

            <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#737B52]">
                Total Wastage Entries
              </span>
              <p className="font-serif text-2xl font-bold text-[#43291F] mt-1 font-mono">
                {wastages.length}
              </p>
              <p className="text-[11px] text-[#705B51] mt-0.5">Full audit trail</p>
            </Card>
          </div>

          {/* Wastage History Table */}
          <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
            <CardHeader className="p-4 border-b border-[#E8DED0] bg-[#F8F3E9]">
              <CardTitle className="font-serif text-base font-bold text-[#43291F]">
                Manager Day-End Wastage Logs
              </CardTitle>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F3E9]/50 border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
                  <tr>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-center">Units Wasted</th>
                    <th className="py-3 px-4 text-right">Cost Price (CP)</th>
                    <th className="py-3 px-4 text-right">Financial Loss</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Logged By</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DED0]">
                  {wastages.map((w) => {
                    const loss = Number(w.total_loss || w.total_cost_loss || 0)
                    const cp = Number(w.cost_price || 0)

                    return (
                      <tr key={w.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                        <td className="py-3 px-4 text-[#705B51] whitespace-nowrap">
                          {formatDateTime(w.created_at)}
                        </td>
                        <td className="py-3 px-4 font-serif font-bold text-sm text-[#43291F]">
                          {w.products?.name || "Product"}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-red-700">
                          {w.quantity} units
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#705B51]">
                          {formatCurrency(cp)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-red-700">
                          -{formatCurrency(loss)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {w.reason?.replace("_", " ") || "Expired"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-[#705B51]">
                          {w.profiles?.full_name || "Manager"}
                        </td>
                        <td className="py-3 px-4 text-[#705B51] max-w-xs truncate">
                          {w.notes || "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {wastages.length === 0 && (
              <div className="py-14 text-center text-[#A09289]">
                <Trash2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#737B52]" />
                <p className="font-serif font-bold text-base text-[#43291F]">No Wastage Logged</p>
                <p className="text-xs text-[#705B51] mt-1">
                  Managers log end-of-day expired or damaged items from the POS Wastage tab.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── QUICK STOCK INWARD / ADJUSTMENT MODAL ── */}
      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Stock Inward / Adjustment: {selectedProduct.name}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleQuickAdjust} className="space-y-4 pt-2">
              <div className="p-3 rounded-lg bg-[#F8F3E9] border border-[#E8DED0] space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#705B51]">Current Stock:</span>
                  <span className="font-bold text-[#43291F] font-mono">{selectedProduct.current_stock ?? 0} units</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#705B51]">Unit Cost (CP):</span>
                  <span className="font-bold text-[#43291F] font-mono">{formatCurrency(selectedProduct.cost_price || 0)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjAmount">Quantity to Inward / Adjust (+ / -)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="adjAmount"
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(parseInt(e.target.value, 10) || 0)}
                    required
                    className="font-mono text-base font-bold"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  {[+10, +25, +50, +100, -5].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAdjustmentAmount(amt)}
                      className="px-2.5 py-1 rounded bg-[#EFE7DA] text-xs font-bold text-[#43291F] hover:bg-[#E8DED0]"
                    >
                      {amt > 0 ? `+${amt}` : amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#FFFDF8] border border-[#E8DED0] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#705B51]">New Stock After Inward:</span>
                  <span className="font-bold text-[#737B52] font-mono text-sm">
                    {Math.max(0, (selectedProduct.current_stock || 0) + adjustmentAmount)} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#705B51]">Inward Cost Value:</span>
                  <span className="font-bold text-[#43291F] font-mono">
                    {formatCurrency(Math.max(0, adjustmentAmount) * (selectedProduct.cost_price || 0))}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || adjustmentAmount === 0}
                className="w-full h-11 bg-[#43291F] hover:bg-[#341F17] text-white font-bold"
              >
                {loading ? "Updating Stock..." : "Confirm Stock Inward"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
