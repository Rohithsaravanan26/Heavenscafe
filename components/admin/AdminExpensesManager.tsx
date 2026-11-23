"use client"

import * as React from "react"
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Tag,
  ArrowRight,
  Filter,
  CheckCircle2,
  Coffee,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { addExpenseAction, deleteExpenseAction } from "@/lib/actions/expenses"
import { formatCurrency, formatDate } from "@/lib/utils"

interface AdminExpensesManagerProps {
  initialExpenses: any[]
}

const CATEGORY_LABELS: Record<string, string> = {
  produce_dairy: "🥛 Fresh Dairy & Produce",
  ingredients: "🍵 Raw Ingredients",
  packaging: "📦 Packaging Materials",
  gas: "🔥 Cooking Gas (LPG)",
  water: "💧 Drinking Water Cans",
  rent: "🏠 Shop Rent & Lease",
  electricity: "⚡ Electricity Bill",
  salary: "👥 Staff Salaries / Daily Wages",
  maintenance: "🛠️ Maintenance & Repairs",
  other: "📋 Other Store Expenses",
}

export function AdminExpensesManager({ initialExpenses }: AdminExpensesManagerProps) {
  const [expenses, setExpenses] = React.useState<any[]>(initialExpenses)
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [selectedSource, setSelectedSource] = React.useState<string>("all")
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [loading, setLoading] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  const totalExpenseAmount = React.useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }, [expenses])

  const totalCashDrawerExpenses = React.useMemo(() => {
    return expenses
      .filter((e) => e.payment_source === "cash_drawer")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }, [expenses])

  const totalOwnerPaidExpenses = React.useMemo(() => {
    return expenses
      .filter((e) => e.payment_source !== "cash_drawer")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }, [expenses])

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((e) => {
      const matchSource = selectedSource === "all" || (e.payment_source || "cash_drawer") === selectedSource
      const matchCat = selectedCategory === "all" || e.category === selectedCategory
      return matchSource && matchCat
    })
  }, [expenses, selectedSource, selectedCategory])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this expense record?")) return
    try {
      const res = await deleteExpenseAction(id)
      if (res.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== id))
        setStatusMsg({ type: "success", text: "Expense deleted successfully" })
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
          <h1 className="font-serif text-3xl font-bold text-[#43291F]">
            Operational Expenses Audit
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Remote verification: Review manager daily store expenses, counter petty cash payouts &amp; monthly overheads
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="text-xs bg-[#43291F] hover:bg-[#341F17] text-white"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Record Owner Overhead
        </Button>
      </div>

      {statusMsg && (
        <Alert variant={statusMsg.type === "success" ? "olive" : "destructive"}>
          <AlertDescription>{statusMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Expense KPI summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#705B51] block">Total Logged Expenses</span>
          <span className="font-serif text-2xl font-bold text-[#43291F] block mt-1 font-mono">
            {formatCurrency(totalExpenseAmount)}
          </span>
          <p className="text-[11px] text-[#705B51] mt-0.5">{expenses.length} expense transactions</p>
        </Card>

        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-red-700 block">Manager Petty Cash (Drawer)</span>
          <span className="font-serif text-2xl font-bold text-red-700 block mt-1 font-mono">
            {formatCurrency(totalCashDrawerExpenses)}
          </span>
          <p className="text-[11px] text-red-600 mt-0.5">Deducted from cashier drawer</p>
        </Card>

        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-blue-700 block">Owner Direct / UPI Paid</span>
          <span className="font-serif text-2xl font-bold text-blue-700 block mt-1 font-mono">
            {formatCurrency(totalOwnerPaidExpenses)}
          </span>
          <p className="text-[11px] text-blue-600 mt-0.5">Bank / online transfers</p>
        </Card>

        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#737B52] block">Audit Integrity</span>
          <span className="font-serif text-base font-bold text-emerald-800 block mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Live Register Sync
          </span>
          <p className="text-[11px] text-[#705B51] mt-0.5">Auto-deducted in closing</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-[#737B52]" />
            <span className="text-xs font-bold text-[#43291F]">Filter Expenses:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="h-9 text-xs min-w-[150px]"
            >
              <option value="all">All Sources (Cash &amp; UPI)</option>
              <option value="cash_drawer">Cash Drawer Only (Petty Cash)</option>
              <option value="online_upi">Owner / UPI Paid Only</option>
            </Select>

            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 text-xs min-w-[170px]"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Expenses List Table */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description / Vendor</th>
                <th className="py-3 px-4 text-center">Payment Source</th>
                <th className="py-3 px-4">Logged By</th>
                <th className="py-3 px-4">Receipt / Ref</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED0]">
              {filteredExpenses.map((exp) => {
                const isCash = (exp.payment_source || "cash_drawer") === "cash_drawer"

                return (
                  <tr key={exp.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[#705B51] whitespace-nowrap">
                      {formatDate(exp.expense_date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-[10px] capitalize whitespace-nowrap">
                        {CATEGORY_LABELS[exp.category] || exp.category}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#43291F]">
                      {exp.description}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCash
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {isCash ? "Cash Drawer" : "Owner / UPI"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#705B51]">
                      {exp.profiles?.full_name || "Store Manager"}
                    </td>
                    <td className="py-3.5 px-4 text-[#705B51] font-mono">
                      {exp.reference || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-serif font-bold text-sm text-red-700 font-mono">
                      -{formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(exp.id)}
                        title="Delete Record"
                        className="text-[#A09289] hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredExpenses.length === 0 && (
          <div className="py-14 text-center text-[#A09289]">
            <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#737B52]" />
            <p className="font-serif font-bold text-base text-[#43291F]">No Expenses Found</p>
            <p className="text-xs text-[#705B51] mt-1">
              Store manager expenses logged at the counter and owner overheads appear here.
            </p>
          </div>
        )}
      </Card>

      {/* ── ADD EXPENSE MODAL (Remote Owner Entry for Overheads) ── */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Owner / Overhead Expense</DialogTitle>
          </DialogHeader>

          <form
            action={async (formData) => {
              setLoading(true)
              const res = await addExpenseAction(formData)
              setLoading(false)
              if (res.success && res.expense) {
                setExpenses((prev) => [res.expense, ...prev])
                setShowAddModal(false)
                setStatusMsg({ type: "success", text: "Expense recorded successfully." })
              } else {
                setStatusMsg({ type: "error", text: res.error || "Failed to record expense" })
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="category">Expense Category *</Label>
              <Select id="category" name="category" required>
                <option value="rent">🏠 Shop Rent &amp; Maintenance</option>
                <option value="electricity">⚡ Electricity Power Bill</option>
                <option value="gas">🔥 LPG Commercial Gas Cylinders</option>
                <option value="salary">👥 Staff Monthly Salaries / Wages</option>
                <option value="packaging">📦 Bulk Packaging Materials</option>
                <option value="water">💧 Drinking Water Supply</option>
                <option value="maintenance">🛠️ Equipment Repairs &amp; Upkeep</option>
                <option value="ingredients">🍵 Bulk Ingredients Purchase</option>
                <option value="other">📋 Other Store Overhead</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description / Narrative *</Label>
              <Input
                id="description"
                name="description"
                placeholder="e.g. Monthly Shop Rent Paid to Landlord"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount in INR (₹) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="2500.00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expense_date">Date of Expense</Label>
                <Input
                  id="expense_date"
                  name="expense_date"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment_source">Payment Source</Label>
              <Select id="payment_source" name="payment_source" defaultValue="owner_paid">
                <option value="owner_paid">Owner Bank / Direct Transfer</option>
                <option value="online_upi">Owner UPI / GPay</option>
                <option value="cash_drawer">Cash Drawer (Petty Cash)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reference">Voucher / Receipt / UPI Ref</Label>
              <Input id="reference" name="reference" placeholder="e.g. UPI-9281726" />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#43291F] hover:bg-[#341F17] text-white font-bold"
            >
              {loading ? "Recording..." : "Save Expense Record"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
