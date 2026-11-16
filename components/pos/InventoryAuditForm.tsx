"use client"

import * as React from "react"
import { ClipboardCheck, AlertTriangle, CheckCircle2, Search, ArrowRight, ShieldAlert, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { submitInventoryAuditAction } from "@/lib/actions/inventory"
import { Ingredient } from "@/types/database"
import { formatCurrency } from "@/lib/utils"

interface InventoryAuditFormProps {
  ingredients: Ingredient[]
}

interface AuditLine {
  ingredientId: string
  name: string
  unit: string
  systemStock: number
  physicalCount: number
  costPerUnit: number
  notes: string
}

export function InventoryAuditForm({ ingredients }: InventoryAuditFormProps) {
  const [search, setSearch] = React.useState("")
  const [auditNotes, setAuditNotes] = React.useState("")
  const [reconcileStock, setReconcileStock] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  // Initialize lines with system stock
  const [lines, setLines] = React.useState<AuditLine[]>(() =>
    ingredients.map((ing) => ({
      ingredientId: ing.id,
      name: ing.name,
      unit: ing.unit,
      systemStock: Number(ing.current_stock) || 0,
      physicalCount: Number(ing.current_stock) || 0, // defaults to system stock for convenience
      costPerUnit: Number(ing.cost_per_unit) || 0,
      notes: "",
    }))
  )

  const handlePhysicalCountChange = (id: string, count: number) => {
    setLines((prev) =>
      prev.map((l) => (l.ingredientId === id ? { ...l, physicalCount: count } : l))
    )
  }

  const handleNotesChange = (id: string, notes: string) => {
    setLines((prev) =>
      prev.map((l) => (l.ingredientId === id ? { ...l, notes } : l))
    )
  }

  // Set all physical counts equal to system stock (quick reset)
  const handleResetToSystem = () => {
    setLines((prev) =>
      prev.map((l) => ({ ...l, physicalCount: l.systemStock, notes: "" }))
    )
  }

  // Audit Calculations
  const stats = React.useMemo(() => {
    let missingCount = 0
    let surplusCount = 0
    let matchedCount = 0
    let totalEstimatedLoss = 0

    lines.forEach((l) => {
      const diff = l.physicalCount - l.systemStock
      if (diff < -0.001) {
        missingCount += 1
        totalEstimatedLoss += Math.abs(diff) * l.costPerUnit
      } else if (diff > 0.001) {
        surplusCount += 1
      } else {
        matchedCount += 1
      }
    })

    return {
      total: lines.length,
      missingCount,
      surplusCount,
      matchedCount,
      totalEstimatedLoss,
    }
  }, [lines])

  const filteredLines = React.useMemo(() => {
    if (!search.trim()) return lines
    const q = search.toLowerCase()
    return lines.filter((l) => l.name.toLowerCase().includes(q))
  }, [lines, search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    setLoading(true)
    try {
      const payload = {
        notes: auditNotes.trim() || null,
        reconcile_stock: reconcileStock,
        items: lines.map((l) => ({
          ingredient_id: l.ingredientId,
          physical_count: Number(l.physicalCount),
          notes: l.notes.trim() || null,
        })),
      }

      const res = await submitInventoryAuditAction(payload)

      if (res.success) {
        setMessage({
          type: "success",
          text: `Physical inventory audit submitted successfully! Audited ${stats.total} items. ${
            stats.missingCount > 0
              ? `🚨 ${stats.missingCount} missing item(s) flagged for Admin cross-verification with estimated loss of ${formatCurrency(
                  stats.totalEstimatedLoss
                )}.`
              : "✅ All inventory counts perfectly matched system records!"
          }`,
        })
        setAuditNotes("")
      } else {
        setMessage({ type: "error", text: res.error || "Failed to submit inventory audit" })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage({ type: "error", text: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#43291F]">
            Physical Stock Audit & Discrepancy Verification
          </h2>
          <p className="text-xs text-[#705B51]">
            Count and report all store raw materials. System automatically cross-checks against expected inventory to identify missing stock or shrinkage.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetToSystem}
          className="text-xs border-[#E8DED0] hover:bg-[#F8F3E9] text-[#705B51]"
        >
          Reset All to System Stock
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#FFFDF8] border border-[#E8DED0] shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#705B51] block mb-1">
            Total Ingredients
          </span>
          <span className="font-serif text-2xl font-bold text-[#43291F]">
            {stats.total}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Matched
          </span>
          <span className="font-serif text-2xl font-bold text-emerald-700">
            {stats.matchedCount}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-600" /> Missing Items
          </span>
          <span className="font-serif text-2xl font-bold text-red-700">
            {stats.missingCount}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#FFFDF8] border border-[#E8DED0] shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B56C4A] block mb-1">
            Est. Shrinkage Loss
          </span>
          <span className="font-serif text-2xl font-bold text-red-600">
            {formatCurrency(stats.totalEstimatedLoss)}
          </span>
        </div>
      </div>

      {message && (
        <Alert variant={message.type === "success" ? "olive" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Search & Audit Table */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
        <CardHeader className="border-b border-[#E8DED0] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base text-[#43291F] flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#737B52]" />
              Store Inventory Count Sheet
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#705B51]" />
              <Input
                placeholder="Search raw material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <form onSubmit={handleSubmit}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F3E9] text-[#705B51] uppercase text-[10px] tracking-wider border-b border-[#E8DED0]">
                  <tr>
                    <th className="py-3 px-4">Raw Material</th>
                    <th className="py-3 px-3">System Stock</th>
                    <th className="py-3 px-3">Physical Count (Store)</th>
                    <th className="py-3 px-3">Difference</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4">Audit Note / Missing Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DED0]">
                  {filteredLines.map((line) => {
                    const diff = line.physicalCount - line.systemStock
                    const isMissing = diff < -0.001
                    const isExcess = diff > 0.001
                    const isMatched = !isMissing && !isExcess

                    return (
                      <tr
                        key={line.ingredientId}
                        className={`transition-colors ${
                          isMissing
                            ? "bg-red-50/50 hover:bg-red-50/80"
                            : isExcess
                            ? "bg-blue-50/40 hover:bg-blue-50/70"
                            : "hover:bg-[#F8F3E9]/50"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#43291F] block">{line.name}</span>
                          <span className="text-[10px] text-[#705B51]">
                            Unit: {line.unit} &bull; Cost: {formatCurrency(line.costPerUnit)}/{line.unit}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-medium text-[#705B51]">
                          {line.systemStock.toFixed(2)} {line.unit}
                        </td>

                        <td className="py-3 px-3 w-40">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.physicalCount}
                              onChange={(e) =>
                                handlePhysicalCountChange(line.ingredientId, Number(e.target.value))
                              }
                              className={`h-8 text-xs font-bold ${
                                isMissing
                                  ? "border-red-400 text-red-700 bg-red-50"
                                  : isExcess
                                  ? "border-blue-400 text-blue-700 bg-blue-50"
                                  : "border-[#E8DED0]"
                              }`}
                            />
                            <span className="text-[11px] text-[#705B51]">{line.unit}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`font-bold ${
                              isMissing ? "text-red-600" : isExcess ? "text-blue-600" : "text-emerald-700"
                            }`}
                          >
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {line.unit}
                          </span>
                          {isMissing && line.costPerUnit > 0 && (
                            <span className="text-[10px] text-red-500 block">
                              Loss: {formatCurrency(Math.abs(diff) * line.costPerUnit)}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {isMatched && (
                            <Badge variant="olive" className="text-[10px] px-2 py-0.5">
                              Matched
                            </Badge>
                          )}
                          {isMissing && (
                            <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                              Missing Stock
                            </Badge>
                          )}
                          {isExcess && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-blue-400 text-blue-700">
                              Surplus
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <Input
                            placeholder={isMissing ? "Explain missing stock..." : "Optional remark"}
                            value={line.notes}
                            onChange={(e) => handleNotesChange(line.ingredientId, e.target.value)}
                            className="h-8 text-xs bg-white"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer & Submit */}
            <div className="p-6 bg-[#F8F3E9]/50 border-t border-[#E8DED0] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <Label htmlFor="auditNotes">Overall Audit Remarks for Admin</Label>
                  <Textarea
                    id="auditNotes"
                    placeholder="e.g. End of day physical audit performed after shift closing. Fridge and dry storage verified."
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    className="h-16 text-xs bg-white"
                  />
                </div>

                <div className="p-3.5 rounded-lg border border-[#E8DED0] bg-[#FFFDF8] space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reconcileStock}
                      onChange={(e) => setReconcileStock(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[#E8DED0] text-[#43291F] focus:ring-[#43291F]"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#43291F] block">
                        Reconcile System Stock with Physical Count
                      </span>
                      <span className="text-[11px] text-[#705B51] block leading-tight">
                        Check this to immediately synchronize database stock numbers with physical counts.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#E8DED0]">
                <div className="text-xs text-[#705B51]">
                  Submitting will create an immutable audit record visible in the Admin inventory portal.
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto h-11 px-8 bg-[#43291F] hover:bg-[#341F17] text-white font-bold text-sm shadow"
                >
                  {loading ? "Submitting Audit..." : "Submit Inventory Audit Report"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
