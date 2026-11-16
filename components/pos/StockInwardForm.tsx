"use client"

import * as React from "react"
import { PackagePlus, Plus, Trash2, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { receiveStockAction } from "@/lib/actions/inventory"
import { Ingredient, Supplier } from "@/types/database"
import { formatCurrency } from "@/lib/utils"

interface StockInwardFormProps {
  ingredients: Ingredient[]
  suppliers: Supplier[]
}

interface InwardLine {
  ingredientId: string
  quantityPurchased: number
  quantityReceived: number
  unitCost: number
  discrepancyReason: string
}

export function StockInwardForm({ ingredients, suppliers }: StockInwardFormProps) {
  const [supplierId, setSupplierId] = React.useState<string>("")
  const [referenceNo, setReferenceNo] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [lines, setLines] = React.useState<InwardLine[]>([
    {
      ingredientId: ingredients[0]?.id || "",
      quantityPurchased: 1,
      quantityReceived: 1,
      unitCost: 0,
      discrepancyReason: "",
    },
  ])
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        ingredientId: ingredients[0]?.id || "",
        quantityPurchased: 1,
        quantityReceived: 1,
        unitCost: 0,
        discrepancyReason: "",
      },
    ])
  }

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleLineChange = (index: number, field: keyof InwardLine, value: any) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    )
  }

  // When purchased qty changes, by default sync received qty unless manager changes it
  const handlePurchasedChange = (index: number, val: number) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line
        const shouldSync = line.quantityReceived === line.quantityPurchased || line.quantityReceived === 0
        return {
          ...line,
          quantityPurchased: val,
          quantityReceived: shouldSync ? val : line.quantityReceived,
        }
      })
    )
  }

  const summary = React.useMemo(() => {
    let totalPurchasedVal = 0
    let totalReceivedVal = 0
    let missingCount = 0
    let totalShortfallVal = 0

    lines.forEach((line) => {
      const pQty = Number(line.quantityPurchased) || 0
      const rQty = Number(line.quantityReceived) || 0
      const cost = Number(line.unitCost) || 0
      totalPurchasedVal += pQty * cost
      totalReceivedVal += rQty * cost

      if (rQty < pQty) {
        missingCount += 1
        totalShortfallVal += (pQty - rQty) * cost
      }
    })

    return { totalPurchasedVal, totalReceivedVal, missingCount, totalShortfallVal }
  }, [lines])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (lines.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one ingredient to inward' })
      return
    }

    for (const l of lines) {
      if (!l.ingredientId || l.quantityPurchased <= 0 || l.quantityReceived < 0 || l.unitCost < 0) {
        setMessage({
          type: 'error',
          text: 'All line items must have valid ingredient, positive purchased quantity, non-negative received quantity, and valid cost.',
        })
        return
      }

      if (l.quantityReceived < l.quantityPurchased && !l.discrepancyReason.trim()) {
        setMessage({
          type: 'error',
          text: 'Please provide a discrepancy note for any item where physical stock received is less than purchased.',
        })
        return
      }
    }

    setLoading(true)
    try {
      const res = await receiveStockAction({
        supplier_id: supplierId || null,
        reference_no: referenceNo.trim() || null,
        notes: notes.trim() || null,
        items: lines.map((l) => ({
          ingredient_id: l.ingredientId,
          quantity: Number(l.quantityReceived), // physical quantity
          quantity_purchased: Number(l.quantityPurchased),
          quantity_received: Number(l.quantityReceived),
          unit_cost: Number(l.unitCost),
          discrepancy_reason: l.discrepancyReason.trim() || null,
        })),
      })

      if (res.success) {
        setMessage({
          type: 'success',
          text: `Stock inward recorded successfully! Physical stock of ${formatCurrency(summary.totalReceivedVal)} added to inventory. ${
            summary.missingCount > 0
              ? `⚠️ ${summary.missingCount} item(s) flagged as missing/shortfall for Admin review.`
              : 'All items matched supplier invoice.'
          }`,
        })
        setLines([
          {
            ingredientId: ingredients[0]?.id || "",
            quantityPurchased: 1,
            quantityReceived: 1,
            unitCost: 0,
            discrepancyReason: "",
          },
        ])
        setReferenceNo("")
        setNotes("")
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to receive stock' })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#43291F]">
          Stock Inward & Physical Verification
        </h2>
        <p className="text-xs text-[#705B51]">
          Record supplier delivery invoices and cross-verify with actual physical stock received at Heaven&apos;s Cafe
        </p>
      </div>

      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
        <CardHeader className="border-b border-[#E8DED0] pb-4">
          <CardTitle className="text-lg text-[#43291F] flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-[#737B52]" />
            Receive & Verify Delivery
          </CardTitle>
          <CardDescription>
            Enter the invoice quantity from the supplier and the physical quantity you counted on delivery. Any missing items will be highlighted and logged for Admin cross-verification.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          {message && (
            <Alert
              variant={message.type === 'success' ? 'olive' : 'destructive'}
              className="mb-6"
            >
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="supplier">Supplier</Label>
                <Select
                  id="supplier"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">Select Supplier (Optional)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ""}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ref">Supplier Invoice / Bill No</Label>
                <Input
                  id="ref"
                  placeholder="e.g. INV-2026-908"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Delivery Condition / Notes</Label>
                <Input
                  id="notes"
                  placeholder="e.g. Received at 10 AM, sealed packaging"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Line items list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#43291F]">
                    Delivered Items ({lines.length})
                  </h4>
                  <p className="text-[11px] text-[#705B51]">
                    Verify billed amount against physically received count
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                  className="h-8 text-xs border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-[#737B52]" />
                  Add Another Item
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, idx) => {
                  const selectedIng = ingredients.find((i) => i.id === line.ingredientId)
                  const pQty = Number(line.quantityPurchased) || 0
                  const rQty = Number(line.quantityReceived) || 0
                  const diff = rQty - pQty
                  const isMissing = diff < -0.001
                  const isExcess = diff > 0.001
                  const isMatched = !isMissing && !isExcess

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg border transition-all ${
                        isMissing
                          ? "bg-red-50/60 border-red-200"
                          : isExcess
                          ? "bg-blue-50/60 border-blue-200"
                          : "bg-[#F8F3E9]/80 border-[#E8DED0]"
                      }`}
                    >
                      <div className="grid grid-cols-12 gap-3 items-center">
                        {/* Ingredient selector */}
                        <div className="col-span-12 sm:col-span-4">
                          <Label className="text-[10px] block mb-1 font-semibold text-[#43291F]">
                            Raw Ingredient / Product
                          </Label>
                          <Select
                            value={line.ingredientId}
                            onChange={(e) => handleLineChange(idx, "ingredientId", e.target.value)}
                            className="h-9 text-xs"
                          >
                            {ingredients.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name} (Current: {i.current_stock} {i.unit})
                              </option>
                            ))}
                          </Select>
                        </div>

                        {/* Purchased/Billed Qty */}
                        <div className="col-span-6 sm:col-span-2">
                          <Label className="text-[10px] block mb-1 font-semibold text-[#705B51]">
                            Billed Qty ({selectedIng?.unit || "unit"})
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={line.quantityPurchased}
                            onChange={(e) => handlePurchasedChange(idx, Number(e.target.value))}
                            className="h-9 text-xs"
                          />
                        </div>

                        {/* Physically Received Qty */}
                        <div className="col-span-6 sm:col-span-2">
                          <Label className="text-[10px] block mb-1 font-semibold text-[#43291F]">
                            Physical Qty ({selectedIng?.unit || "unit"})
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.quantityReceived}
                            onChange={(e) => handleLineChange(idx, "quantityReceived", Number(e.target.value))}
                            className={`h-9 text-xs font-semibold ${
                              isMissing ? "border-red-400 text-red-700 bg-red-50" : ""
                            }`}
                          />
                        </div>

                        {/* Unit Cost */}
                        <div className="col-span-6 sm:col-span-2">
                          <Label className="text-[10px] block mb-1 font-semibold text-[#705B51]">
                            Cost / Unit (₹)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.unitCost}
                            onChange={(e) => handleLineChange(idx, "unitCost", Number(e.target.value))}
                            className="h-9 text-xs"
                          />
                        </div>

                        {/* Status Badge & Actions */}
                        <div className="col-span-6 sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-4">
                          <div>
                            {isMatched && (
                              <Badge variant="olive" className="text-[10px] px-2 py-0.5">
                                <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Matched
                              </Badge>
                            )}
                            {isMissing && (
                              <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                                <AlertTriangle className="w-3 h-3 mr-1 inline" /> {diff.toFixed(2)} {selectedIng?.unit} Missing
                              </Badge>
                            )}
                            {isExcess && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-blue-400 text-blue-700">
                                +{diff.toFixed(2)} {selectedIng?.unit} Excess
                              </Badge>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            disabled={lines.length === 1}
                            className="text-[#A09289] hover:text-red-700 disabled:opacity-30 p-1"
                            title="Remove line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* If missing items, require reason */}
                      {isMissing && (
                        <div className="mt-2.5 pt-2 border-t border-red-200 grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-12 sm:col-span-3 text-[11px] font-semibold text-red-700 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Missing Item Reason:
                          </div>
                          <div className="col-span-12 sm:col-span-9">
                            <Input
                              placeholder="e.g. Leaked packet during delivery / Supplier short shipped 2 units"
                              value={line.discrepancyReason}
                              onChange={(e) => handleLineChange(idx, "discrepancyReason", e.target.value)}
                              className="h-8 text-xs bg-white border-red-300 placeholder:text-red-300"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Discrepancy warning banner */}
            {summary.missingCount > 0 && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    <strong>Missing Stock Detected:</strong> {summary.missingCount} item(s) short of billed quantity. Estimated supplier shortfall value: <strong>{formatCurrency(summary.totalShortfallVal)}</strong>.
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-2 py-1 rounded">
                  Admin Alerted
                </span>
              </div>
            )}

            {/* Total Summary & Submit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E8DED0]">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#705B51] block">
                    Billed Invoice Value:
                  </span>
                  <span className="font-serif text-lg font-bold text-[#705B51]">
                    {formatCurrency(summary.totalPurchasedVal)}
                  </span>
                </div>
                <div className="h-8 w-px bg-[#E8DED0]" />
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#737B52] block">
                    Physical Stock Added:
                  </span>
                  <span className="font-serif text-2xl font-bold text-[#43291F]">
                    {formatCurrency(summary.totalReceivedVal)}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || lines.length === 0}
                className="w-full sm:w-auto h-11 px-8 bg-[#43291F] hover:bg-[#341F17] text-white font-bold text-sm"
              >
                {loading ? "Recording Physical Inward..." : "Confirm & Update Inventory"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
