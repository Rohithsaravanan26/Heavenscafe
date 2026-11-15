"use client"

import * as React from "react"
import { Wallet, Plus, Trash2, Calendar, DollarSign, Tag, ArrowRight } from "lucide-react"
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

export function AdminExpensesManager({ initialExpenses }: AdminExpensesManagerProps) {
  const [expenses, setExpenses] = React.useState<any[]>(initialExpenses)
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  const totalExpenseAmount = React.useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }, [expenses])

  // Category totals
  const categoryTotals = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of expenses) {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0)
    }
    return map
  }, [expenses])

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
            Operational Expenses
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Record rent, utilities, electricity, gas, staff salaries & cafe upkeep
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="text-xs bg-[#43291F] hover:bg-[#341F17] text-white"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Record New Expense
        </Button>
      </div>

      {statusMsg && (
        <Alert variant={statusMsg.type === "success" ? "olive" : "destructive"}>
          <AlertDescription>{statusMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Expense KPI summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#705B51] block">Total Logged</span>
          <span className="font-serif text-2xl font-bold text-[#43291F] block mt-1">
            {formatCurrency(totalExpenseAmount)}
          </span>
        </Card>

        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#705B51] block">Rent & Lease</span>
          <span className="font-serif text-xl font-bold text-[#43291F] block mt-1">
            {formatCurrency(categoryTotals["rent"] || 0)}
          </span>
        </Card>

        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#705B51] block">Electricity & Gas</span>
          <span className="font-serif text-xl font-bold text-[#43291F] block mt-1">
            {formatCurrency((categoryTotals["electricity"] || 0) + (categoryTotals["gas"] || 0))}
          </span>
        </Card>

        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#705B51] block">Salaries & Wages</span>
          <span className="font-serif text-xl font-bold text-[#43291F] block mt-1">
            {formatCurrency(categoryTotals["salary"] || 0)}
          </span>
        </Card>
      </div>

      {/* Expenses List Table */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Receipt / Voucher Ref</th>
                <th className="py-3 px-4">Logged By</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED0]">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[#705B51]">
                    {formatDate(exp.expense_date)}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="secondary" className="capitalize text-[10px]">
                      {exp.category}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#43291F]">
                    {exp.description}
                  </td>
                  <td className="py-3.5 px-4 text-[#705B51]">
                    {exp.reference || "—"}
                  </td>
                  <td className="py-3.5 px-4 text-[#705B51]">
                    {exp.profiles?.full_name || "Admin"}
                  </td>
                  <td className="py-3.5 px-4 text-right font-serif font-bold text-sm text-[#43291F]">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(exp.id)}
                      className="text-[#A09289] hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {expenses.length === 0 && (
          <div className="py-14 text-center text-[#A09289]">
            <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-serif font-bold text-base text-[#43291F]">No Expenses Recorded</p>
            <p className="text-xs text-[#705B51] mt-1">
              Add operational costs to calculate accurate net profit and P&L statements.
            </p>
          </div>
        )}
      </Card>

      {/* ── ADD EXPENSE MODAL ── */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Operational Expense</DialogTitle>
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
                <option value="rent">Shop Rent & Maintenance</option>
                <option value="electricity">Electricity Bill</option>
                <option value="gas">LPG Commercial Gas</option>
                <option value="salary">Staff Salary / Daily Wages</option>
                <option value="maintenance">Repairs & Cafe Maintenance</option>
                <option value="ingredients">Direct Market Ingredients</option>
                <option value="other">Other Operational Costs</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description / Narrative *</Label>
              <Input
                id="description"
                name="description"
                placeholder="e.g. November Cafe Rent Paid to Landlord"
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
