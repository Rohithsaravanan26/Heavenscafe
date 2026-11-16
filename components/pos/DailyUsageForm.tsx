"use client"

import * as React from "react"
import { Scale, CheckCircle2, AlertTriangle, Info, ArrowRight, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { recordRawMaterialUsageAction } from "@/lib/actions/inventory"
import { Ingredient } from "@/types/database"

interface DailyUsageFormProps {
  ingredients: Ingredient[]
  recentLogs?: any[]
  todaySalesCount?: number
}

export function DailyUsageForm({
  ingredients,
  recentLogs = [],
  todaySalesCount = 0,
}: DailyUsageFormProps) {
  const [ingredientId, setIngredientId] = React.useState<string>(ingredients[0]?.id || "")
  const [reportedUsage, setReportedUsage] = React.useState<number | "">("")
  const [notes, setNotes] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const [analysisResult, setAnalysisResult] = React.useState<any | null>(null)

  const selectedIng = React.useMemo(() => {
    return ingredients.find((i) => i.id === ingredientId)
  }, [ingredients, ingredientId])

  // Estimated baseline average usage (mock or 10% of current stock if not enough sales)
  const estimatedExpected = React.useMemo(() => {
    if (!selectedIng) return 0
    // If today had sales, rough baseline estimate
    const baseline = Math.max(0.5, todaySalesCount * 0.1)
    return Number(baseline.toFixed(2))
  }, [selectedIng, todaySalesCount])

  // Real-time variance preview as manager types
  const liveVariance = React.useMemo(() => {
    if (typeof reportedUsage !== "number" || reportedUsage <= 0) return null
    const diff = reportedUsage - estimatedExpected
    const pct = estimatedExpected > 0 ? (diff / estimatedExpected) * 100 : 0

    let status: "normal" | "high_variance" | "low_variance" = "normal"
    if (pct > 25) status = "high_variance"
    else if (pct < -30) status = "low_variance"

    return { diff, pct: Number(pct.toFixed(1)), status }
  }, [reportedUsage, estimatedExpected])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setAnalysisResult(null)

    if (!ingredientId) {
      setMessage({ type: "error", text: "Please select an ingredient" })
      return
    }

    if (typeof reportedUsage !== "number" || reportedUsage <= 0) {
      setMessage({ type: "error", text: "Please enter a positive usage quantity" })
      return
    }

    if (liveVariance?.status === "high_variance" && !notes.trim()) {
      setMessage({
        type: "error",
        text: "Abnormal high usage detected (+25% above average). Please provide an explanatory note before submitting.",
      })
      return
    }

    setLoading(true)
    try {
      const res = await recordRawMaterialUsageAction({
        ingredient_id: ingredientId,
        reported_usage: Number(reportedUsage),
        notes: notes.trim() || null,
      })

      if (res.success) {
        setAnalysisResult(res.result)
        setMessage({
          type: "success",
          text: `Usage logged successfully for ${selectedIng?.name}. Status: ${
            res.result?.status === "high_variance"
              ? "⚠️ High Variance (Alerted Admin)"
              : res.result?.status === "low_variance"
              ? "ℹ️ Below Average Usage"
              : "✅ Normal Usage Range"
          }`,
        })
        setReportedUsage("")
        setNotes("")
      } else {
        setMessage({ type: "error", text: res.error || "Failed to log material usage" })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage({ type: "error", text: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#43291F]">
          Daily Raw Material Usage & Average Analysis
        </h2>
        <p className="text-xs text-[#705B51]">
          Report daily/shift raw material consumption. The system automatically benchmarks against product sales to detect anomalies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Card */}
        <Card className="md:col-span-2 border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
          <CardHeader className="border-b border-[#E8DED0] pb-4">
            <CardTitle className="text-lg text-[#43291F] flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#B56C4A]" />
              Record Material Usage
            </CardTitle>
            <CardDescription>
              Input the raw material used today. The system analyzes consumption against items sold.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {message && (
              <Alert
                variant={message.type === "success" ? "olive" : "destructive"}
                className="mb-6"
              >
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Ingredient select */}
              <div className="space-y-1.5">
                <Label htmlFor="ingredient">Raw Material / Ingredient</Label>
                <Select
                  id="ingredient"
                  value={ingredientId}
                  onChange={(e) => setIngredientId(e.target.value)}
                  className="bg-white"
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Current Stock: {i.current_stock} {i.unit})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Quantity Used Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="usage">
                    Reported Quantity Used ({selectedIng?.unit || "unit"})
                  </Label>
                  <Input
                    id="usage"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 2.50"
                    value={reportedUsage}
                    onChange={(e) => setReportedUsage(e.target.value === "" ? "" : Number(e.target.value))}
                    className="font-medium text-base"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#705B51]">Estimated Sales Benchmark</Label>
                  <div className="h-10 px-3 flex items-center justify-between rounded-md bg-[#F8F3E9] border border-[#E8DED0] text-sm text-[#43291F]">
                    <span>Expected: ~{estimatedExpected} {selectedIng?.unit}</span>
                    <span className="text-[10px] text-[#705B51]">({todaySalesCount} sales today)</span>
                  </div>
                </div>
              </div>

              {/* Real-time Normalcy Analysis Box */}
              {liveVariance && (
                <div
                  className={`p-4 rounded-lg border transition-all ${
                    liveVariance.status === "high_variance"
                      ? "bg-red-50 border-red-200 text-red-900"
                      : liveVariance.status === "low_variance"
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : "bg-emerald-50 border-emerald-200 text-emerald-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                      {liveVariance.status === "high_variance" && (
                        <>
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          High Usage Anomaly Detected
                        </>
                      )}
                      {liveVariance.status === "low_variance" && (
                        <>
                          <Info className="w-4 h-4 text-amber-600" />
                          Under-Average Usage
                        </>
                      )}
                      {liveVariance.status === "normal" && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Normal Consumption Range
                        </>
                      )}
                    </span>
                    <Badge
                      variant={
                        liveVariance.status === "high_variance"
                          ? "destructive"
                          : liveVariance.status === "normal"
                          ? "olive"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {liveVariance.pct > 0 ? `+${liveVariance.pct}%` : `${liveVariance.pct}%`}
                    </Badge>
                  </div>

                  <p className="text-xs leading-relaxed opacity-90">
                    {liveVariance.status === "high_variance"
                      ? `Reported usage is +${liveVariance.pct}% higher than benchmark expected from today's orders. This may indicate over-portioning, recipe deviation, or spillage. Please state the reason below.`
                      : liveVariance.status === "low_variance"
                      ? `Reported usage is ${liveVariance.pct}% lower than benchmark expected. Verify portion size standards.`
                      : `Reported consumption matches expected proportions for today's orders.`}
                  </p>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">
                  Shift Notes / Explanation{" "}
                  {liveVariance?.status === "high_variance" && (
                    <span className="text-red-600 font-bold">* (Required for high variance)</span>
                  )}
                </Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Milk used for morning tea batch and coffee machine initial priming"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-20 text-xs"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading || typeof reportedUsage !== "number"}
                className="w-full h-11 bg-[#43291F] hover:bg-[#341F17] text-white font-bold text-sm"
              >
                {loading ? "Analyzing & Recording..." : "Submit Material Usage"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info & Recent Logs Sidebar */}
        <div className="space-y-6">
          <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#E8DED0]">
              <CardTitle className="text-sm font-bold text-[#43291F] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#737B52]" />
                How Average Analysis Works
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs text-[#705B51] space-y-2 leading-relaxed">
              <p>
                1. <strong>Formula:</strong> Expected usage is derived from actual products sold (e.g. 1 Tea = 120ml Milk, 10g Sugar).
              </p>
              <p>
                2. <strong>Thresholds:</strong> Usages within ±20% are flagged as <strong>Normal</strong>. Usages &gt;20% over average trigger an Admin review alert.
              </p>
              <p>
                3. <strong>Admin Monitoring:</strong> The Admin panel logs all variances to verify cafe cost controls.
              </p>
            </CardContent>
          </Card>

          {/* Recent Usage Logs */}
          <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#E8DED0]">
              <CardTitle className="text-sm font-bold text-[#43291F] flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#B56C4A]" />
                Recent Reported Usages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {recentLogs.length === 0 ? (
                <p className="text-xs text-[#A09289] italic">No usage logs recorded yet today.</p>
              ) : (
                recentLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded border border-[#E8DED0] bg-[#F8F3E9]/50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-[#43291F]">
                      <span>{log.ingredients?.name}</span>
                      <Badge
                        variant={
                          log.status === "high_variance"
                            ? "destructive"
                            : log.status === "normal"
                            ? "olive"
                            : "outline"
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {log.status === "high_variance"
                          ? `+${log.variance_percent}% High`
                          : log.status === "normal"
                          ? "Normal"
                          : "Low"}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-[#705B51] flex justify-between">
                      <span>Reported: {log.reported_usage} {log.ingredients?.unit}</span>
                      <span>Expected: {log.expected_usage}</span>
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
