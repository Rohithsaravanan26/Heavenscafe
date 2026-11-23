"use client"

import * as React from "react"
import { CalendarCheck, Banknote, QrCode, CreditCard, AlertCircle, CheckCircle, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { submitDailyClosingAction } from "@/lib/actions/closing"
import { formatCurrency } from "@/lib/utils"

interface DailyClosingFormProps {
  summary: {
    closing_date: string
    cash_sales: number
    upi_sales: number
    card_sales: number
    other_sales: number
    total_sales: number
    cash_expenses?: number
    expected_cash: number
    existing_closing: any | null
  }
}

export function DailyClosingForm({ summary }: DailyClosingFormProps) {
  const [actualCash, setActualCash] = React.useState<string>(
    summary.existing_closing ? String(summary.existing_closing.actual_cash) : ""
  )
  const [remarks, setRemarks] = React.useState<string>(
    summary.existing_closing?.remarks || ""
  )
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const actualCashNum = Number(actualCash) || 0
  const difference = Number((actualCashNum - summary.expected_cash).toFixed(2))
  const hasDiscrepancy = actualCash !== "" && Math.abs(difference) > 0.01

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (actualCash === "" || isNaN(actualCashNum) || actualCashNum < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid physical cash count (0 or greater)' })
      return
    }

    setLoading(true)
    try {
      const res = await submitDailyClosingAction(actualCashNum, remarks)
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Daily closing for ${summary.closing_date} submitted successfully. Difference: ${
            difference >= 0 ? `+${formatCurrency(difference)}` : formatCurrency(difference)
          }.`,
        })
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to submit closing' })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-fluid-h2 font-bold text-[#43291F]">
            Daily Closing & Cash Reconciliation
          </h2>
          <p className="text-xs text-[#705B51] mt-0.5">
            Date: <span className="font-bold text-[#43291F]">{summary.closing_date}</span>
          </p>
        </div>
        {summary.existing_closing && (
          <Badge variant="olive" className="text-xs py-1">
            Status: {summary.existing_closing.status}
          </Badge>
        )}
      </div>

      {message && (
        <Alert
          variant={message.type === 'success' ? 'olive' : 'destructive'}
        >
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Today's Sales Breakdown Card */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
        <CardHeader className="border-b border-[#E8DED0] pb-3 p-3.5 sm:p-5">
          <CardTitle className="text-sm sm:text-base text-[#43291F] flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[#B56C4A]" />
            Sales Registered Today
          </CardTitle>
          <CardDescription className="text-xs">
            Calculated automatically from completed transactions in the database.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center">
          <div className="p-3 rounded-lg bg-[#F8F3E9] border border-[#E8DED0]">
            <Banknote className="w-5 h-5 text-emerald-700 mx-auto mb-1" />
            <span className="text-[10px] uppercase font-bold text-[#705B51] block">Cash</span>
            <span className="font-serif text-base font-bold text-[#43291F] block">
              {formatCurrency(summary.cash_sales)}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#F8F3E9] border border-[#E8DED0]">
            <QrCode className="w-5 h-5 text-blue-700 mx-auto mb-1" />
            <span className="text-[10px] uppercase font-bold text-[#705B51] block">UPI</span>
            <span className="font-serif text-base font-bold text-[#43291F] block">
              {formatCurrency(summary.upi_sales)}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#F8F3E9] border border-[#E8DED0]">
            <CreditCard className="w-5 h-5 text-purple-700 mx-auto mb-1" />
            <span className="text-[10px] uppercase font-bold text-[#705B51] block">Card</span>
            <span className="font-serif text-base font-bold text-[#43291F] block">
              {formatCurrency(summary.card_sales)}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#FAF0EB] border border-[#F3DDD2]">
            <span className="text-[10px] uppercase font-bold text-[#B56C4A] block mt-1">Total Sales</span>
            <span className="font-serif text-lg font-bold text-[#43291F] block mt-1">
              {formatCurrency(summary.total_sales)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cash Reconciliation Form */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
        <CardHeader className="border-b border-[#E8DED0] pb-3">
          <CardTitle className="text-base text-[#43291F]">
            Cash Drawer Count
          </CardTitle>
          <CardDescription>
            Count physical currency in the cash drawer and enter below.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#705B51]">Expected Cash in Drawer</Label>
                <div className="mt-1 p-2.5 rounded-lg bg-[#F8F3E9] border border-[#E8DED0] font-serif text-xl font-bold text-[#43291F]">
                  {formatCurrency(summary.expected_cash)}
                </div>
                <p className="text-[10px] text-[#A09289] mt-1">
                  Cash Sales ({formatCurrency(summary.cash_sales)}) - Cash Expenses ({formatCurrency(summary.cash_expenses || 0)})
                </p>
              </div>

              <div>
                <Label htmlFor="actualCash" className="text-xs font-bold text-[#43291F]">
                  Actual Cash Counted (₹) *
                </Label>
                <Input
                  id="actualCash"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 1540.00"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="mt-1 h-12 text-lg font-bold bg-[#FFFDF8]"
                  required
                />
              </div>
            </div>

            {/* Reconciliation Difference Banner */}
            {actualCash !== "" && (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  Math.abs(difference) <= 0.01
                    ? "bg-[#F0F1EA] border-[#DEE0D1] text-[#3A4029]"
                    : difference > 0
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  {Math.abs(difference) <= 0.01 ? (
                    <CheckCircle className="w-5 h-5 text-emerald-700" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-700" />
                  )}
                  <div>
                    <span className="text-xs font-bold block">
                      {Math.abs(difference) <= 0.01
                        ? "Exact Match: Cash balanced perfectly"
                        : difference > 0
                        ? "Cash Surplus Detected"
                        : "Cash Shortage Detected"}
                    </span>
                    <span className="text-[11px] opacity-80 block">
                      Difference: {difference >= 0 ? `+₹${difference.toFixed(2)}` : `-₹${Math.abs(difference).toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <span className="font-serif font-bold text-lg">
                  {difference >= 0 ? `+₹${difference.toFixed(2)}` : `-₹${Math.abs(difference).toFixed(2)}`}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="remarks">Closing Remarks (Required if difference exists)</Label>
              <Textarea
                id="remarks"
                placeholder="e.g. Returned ₹5 extra for change shortage, opening float included"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#43291F] hover:bg-[#341F17] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#FAF0EB]" />
                  <span>Submitting Closing Record...</span>
                </>
              ) : (
                <>
                  <span>Confirm &amp; Submit Daily Closing</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
