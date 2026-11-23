"use client"

import * as React from "react"
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  Search,
  FolderPlus,
  Boxes,
  AlertTriangle,
  TrendingUp,
  Percent,
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
import {
  addProductAction,
  updateProductAction,
  toggleProductAvailabilityAction,
  archiveProductAction,
  restoreProductAction,
  addCategoryAction,
} from "@/lib/actions/menu"
import { formatCurrency } from "@/lib/utils"

interface AdminMenuManagerProps {
  initialProducts: any[]
  initialCategories: any[]
}

export function AdminMenuManager({
  initialProducts,
  initialCategories,
}: AdminMenuManagerProps) {
  const [products, setProducts] = React.useState<any[]>(initialProducts)
  const [categories, setCategories] = React.useState<any[]>(initialCategories)
  const [search, setSearch] = React.useState("")
  const [selectedCat, setSelectedCat] = React.useState<string>("all")
  const [showArchived, setShowArchived] = React.useState(false)

  // Modals
  const [showAddProductModal, setShowAddProductModal] = React.useState(false)
  const [showEditProductModal, setShowEditProductModal] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<any | null>(null)
  const [showAddCategoryModal, setShowAddCategoryModal] = React.useState(false)

  // Live calculation states for Add modal
  const [addBasePrice, setAddBasePrice] = React.useState<number>(0)
  const [addCostPrice, setAddCostPrice] = React.useState<number>(0)

  // Live calculation states for Edit modal
  const [editBasePrice, setEditBasePrice] = React.useState<number>(0)
  const [editCostPrice, setEditCostPrice] = React.useState<number>(0)

  const [loading, setLoading] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form states
  const [newCatName, setNewCatName] = React.useState("")

  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchActive = showArchived ? true : p.is_active
      const matchCat = selectedCat === "all" || p.category_id === selectedCat
      const matchSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.menu_categories?.name?.toLowerCase().includes(search.toLowerCase())
      return matchActive && matchCat && matchSearch
    })
  }, [products, search, selectedCat, showArchived])

  // Handlers
  const handleToggleAvailability = async (id: string, current: boolean) => {
    try {
      const res = await toggleProductAvailabilityAction(id, !current)
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_available: !current } : p))
        )
      }
    } catch (err: unknown) {
      console.error(err)
    }
  }

  const handleArchive = async (id: string) => {
    try {
      const res = await archiveProductAction(id)
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_active: false } : p))
        )
        setStatusMsg({ type: 'success', text: 'Product archived successfully' })
      }
    } catch (err: unknown) {
      console.error(err)
    }
  }

  const handleRestore = async (id: string) => {
    try {
      const res = await restoreProductAction(id)
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_active: true } : p))
        )
        setStatusMsg({ type: 'success', text: 'Product restored to active menu' })
      }
    } catch (err: unknown) {
      console.error(err)
    }
  }

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    setLoading(true)
    try {
      const res = await addCategoryAction(newCatName.trim(), categories.length + 1)
      if (res.success && res.category) {
        setCategories((prev) => [...prev, res.category])
        setNewCatName("")
        setShowAddCategoryModal(false)
        setStatusMsg({ type: 'success', text: `Category "${res.category.name}" created` })
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Failed to add category' })
      }
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (prod: any) => {
    setEditingProduct(prod)
    setEditBasePrice(Number(prod.base_price) || 0)
    setEditCostPrice(Number(prod.cost_price) || 0)
    setShowEditProductModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#43291F]">
            Menu, Costs &amp; Pricing
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Configure Selling Price (SP), Manufacturing Cost (CP), profit margins and stock levels
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddCategoryModal(true)}
            className="text-xs border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F]"
          >
            <FolderPlus className="w-3.5 h-3.5 mr-1 text-[#737B52]" />
            Add Category
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setAddBasePrice(0)
              setAddCostPrice(0)
              setShowAddProductModal(true)
            }}
            className="text-xs bg-[#43291F] hover:bg-[#341F17] text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add New Product
          </Button>
        </div>
      </div>

      {statusMsg && (
        <Alert
          variant={statusMsg.type === 'success' ? 'olive' : 'destructive'}
        >
          <AlertDescription>{statusMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#A09289]" />
            <Input
              placeholder="Search product by name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-[#F8F3E9]"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="h-9 text-xs min-w-[160px]"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <label className="flex items-center gap-1.5 text-xs text-[#705B51] whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded text-[#43291F]"
              />
              Show Archived
            </label>
          </div>
        </div>
      </Card>

      {/* Products Table with Selling Price, Manufacturing Cost, Profit & Stock */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Selling Price (SP)</th>
                <th className="py-3 px-4 text-right">Mfg Cost (CP)</th>
                <th className="py-3 px-4 text-right">Unit Profit &amp; Margin</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-center">Availability</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED0]">
              {filteredProducts.map((prod) => {
                const sp = Number(prod.base_price) || 0
                const cp = Number(prod.cost_price) || 0
                const unitProfit = sp - cp
                const marginPct = sp > 0 ? ((unitProfit / sp) * 100).toFixed(0) : "0"
                const stock = Number(prod.current_stock ?? 0)
                const minStock = Number(prod.min_stock ?? 10)
                const isLow = stock <= minStock

                return (
                  <tr key={prod.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                    <td className="py-3.5 px-4 font-serif font-bold text-sm text-[#43291F]">
                      {prod.name}
                      {!prod.is_active && (
                        <span className="ml-2 text-[10px] text-red-600 font-sans font-normal">
                          (Archived)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="olive" className="text-[10px]">
                        {prod.menu_categories?.name || "General"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sm text-[#43291F] text-right font-mono">
                      {formatCurrency(sp)}
                    </td>
                    <td className="py-3.5 px-4 text-sm text-[#705B51] text-right font-mono">
                      {formatCurrency(cp)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-[#737B52] font-mono">
                        +{formatCurrency(unitProfit)}
                      </div>
                      <div className="text-[10px] text-[#A09289]">
                        {marginPct}% margin
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isLow
                            ? "bg-red-100 text-red-800"
                            : "bg-[#F0F1EA] text-[#737B52]"
                        }`}
                      >
                        {isLow && <AlertTriangle className="w-3 h-3 text-red-600" />}
                        {stock} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(prod.id, prod.is_available)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                          prod.is_available
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                      >
                        {prod.is_available ? "In Stock" : "Unavailable"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(prod)}
                          className="h-7 text-xs border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F]"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>

                        {prod.is_active ? (
                          <button
                            type="button"
                            onClick={() => handleArchive(prod.id)}
                            title="Archive Product"
                            className="text-[#A09289] hover:text-red-700 p-1 rounded"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestore(prod.id)}
                            title="Restore Product"
                            className="text-[#737B52] hover:text-[#43291F] p-1 rounded"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-14 text-center text-[#A09289]">
            <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-serif font-bold text-base text-[#43291F]">No Products Found</p>
            <p className="text-xs text-[#705B51] mt-1">
              Add products or run the menu seed migration.
            </p>
          </div>
        )}
      </Card>

      {/* ── ADD CATEGORY MODAL ── */}
      <Dialog open={showAddCategoryModal} onOpenChange={setShowAddCategoryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Menu Category</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddCategorySubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="catName">Category Name *</Label>
              <Input
                id="catName"
                placeholder="e.g. Special Desserts"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#43291F] hover:bg-[#341F17] text-white"
            >
              {loading ? "Creating Category..." : "Save Category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ADD PRODUCT MODAL (With Live Profit Calculator) ── */}
      <Dialog open={showAddProductModal} onOpenChange={setShowAddProductModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Product to Menu</DialogTitle>
          </DialogHeader>

          <form
            action={async (formData) => {
              setLoading(true)
              const res = await addProductAction(formData)
              setLoading(false)
              if (res.success && res.product) {
                setProducts((prev) => [...prev, res.product])
                setShowAddProductModal(false)
                setStatusMsg({ type: 'success', text: `Product "${res.product.name}" added successfully.` })
              } else {
                setStatusMsg({ type: 'error', text: res.error || 'Failed to add product' })
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="prodName">Product Name *</Label>
                <Input id="prodName" name="name" placeholder="e.g. Elaichi Tea" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="catSelect">Category *</Label>
                <Select id="catSelect" name="category_id" required>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prodPrice">Selling Price (SP in ₹) *</Label>
                <Input
                  id="prodPrice"
                  name="base_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="30.00"
                  onChange={(e) => setAddBasePrice(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prodCost">Manufacturing Cost (CP in ₹) *</Label>
                <Input
                  id="prodCost"
                  name="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="10.00"
                  onChange={(e) => setAddCostPrice(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="initialStock">Initial Stock Units</Label>
                <Input
                  id="initialStock"
                  name="current_stock"
                  type="number"
                  min="0"
                  defaultValue="50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="minStock">Low Stock Alert At (Units)</Label>
                <Input
                  id="minStock"
                  name="min_stock"
                  type="number"
                  min="0"
                  defaultValue="10"
                  required
                />
              </div>

              {/* LIVE COMMERCIAL PROFIT PREVIEW */}
              <div className="col-span-2 p-3 rounded-lg bg-[#F8F3E9] border border-[#E8DED0]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#705B51]">Unit Profit (SP - CP):</span>
                  <span className="font-bold text-[#43291F] font-mono text-sm">
                    {formatCurrency(Math.max(0, addBasePrice - addCostPrice))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-[#705B51]">Gross Profit Margin:</span>
                  <span className="font-bold text-[#737B52]">
                    {addBasePrice > 0 ? (((addBasePrice - addCostPrice) / addBasePrice) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="prodDesc">Description (Optional)</Label>
                <Textarea
                  id="prodDesc"
                  name="description"
                  placeholder="Freshly prepared with authentic ingredients..."
                  rows={2}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#43291F] hover:bg-[#341F17] text-white font-bold"
            >
              {loading ? "Adding Product..." : "Create Product with Cost & Stock"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT PRODUCT MODAL (With Live Profit Calculator) ── */}
      {editingProduct && (
        <Dialog open={showEditProductModal} onOpenChange={setShowEditProductModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Product: {editingProduct.name}</DialogTitle>
            </DialogHeader>

            <form
              action={async (formData) => {
                setLoading(true)
                const res = await updateProductAction(editingProduct.id, formData)
                setLoading(false)
                if (res.success) {
                  const updatedPrice = Number(formData.get('base_price'))
                  const updatedCost = Number(formData.get('cost_price'))
                  const updatedStock = Number(formData.get('current_stock'))
                  const updatedMin = Number(formData.get('min_stock'))
                  const updatedName = formData.get('name') as string
                  const updatedCat = formData.get('category_id') as string

                  setProducts((prev) =>
                    prev.map((p) =>
                      p.id === editingProduct.id
                        ? {
                            ...p,
                            name: updatedName,
                            base_price: updatedPrice,
                            cost_price: updatedCost,
                            current_stock: updatedStock,
                            min_stock: updatedMin,
                            category_id: updatedCat,
                          }
                        : p
                    )
                  )
                  setShowEditProductModal(false)
                  setStatusMsg({ type: 'success', text: `Product "${updatedName}" updated successfully.` })
                } else {
                  setStatusMsg({ type: 'error', text: res.error || 'Failed to update' })
                }
              }}
              className="space-y-4 pt-2"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="editName">Product Name *</Label>
                  <Input
                    id="editName"
                    name="name"
                    defaultValue={editingProduct.name}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editCat">Category *</Label>
                  <Select
                    id="editCat"
                    name="category_id"
                    defaultValue={editingProduct.category_id}
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editPrice">Selling Price (SP in ₹) *</Label>
                  <Input
                    id="editPrice"
                    name="base_price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingProduct.base_price}
                    onChange={(e) => setEditBasePrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editCost">Manufacturing Cost (CP in ₹) *</Label>
                  <Input
                    id="editCost"
                    name="cost_price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingProduct.cost_price || 0}
                    onChange={(e) => setEditCostPrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editStock">Current Stock Units</Label>
                  <Input
                    id="editStock"
                    name="current_stock"
                    type="number"
                    min="0"
                    defaultValue={editingProduct.current_stock ?? 50}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editMinStock">Low Stock Alert At</Label>
                  <Input
                    id="editMinStock"
                    name="min_stock"
                    type="number"
                    min="0"
                    defaultValue={editingProduct.min_stock ?? 10}
                    required
                  />
                </div>

                {/* LIVE COMMERCIAL PROFIT PREVIEW */}
                <div className="col-span-2 p-3 rounded-lg bg-[#F8F3E9] border border-[#E8DED0]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#705B51]">Unit Profit (SP - CP):</span>
                    <span className="font-bold text-[#43291F] font-mono text-sm">
                      {formatCurrency(Math.max(0, editBasePrice - editCostPrice))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-[#705B51]">Gross Profit Margin:</span>
                    <span className="font-bold text-[#737B52]">
                      {editBasePrice > 0 ? (((editBasePrice - editCostPrice) / editBasePrice) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="priceReason">Reason for Price Change (Logged in Audit)</Label>
                  <Input
                    id="priceReason"
                    name="price_change_reason"
                    placeholder="e.g. Milk & dairy cost revision"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="editDesc">Description</Label>
                  <Textarea
                    id="editDesc"
                    name="description"
                    defaultValue={editingProduct.description || ""}
                    rows={2}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#43291F] hover:bg-[#341F17] text-white font-bold"
              >
                {loading ? "Saving Changes..." : "Update Product & Save Costs"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
