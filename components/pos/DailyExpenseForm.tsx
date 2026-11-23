"use client"

import * as React from "react"
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Coffee,
  Package,
  Flame,
  Droplet,
  Wrench,
  Users,
  FileText,
  AlertCircle,
  Receipt,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { addExpenseAction, deleteExpenseAction } from "@/lib/actions/expenses"
import { formatCurrency, formatDateTime } from "@/lib/utils"

interface DailyExpenseFormProps {
  initialExpenses: any[]
}

const CATEGORIES = [
  { value: "produce_dairy", label: "🥛 Fresh Dairy & Produce (Milk, Lemons, Mint, Ice)", icon: Coffee },
  { value: "ingredients", label: "🍵 Raw Ingredients (Tea Powder, Sugar, Spices, Coffee)", icon: Coffee },
  { value: "packaging", label: "📦 Packaging (Cups, Bags, Straws, Paper Rolls)", icon: Package },
  { value: "gas", label: "🔥 Gas Cylinder Refill (Commercial LPG)", icon: Flame },
  { value: "water", label: "💧 Drinking Water Cans (20L Bubble Cans)", icon: Droplet },
  { value: "maintenance", label: "🛠️ Maintenance & Cleaning (Stove, Detergent, Mops)", icon: Wrench },
  { value: "salary", label: "👥 Daily Staff Advance / Helper Wage", icon: Users },
  { value: "other", label: "📋 Miscellaneous Store Expense", icon: FileText },
]

