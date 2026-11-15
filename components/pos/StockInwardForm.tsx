"use client"

import * as React from "react"
import { PackagePlus, CheckCircle, Plus, Trash2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { receiveStockAction } from "@/lib/actions/inventory"
import { Ingredient, Supplier } from "@/types/database"
import { formatCurrency } from "@/lib/utils"

interface StockInwardFormProps {
  ingredients: Ingredient[]
  suppliers: Supplier[]
}

interface InwardLine {
  ingredientId: string
  quantity: number
  unitCost: number
}

export function StockInwardForm({ ingredients, suppliers }: StockInwardFormProps) {
  const [supplierId, setSupplierId] = React.useState<string>("")
  const [referenceNo, setReferenceNo] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [lines, setLines] = React.useState<InwardLine[]>([
    { ingredientId: ingredients[0]?.id || "", quantity: 1, unitCost: 0 },
  ])
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { ingredientId: ingredients[0]?.id || "", quantity: 1, unitCost: 0 },
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

  const totalCost = React.useMemo(() => {
    return lines.reduce((sum, line) => sum + (line.quantity * line.unitCost), 0)
  }, [lines])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (lines.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one ingredient to inward' })
      return
    }

    for (const l of lines) {
      if (!l.ingredientId || l.quantity <= 0 || l.unitCost < 0) {
        setMessage({ type: 'error', text: 'All line items must have valid ingredient, positive quantity, and cost' })
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
          quantity: Number(l.quantity),
          unit_cost: Number(l.unitCost),
        })),
      })

      if (res.success) {
        setMessage({
          type: 'success',
          text: `Stock received successfully! Purchase Order logged with total ${formatCurrency(totalCost)}. Inventory updated.`,
        })
        setLines([{ ingredientId: ingredients[0]?.id || "", quantity: 1, unitCost: 0 }])
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
          Stock Inward & Receiving
        </h2>
        <p className="text-xs text-[#705B51]">
          Log raw ingredients and sellable products delivered to Heaven&apos;s Cafe
        </p>
      </div>

      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
        <CardHeader className="border-b border-[#E8DED0] pb-4">
          <CardTitle className="text-lg text-[#43291F] flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-[#737B52]" />
            Receive Stock Items
          </CardTitle>
          <CardDescription>
            Enter supplier details and each line item received. Stock levels will update atomically.
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
                <Label htmlFor="ref">Invoice / Challan No</Label>
                <Input
                  id="ref"
                  placeholder="e.g. INV-2026-908"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Delivery Remarks</Label>
                <Input
                  id="notes"
                  placeholder="e.g. Morning delivery, good condition"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Line items list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-sm text-[#43291F]">
                  Received Items ({lines.length})
                </h4>
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

              <div className="space-y-2">
                {lines.map((line, idx) => {
                  const selectedIng = ingredients.find((i) => i.id === line.ingredientId)
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg bg-[#F8F3E9]/80 border border-[#E8DED0]"
                    >
                      {/* Ingredient selector */}
                      <div className="col-span-12 sm:col-span-5">
                        <Label className="text-[10px] block mb-1">Raw Ingredient / Product</Label>
                        <Select
                          value={line.ingredientId}
                          onChange={(e) => handleLineChange(idx, "ingredientId", e.target.value)}
                          className="h-9 text-xs"
                        >
                          {ingredients.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} (In stock: {i.current_stock} {i.unit})
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-5 sm:col-span-3">
                        <Label className="text-[10px] block mb-1">
                          Qty ({selectedIng?.unit || "unit"})
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, "quantity", Number(e.target.value))}
                          className="h-9 text-xs"
                        />
                      </div>

                      {/* Unit Cost */}
                      <div className="col-span-5 sm:col-span-3">
                        <Label className="text-[10px] block mb-1">Unit Cost (₹)</Label>
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

                      {/* Remove Button */}
                      <div className="col-span-2 sm:col-span-1 flex items-end justify-center pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length === 1}
                          className="text-[#A09289] hover:text-red-700 disabled:opacity-30 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Total Summary & Submit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E8DED0]">
              <div>
                <span className="text-xs text-[#705B51] block">Total Inward Value:</span>
                <span className="font-serif text-2xl font-bold text-[#43291F]">
                  {formatCurrency(totalCost)}
                </span>
              </div>

              <Button
                type="submit"
                disabled={loading || lines.length === 0}
                className="w-full sm:w-auto h-11 px-8 bg-[#43291F] hover:bg-[#341F17] text-white font-bold text-sm"
              >
                {loading ? "Recording Inward Stock..." : "Confirm & Update Stock"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
