"use client"

import * as React from "react"
import { Trash2, AlertTriangle, ArrowRight, History, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { recordProductWastageAction } from "@/lib/actions/billing"
import { formatCurrency, formatDateTime } from "@/lib/utils"

interface ProductItem {
  id: string
  name: string
  base_price: number
  cost_price: number
  current_stock: number
}

interface WastageFormProps {
  products: ProductItem[]
  recentWastages?: any[]
}

const REASON_OPTIONS = [
  "End of Day Unsold (Expired)",
  "Spoiled / Stale / Mold",
  "Preparation Mistake / Burnt",
  "Spilled / Dropped / Damaged",
  "Customer Return / Rejection",
  "Tasting / Quality Audit",
  "Other",
]

export function WastageForm({ products, recentWastages = [] }: WastageFormProps) {
  const [productId, setProductId] = React.useState<string>(products[0]?.id || "")
  const [quantity, setQuantity] = React.useState<string>("1")
  const [reason, setReason] = React.useState<string>(REASON_OPTIONS[0])
  const [notes, setNotes] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const [logs, setLogs] = React.useState<any[]>(recentWastages)

  const selectedProduct = React.useMemo(() => {
    return products.find((p) => p.id === productId)
  }, [products, productId])

  const qtyNum = Math.max(1, parseInt(quantity, 10) || 1)
  const costPrice = Number(selectedProduct?.cost_price || 0)
  const calculatedLoss = qtyNum * costPrice

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!productId || qtyNum <= 0) {
      setMessage({ type: "error", text: "Please select a product and enter a positive quantity" })
      return
    }

    setLoading(true)
    try {
      const res = await recordProductWastageAction({
        product_id: productId,
        quantity: qtyNum,
        reason,
        notes: notes.trim() || null,
      })

      if (res.success) {
        setMessage({
          type: "success",
          text: `Logged ${qtyNum}x ${selectedProduct?.name} as wastage. Financial loss of ${formatCurrency(
            calculatedLoss
          )} recorded.`,
        })
        setQuantity("1")
        setNotes("")
        // Add to local logs
        setLogs((prev) => [
          {
            id: res.result?.wastage_id || Math.random().toString(),
            product_id: productId,
            products: { name: selectedProduct?.name, cost_price: costPrice },
            quantity: qtyNum,
            total_loss: calculatedLoss,
            reason,
            notes,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])
      } else {
        setMessage({ type: "error", text: res.error || "Failed to record wastage" })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage({ type: "error", text: msg })
    } finally {
      setLoading(false)
    }
  }

  const totalDayLoss = React.useMemo(() => {
    return logs.reduce((sum, item) => sum + Number(item.total_loss || 0), 0)
  }, [logs])

  return (
    <div className="max-w-4xl mx-auto space-y-6 w-full min-w-0">
      {/* Title */}
      <div>
        <h2 className="font-serif text-fluid-h2 font-bold text-[#43291F]">
          Day-End Product Wastage & Loss Logging
        </h2>
        <p className="text-xs text-[#705B51] mt-0.5">
          Log spoiled, expired, or unsold cafe menu items. Losses are calculated based on manufacturing cost and deducted from the daily P&L.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Form Card */}
        <Card className="lg:col-span-2 border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
          <CardHeader className="border-b border-[#E8DED0] pb-3 sm:pb-4 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg text-[#43291F] flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Record Wasted Menu Items
            </CardTitle>
            <CardDescription className="text-xs">
              Select the food/drink item wasted, enter the quantity, and choose the reason.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {message && (
              <Alert
                variant={message.type === "success" ? "olive" : "destructive"}
                className="mb-6"
              >
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Product select */}
              <div className="space-y-1.5">
                <Label htmlFor="product">Menu Item / Dish</Label>
                <Select
                  id="product"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Selling: {formatCurrency(p.base_price)} | Cost: {formatCurrency(p.cost_price)})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Quantity & Loss Live Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="qty">Quantity Wasted (units)</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="font-bold text-base"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#705B51]">Calculated Loss Value</Label>
                  <div className="h-10 px-3.5 flex items-center justify-between rounded-md bg-red-50 border border-red-200 text-red-900 font-bold">
                    <span>{formatCurrency(calculatedLoss)}</span>
                    <span className="text-[10px] text-red-700 font-normal">
                      (@ {formatCurrency(costPrice)} cost/unit)
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="reason">Wastage Reason</Label>
                <Select
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-white"
                >
                  {REASON_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Shift Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Manager Remarks (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. 3 Puffs unsold after 10 PM closing; 1 Cold Coffee cup dropped during preparation."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-20 text-xs bg-white"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-red-700 hover:bg-red-800 text-white font-bold text-sm shadow flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Recording Loss...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Wastage of {formatCurrency(calculatedLoss)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sidebar Summary & Recent Logs */}
        <div className="space-y-6">
          <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#E8DED0]">
              <CardTitle className="text-xs font-bold text-[#705B51] uppercase tracking-wider">
                Today&apos;s Wastage Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <span className="font-serif text-3xl font-bold text-red-700 block">
                {formatCurrency(totalDayLoss)}
              </span>
              <p className="text-xs text-[#705B51] leading-relaxed">
                This loss will be automatically deducted from today&apos;s Gross Profit on the Admin closing reports.
              </p>
            </CardContent>
          </Card>

          {/* Recent Logs */}
          <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#E8DED0]">
              <CardTitle className="text-sm font-bold text-[#43291F] flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#B56C4A]" />
                Today&apos;s Recorded Wastage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {logs.length === 0 ? (
                <p className="text-xs text-[#A09289] italic text-center py-4">
                  No product wastage recorded today.
                </p>
              ) : (
                logs.slice(0, 5).map((l) => (
                  <div
                    key={l.id}
                    className="p-2.5 rounded-lg border border-red-100 bg-red-50/50 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center font-bold text-[#43291F]">
                      <span>{l.products?.name}</span>
                      <span className="text-red-700 font-serif">
                        -{formatCurrency(l.total_loss)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#705B51]">
                      <span>Qty: {l.quantity} units</span>
                      <span className="text-[10px] text-[#A09289] truncate max-w-[120px]">{l.reason}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
