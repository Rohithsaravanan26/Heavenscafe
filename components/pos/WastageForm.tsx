"use client"

import * as React from "react"
import { Trash2, AlertTriangle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { recordWastageAction } from "@/lib/actions/inventory"
import { Ingredient } from "@/types/database"

interface WastageFormProps {
  ingredients: Ingredient[]
}

export function WastageForm({ ingredients }: WastageFormProps) {
  const [ingredientId, setIngredientId] = React.useState<string>(ingredients[0]?.id || "")
  const [quantity, setQuantity] = React.useState<string>("")
  const [reason, setReason] = React.useState<string>("")
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selectedIng = ingredients.find((i) => i.id === ingredientId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const qtyNum = Number(quantity)
    if (!ingredientId || isNaN(qtyNum) || qtyNum <= 0) {
      setMessage({ type: 'error', text: 'Please select an ingredient and enter a positive quantity' })
      return
    }

    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'A mandatory reason is required to log wastage' })
      return
    }

    if (selectedIng && qtyNum > Number(selectedIng.current_stock)) {
      setMessage({
        type: 'error',
        text: `Cannot log ${qtyNum} ${selectedIng.unit} wastage. Only ${selectedIng.current_stock} ${selectedIng.unit} is available in stock.`,
      })
      return
    }

    setLoading(true)
    try {
      const res = await recordWastageAction({
        ingredient_id: ingredientId,
        quantity: qtyNum,
        reason: reason.trim(),
      })

      if (res.success) {
        setMessage({
          type: 'success',
          text: `Wastage of ${qtyNum} ${selectedIng?.unit} successfully logged. Remaining stock: ${res.result?.stock_after} ${selectedIng?.unit}.`,
        })
        setQuantity("")
        setReason("")
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to record wastage' })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#43291F]">
          Record Kitchen Wastage
        </h2>
        <p className="text-xs text-[#705B51]">
          Log spoiled, spilled, or expired cafe materials with audit verification
        </p>
      </div>

      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
        <CardHeader className="border-b border-[#E8DED0] pb-4">
          <CardTitle className="text-lg text-[#43291F] flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            Wastage Entry Form
          </CardTitle>
          <CardDescription>
            Every entry deducts stock and records a permanent, traceable audit movement.
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ingredient">Select Ingredient</Label>
              <Select
                id="ingredient"
                value={ingredientId}
                onChange={(e) => setIngredientId(e.target.value)}
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (Current Stock: {ing.current_stock} {ing.unit})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qty">
                Wasted Quantity ({selectedIng?.unit || "unit"})
              </Label>
              <Input
                id="qty"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              {selectedIng && (
                <p className="text-[11px] text-[#705B51]">
                  Available in inventory: <span className="font-bold text-[#43291F]">{selectedIng.current_stock} {selectedIng.unit}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Mandatory Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g. Milk packet spoiled due to power cut, burnt bread during rush hour"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-red-700 hover:bg-red-800 text-white font-bold text-sm shadow-sm"
            >
              {loading ? "Recording Wastage..." : "Submit Wastage Record"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
