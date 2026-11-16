"use client"

import * as React from "react"
import {
  Boxes,
  Plus,
  AlertTriangle,
  History,
  Truck,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  ShoppingCart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { addIngredientAction, addSupplierAction } from "@/lib/actions/inventory"
import { formatCurrency, formatDateTime } from "@/lib/utils"

interface AdminInventoryManagerProps {
  ingredients: any[]
  suppliers: any[]
  movements: any[]
  lowStockItems?: any[]
  purchaseHistory?: any[]
}

export function AdminInventoryManager({
  ingredients: initialIngredients,
  suppliers: initialSuppliers,
  movements: initialMovements,
  lowStockItems = [],
  purchaseHistory = [],
}: AdminInventoryManagerProps) {
  const [ingredients, setIngredients] = React.useState<any[]>(initialIngredients)
  const [suppliers, setSuppliers] = React.useState<any[]>(initialSuppliers)
  const [search, setSearch] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<"alerts" | "ingredients" | "movements" | "purchases" | "suppliers">(
    lowStockItems.length > 0 ? "alerts" : "ingredients"
  )

  // Modals
  const [showAddIngModal, setShowAddIngModal] = React.useState(false)
  const [showAddSupplierModal, setShowAddSupplierModal] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  const filteredIngredients = React.useMemo(() => {
    return ingredients.filter((ing) =>
      !search.trim() ||
      ing.name.toLowerCase().includes(search.toLowerCase()) ||
      ing.suppliers?.name?.toLowerCase().includes(search.toLowerCase())
    )
  }, [ingredients, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#43291F]">
            Inventory & Ingredients
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Track raw cafe materials, stock movements, consumption & suppliers
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddSupplierModal(true)}
            className="text-xs border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F]"
          >
            <Truck className="w-3.5 h-3.5 mr-1 text-[#737B52]" />
            Add Supplier
          </Button>

          <Button
            size="sm"
            onClick={() => setShowAddIngModal(true)}
            className="text-xs bg-[#43291F] hover:bg-[#341F17] text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Raw Material
          </Button>
        </div>
      </div>

      {statusMsg && (
        <Alert variant={statusMsg.type === "success" ? "olive" : "destructive"}>
          <AlertDescription>{statusMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* View Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E8DED0] pb-2">
        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "alerts"
              ? "bg-red-700 text-white"
              : "bg-red-50 text-red-700 hover:bg-red-100"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Low Stock Alerts
          {lowStockItems.length > 0 && (
            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeTab === "alerts" ? "bg-white text-red-700" : "bg-red-700 text-white"}`}>
              {lowStockItems.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("ingredients")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "ingredients"
              ? "bg-[#43291F] text-white"
              : "bg-[#FFFDF8] text-[#705B51] hover:bg-[#EFE7DA]"
          }`}
        >
          Ingredients Stock ({ingredients.length})
        </button>
        <button
          onClick={() => setActiveTab("movements")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "movements"
              ? "bg-[#43291F] text-white"
              : "bg-[#FFFDF8] text-[#705B51] hover:bg-[#EFE7DA]"
          }`}
        >
          Stock Movements Log ({initialMovements.length})
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "suppliers"
              ? "bg-[#43291F] text-white"
              : "bg-[#FFFDF8] text-[#705B51] hover:bg-[#EFE7DA]"
          }`}
        >
          Suppliers Directory ({suppliers.length})
        </button>

        <button
          onClick={() => setActiveTab("purchases")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "purchases"
              ? "bg-[#43291F] text-white"
              : "bg-[#FFFDF8] text-[#705B51] hover:bg-[#EFE7DA]"
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Purchase History ({purchaseHistory.length})
        </button>
      </div>

      {/* ── TAB 0: LOW STOCK ALERTS ── */}
      {activeTab === "alerts" && (
        <Card className="border-2 border-red-200 bg-red-50/40 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-serif font-bold text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Restock Needed — {lowStockItems.length} ingredient{lowStockItems.length !== 1 ? "s" : ""} below minimum stock
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockItems.length === 0 ? (
              <div className="py-14 text-center text-[#A09289]">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30 text-red-400" />
                <p className="font-serif font-bold text-base text-[#43291F]">All Stock Levels Healthy</p>
                <p className="text-xs text-[#705B51] mt-1">No ingredients are below their minimum threshold.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-red-100 border-b border-red-200 font-serif font-bold text-red-900">
                    <tr>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Current</th>
                      <th className="py-3 px-4">Minimum</th>
                      <th className="py-3 px-4">Shortfall</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {lowStockItems.map((item) => {
                      const shortfall = Math.max(0, Number(item.min_stock) - Number(item.current_stock))
                      const isOut = Number(item.current_stock) <= 0
                      const isCritical = Number(item.current_stock) <= Number(item.min_stock) * 0.5
                      return (
                        <tr key={item.id} className="hover:bg-red-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-[#43291F]">{item.name}</td>
                          <td className="py-3 px-4 font-mono text-red-700 font-semibold">
                            {item.current_stock} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-[#705B51]">
                            {item.min_stock} {item.unit}
                          </td>
                          <td className="py-3 px-4 font-bold text-red-800">
                            {shortfall.toFixed(2)} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-[#705B51]">
                            {item.suppliers?.name || "Direct Purchase"}
                            {item.suppliers?.phone && (
                              <span className="block font-mono text-[10px] text-[#A09289]">{item.suppliers.phone}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge
                              variant={isOut ? "destructive" : isCritical ? "destructive" : "warning"}
                              className="text-[10px]"
                            >
                              {isOut ? "Out of Stock" : isCritical ? "Critical Low" : "Low Stock"}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 1: INGREDIENTS TABLE ── */}
      {activeTab === "ingredients" && (
        <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
          <div className="p-3 border-b border-[#E8DED0] flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#A09289]" />
              <Input
                placeholder="Search raw ingredient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9 bg-[#F8F3E9]"
              />
            </div>
            <span className="text-xs text-[#705B51]">
              {ingredients.filter((i) => i.current_stock <= i.min_stock).length} items below minimum stock
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
                <tr>
                  <th className="py-3 px-4">Ingredient Name</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Minimum Threshold</th>
                  <th className="py-3 px-4">Est. Cost / Unit</th>
                  <th className="py-3 px-4">Preferred Supplier</th>
                  <th className="py-3 px-4 text-right">Stock Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED0]">
                {filteredIngredients.map((ing) => {
                  const isLow = Number(ing.current_stock) <= Number(ing.min_stock)
                  const isCritical = Number(ing.current_stock) <= Number(ing.min_stock) * 0.5
                  const isOut = Number(ing.current_stock) <= 0
                  return (
                    <tr key={ing.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#43291F] text-sm">
                        {ing.name}
                      </td>
                      <td className="py-3.5 px-4 uppercase font-mono text-[#705B51]">
                        {ing.unit}
                      </td>
                      <td className="py-3.5 px-4 font-bold font-serif text-sm text-[#43291F]">
                        {ing.current_stock} {ing.unit}
                      </td>
                      <td className="py-3.5 px-4 text-[#705B51]">
                        {ing.min_stock} {ing.unit}
                      </td>
                      <td className="py-3.5 px-4">
                        {ing.cost_per_unit ? formatCurrency(ing.cost_per_unit) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-[#705B51]">
                        {ing.suppliers?.name || "Direct Purchase"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Badge
                          variant={isOut ? "destructive" : isCritical ? "destructive" : isLow ? "warning" : "success"}
                          className="text-[10px]"
                        >
                          {isOut ? "Out of Stock" : isCritical ? "Critical Low" : isLow ? "Low Stock" : "Healthy"}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredIngredients.length === 0 && (
            <div className="py-14 text-center text-[#A09289]">
              <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-serif font-bold text-base text-[#43291F]">No Raw Materials Added</p>
              <p className="text-xs text-[#705B51] mt-1">
                Add milk, sugar, tea powder, coffee, and cups to begin tracking cafe stock.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ── TAB 2: STOCK MOVEMENTS ── */}
      {activeTab === "movements" && (
        <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Ingredient</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Quantity Change</th>
                  <th className="py-3 px-4">Balance After</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                  <th className="py-3 px-4 text-right">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED0]">
                {initialMovements.map((m) => {
                  const isPositive = Number(m.quantity) > 0
                  return (
                    <tr key={m.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                      <td className="py-3.5 px-4 text-[#705B51]">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#43291F]">
                        {m.ingredients?.name || "Item"}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            m.movement_type === "purchase"
                              ? "success"
                              : m.movement_type === "wastage"
                              ? "destructive"
                              : "secondary"
                          }
                          className="capitalize text-[10px]"
                        >
                          {m.movement_type.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className={`py-3.5 px-4 font-bold ${isPositive ? "text-emerald-700" : "text-red-700"}`}>
                        {isPositive ? `+${m.quantity}` : m.quantity} {m.ingredients?.unit}
                      </td>
                      <td className="py-3.5 px-4 text-[#705B51]">
                        {m.stock_after} {m.ingredients?.unit}
                      </td>
                      <td className="py-3.5 px-4 text-[#705B51]">
                        {m.reason || "Automatic operation"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#43291F]">
                        {m.profiles?.full_name || "Manager"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {initialMovements.length === 0 && (
            <div className="py-14 text-center text-[#A09289]">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-serif font-bold text-base text-[#43291F]">No Stock Movements Logged</p>
              <p className="text-xs text-[#705B51] mt-1">
                Stock changes from purchases, recipes, and wastage will be recorded here.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ── TAB 3: SUPPLIERS DIRECTORY ── */}
      {activeTab === "suppliers" && (
        <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Address / Market</th>
                  <th className="py-3 px-4 text-right">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED0]">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#43291F] text-sm">
                      {s.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#705B51]">
                      {s.phone || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-[#705B51]">
                      {s.email || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-[#705B51]">
                      {s.address || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#A09289]">
                      {s.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {suppliers.length === 0 && (
            <div className="py-14 text-center text-[#A09289]">
              <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-serif font-bold text-base text-[#43291F]">No Suppliers Configured</p>
              <p className="text-xs text-[#705B51] mt-1">
                Add dairy, bakery, and produce suppliers to streamline inward stock receipts.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ── TAB 4: PURCHASE HISTORY (Admin cross-verify) ── */}
      {activeTab === "purchases" && (
        <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
          <div className="p-3 border-b border-[#E8DED0]">
            <p className="text-xs font-bold text-[#43291F]">Stock Purchase History</p>
            <p className="text-[11px] text-[#705B51] mt-0.5">
              All stock received by managers — cross-verify quantities, costs, and suppliers
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Items Received</th>
                  <th className="py-3 px-4">Total Cost</th>
                  <th className="py-3 px-4">Reference No.</th>
                  <th className="py-3 px-4 text-right">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED0]">
                {purchaseHistory.map((po) => (
                  <tr key={po.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                    <td className="py-3 px-4 text-[#705B51]">{formatDateTime(po.created_at)}</td>
                    <td className="py-3 px-4 font-bold text-[#43291F]">
                      {po.suppliers?.name || "Direct Purchase"}
                      {po.suppliers?.phone && (
                        <span className="block font-mono text-[10px] text-[#A09289]">{po.suppliers.phone}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {po.purchase_items?.map((pi: any) => (
                          <div key={pi.id} className="text-[11px]">
                            <span className="font-semibold text-[#43291F]">{pi.ingredients?.name}</span>
                            <span className="text-[#705B51] ml-1">
                              × {pi.quantity} {pi.ingredients?.unit}
                              {pi.unit_cost > 0 && <span className="ml-1 text-[#A09289]">@ ₹{pi.unit_cost}/{pi.ingredients?.unit}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold font-serif text-[#43291F]">
                      {po.total_cost > 0 ? `₹${Number(po.total_cost).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#705B51]">
                      {po.reference_no || "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-[#A09289]">
                      {po.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {purchaseHistory.length === 0 && (
            <div className="py-14 text-center text-[#A09289]">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-serif font-bold text-base text-[#43291F]">No Purchase Records Yet</p>
              <p className="text-xs text-[#705B51] mt-1">
                Stock inward receipts submitted by the manager will appear here for admin review.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ── ADD INGREDIENT MODAL ── */}
      <Dialog open={showAddIngModal} onOpenChange={setShowAddIngModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Raw Material / Ingredient</DialogTitle>
          </DialogHeader>

          <form
            action={async (formData) => {
              setLoading(true)
              const res = await addIngredientAction(formData)
              setLoading(false)
              if (res.success && res.ingredient) {
                setIngredients((prev) => [...prev, res.ingredient])
                setShowAddIngModal(false)
                setStatusMsg({
                  type: "success",
                  text: `Ingredient "${res.ingredient.name}" registered.`,
                })
              } else {
                setStatusMsg({ type: "error", text: res.error || "Failed to add ingredient" })
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="ingName">Material / Ingredient Name *</Label>
                <Input id="ingName" name="name" placeholder="e.g. Buffalo Milk" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit of Measure *</Label>
                <Select id="unit" name="unit" required>
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="ml">Millilitres (ml)</option>
                  <option value="l">Litres (l)</option>
                  <option value="pcs">Pieces (pcs)</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="minStock">Min Stock Alert Level *</Label>
                <Input
                  id="minStock"
                  name="min_stock"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="5.00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="initStock">Opening Stock Qty</Label>
                <Input
                  id="initStock"
                  name="current_stock"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unitCost">Cost Per Unit (₹)</Label>
                <Input
                  id="unitCost"
                  name="cost_per_unit"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="60.00"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="prefSupplier">Preferred Supplier</Label>
                <Select id="prefSupplier" name="preferred_supplier_id">
                  <option value="">None / Open Market</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#43291F] hover:bg-[#341F17] text-white font-bold"
            >
              {loading ? "Adding Material..." : "Save Material & Opening Stock"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ADD SUPPLIER MODAL ── */}
      <Dialog open={showAddSupplierModal} onOpenChange={setShowAddSupplierModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>

          <form
            action={async (formData) => {
              setLoading(true)
              const res = await addSupplierAction(formData)
              setLoading(false)
              if (res.success && res.supplier) {
                setSuppliers((prev) => [...prev, res.supplier])
                setShowAddSupplierModal(false)
                setStatusMsg({
                  type: "success",
                  text: `Supplier "${res.supplier.name}" added successfully.`,
                })
              } else {
                setStatusMsg({ type: "error", text: res.error || "Failed to add supplier" })
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="supName">Supplier / Vendor Name *</Label>
              <Input id="supName" name="name" placeholder="e.g. Ganga Dairy Farm" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supPhone">Phone Number</Label>
              <Input id="supPhone" name="phone" placeholder="e.g. +91 9876543210" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supEmail">Email</Label>
              <Input id="supEmail" name="email" type="email" placeholder="vendor@gmail.com" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supAddr">Shop Address</Label>
              <Input id="supAddr" name="address" placeholder="e.g. Market Road, Stall 4" />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#43291F] hover:bg-[#341F17] text-white font-bold"
            >
              {loading ? "Saving Supplier..." : "Save Supplier Record"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