export function DailyExpenseForm({ initialExpenses }: DailyExpenseFormProps) {
  const [expenses, setExpenses] = React.useState<any[]>(initialExpenses)
  const [category, setCategory] = React.useState<string>("produce_dairy")
  const [amount, setAmount] = React.useState<number>(100)
  const [description, setDescription] = React.useState("")
  const [paymentSource, setPaymentSource] = React.useState<"cash_drawer" | "online_upi">("cash_drawer")
  const [reference, setReference] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  const todayCashExpensesTotal = React.useMemo(() => {
    return expenses
      .filter((e) => e.payment_source === "cash_drawer")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }, [expenses])

  const todayTotalExpenses = React.useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }, [expenses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !description.trim() || amount <= 0) return

    setSubmitting(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.append("category", category)
    formData.append("description", description.trim())
    formData.append("amount", String(amount))
    formData.append("payment_source", paymentSource)
    if (reference.trim()) formData.append("reference", reference.trim())

    try {
      const res = await addExpenseAction(formData)
      if (res.success && res.expense) {
        setExpenses((prev) => [
          {
            ...res.expense,
            profiles: { full_name: "Manager" },
          },
          ...prev,
        ])
        setStatusMsg({
          type: "success",
          text: `Recorded ₹${amount} expense for "${description.trim()}". ${
            paymentSource === "cash_drawer" ? "(Deducted from Cash Drawer)" : "(Owner/UPI Paid)"
          }`,
        })
        setDescription("")
        setReference("")
        setAmount(100)
      } else {
        setStatusMsg({ type: "error", text: res.error || "Failed to record expense" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this expense record?")) return
    try {
      const res = await deleteExpenseAction(id)
      if (res.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== id))
        setStatusMsg({ type: "success", text: "Expense removed successfully." })
      }
    } catch (err: unknown) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#43291F] flex items-center gap-2">
            <Wallet className="w-6 h-6 text-[#B56C4A]" />
            Daily Raw Material &amp; Store Expenses
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Manager cash counter: Record daily dairy, lemons, mint, ice, cups, gas &amp; petty expenses paid from counter
          </p>
        </div>

        {/* Cash Drawer Impact Stat */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-right">
            <span className="text-[10px] uppercase font-bold text-red-700 block">Cash Drawer Paid Out</span>
            <span className="font-serif font-bold text-base text-red-700 font-mono">
              -{formatCurrency(todayCashExpensesTotal)}
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-lg bg-[#F8F3E9] border border-[#E8DED0] text-right">
            <span className="text-[10px] uppercase font-bold text-[#705B51] block">Total Expenses Today</span>
            <span className="font-serif font-bold text-base text-[#43291F] font-mono">
              {formatCurrency(todayTotalExpenses)}
            </span>
          </div>
        </div>
      </div>

      {statusMsg && (
        <Alert variant={statusMsg.type === "success" ? "olive" : "destructive"}>
          <AlertDescription>{statusMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Main Grid: Form on Left, Today's Log on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Add Daily Expense */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
            <CardHeader className="p-4 border-b border-[#E8DED0] bg-[#F8F3E9]">
              <CardTitle className="font-serif text-base text-[#43291F] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#737B52]" />
                Record Store Payout
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-bold text-[#43291F]">
                    Expense Category *
                  </Label>
                  <Select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="h-10 text-xs font-medium"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Amount in INR */}
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-xs font-bold text-[#43291F]">
                    Amount Paid Out (₹) *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="0.5"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="font-mono text-lg font-bold h-10"
                  />
                  <div className="flex gap-1.5 pt-1">
                    {[+20, +50, +100, +200, +500].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount((prev) => Math.max(1, prev + preset))}
                        className="px-2.5 py-1 rounded bg-[#EFE7DA] text-xs font-bold text-[#43291F] hover:bg-[#E8DED0] cursor-pointer"
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description & Vendor */}
                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-xs font-bold text-[#43291F]">
                    Description &amp; Local Vendor *
                  </Label>
                  <Input
                    id="desc"
                    placeholder="e.g. 5L Fresh Milk from Local Dairy, 2kg Lemons"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="text-xs h-10"
                  />
                </div>

                {/* Payment Source Toggle */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#43291F]">
                    Payment Source *
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentSource("cash_drawer")}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all text-left cursor-pointer ${
                        paymentSource === "cash_drawer"
                          ? "bg-red-50 border-red-300 text-red-900 shadow-xs"
                          : "bg-[#FFFDF8] border-[#E8DED0] text-[#705B51] hover:bg-[#F8F3E9]"
                      }`}
                    >
                      <span className="block font-bold">💵 Cash Drawer</span>
                      <span className="text-[10px] font-normal text-red-700 block mt-0.5">
                        Deducted from register closing
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentSource("online_upi")}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all text-left cursor-pointer ${
                        paymentSource === "online_upi"
                          ? "bg-blue-50 border-blue-300 text-blue-900 shadow-xs"
                          : "bg-[#FFFDF8] border-[#E8DED0] text-[#705B51] hover:bg-[#F8F3E9]"
                      }`}
                    >
                      <span className="block font-bold">📱 Owner / UPI</span>
                      <span className="text-[10px] font-normal text-blue-700 block mt-0.5">
                        Direct GPay / Bank transfer
                      </span>
                    </button>
                  </div>
                </div>

                {/* Reference / Receipt Bill No */}
                <div className="space-y-1.5">
                  <Label htmlFor="ref" className="text-xs text-[#705B51]">
                    Receipt No. / Bill Reference (Optional)
                  </Label>
                  <Input
                    id="ref"
                    placeholder="e.g. Milk receipt #148"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting || amount <= 0 || !description.trim()}
                  className="w-full h-11 bg-[#43291F] hover:bg-[#341F17] text-white font-bold text-sm shadow-sm"
                >
                  {submitting ? "Recording Expense..." : `Record ₹${amount} Expense`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Today's Expense Log */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
            <CardHeader className="p-4 border-b border-[#E8DED0] bg-[#F8F3E9] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-serif text-base text-[#43291F] flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#B56C4A]" />
                  Today&apos;s Store Expenses Log
                </CardTitle>
                <p className="text-[11px] text-[#705B51] mt-0.5">
                  Real-time sync to Remote Admin &amp; auto-calculated in register closing
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {expenses.length} entries today
              </Badge>
            </CardHeader>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F3E9]/50 border-b border-[#E8DED0] font-serif font-bold text-[#43291F] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Source</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DED0]">
                  {expenses.map((e) => {
                    const isCash = e.payment_source === "cash_drawer"

                    return (
                      <tr key={e.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                        <td className="py-2.5 px-3 text-[#705B51] whitespace-nowrap">
                          {formatDateTime(e.created_at)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#43291F]">
                          <div>{e.description}</div>
                          {e.reference && (
                            <div className="text-[10px] text-[#A09289] font-mono">Ref: {e.reference}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {e.category?.replace("_", " ") || "Other"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCash
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {isCash ? "Cash Drawer" : "UPI/Owner"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-red-700">
                          -{formatCurrency(e.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id)}
                            title="Delete Record"
                            className="text-[#A09289] hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {expenses.length === 0 && (
                <div className="py-12 text-center text-[#A09289]">
                  <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#737B52]" />
                  <p className="font-serif font-bold text-sm text-[#43291F]">No Expenses Recorded Today</p>
                  <p className="text-xs text-[#705B51] mt-0.5">
                    Use the form on the left to record daily milk, lemons, or gas expenses.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
