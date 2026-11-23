"use client"

import * as React from "react"
import {
  PackagePlus,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Search,
  Truck,
  FileText,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { recordStockInwardAction } from "@/lib/actions/inventory"
import { formatCurrency, formatDateTime } from "@/lib/utils"

interface StockInwardFormProps {
  products: any[]
  initialInwards: any[]
}

export function StockInwardForm({ products: initialProducts, initialInwards }: StockInwardFormProps) {
  const [products, setProducts] = React.useState<any[]>(initialProducts)
  const [inwards, setInwards] = React.useState<any[]>(initialInwards)
  const [selectedProductId, setSelectedProductId] = React.useState<string>(products[0]?.id || "")
  const [quantity, setQuantity] = React.useState<number>(50)
  const [unitCost, setUnitCost] = React.useState<number>(0)
  const [supplierName, setSupplierName] = React.useState("")
  const [invoiceRef, setInvoiceRef] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  const selectedProduct = React.useMemo(() => {
    return products.find((p) => p.id === selectedProductId)
  }, [products, selectedProductId])

  React.useEffect(() => {
    if (selectedProduct) {
      setUnitCost(Number(selectedProduct.cost_price) || 0)
    }
  }, [selectedProduct])

  const lowStockItems = React.useMemo(() => {
    return products.filter((p) => Number(p.current_stock ?? 0) <= Number(p.min_stock ?? 10))
  }, [products])

  const filteredProducts = React.useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || p.menu_categories?.name?.toLowerCase().includes(q)
    )
  }, [products, search])

  const totalInwardValue = quantity * (unitCost > 0 ? unitCost : (selectedProduct?.cost_price || 0))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId || quantity <= 0) return

    setSubmitting(true)
    setStatusMsg(null)

    try {
      const res = await recordStockInwardAction({
        product_id: selectedProductId,
        quantity,
        unit_cost: unitCost,
        supplier_name: supplierName.trim() || null,
        invoice_ref: invoiceRef.trim() || null,
        notes: notes.trim() || null,
      })

      if (res.success && res.result) {
        // Update local product stock
        setProducts((prev) =>
          prev.map((p) =>
            p.id === selectedProductId ? { ...p, current_stock: res.result.new_stock } : p
          )
        )

        // Prepend to inward list
        setInwards((prev) => [
          {
            id: res.result.inward_id,
            product_id: selectedProductId,
            quantity,
            unit_cost: unitCost,
            total_cost: quantity * unitCost,
            supplier_name: supplierName || "Direct Delivery",
            invoice_ref: invoiceRef || null,
            notes: notes || null,
            created_at: new Date().toISOString(),
            products: { name: selectedProduct?.name || "Product" },
            profiles: { full_name: "Manager" },
          },
          ...prev,
        ])

        setStatusMsg({
          type: "success",
          text: `Successfully received +${quantity} units of ${selectedProduct?.name}. New stock: ${res.result.new_stock} units.`,
        })

        setSupplierName("")
        setInvoiceRef("")
        setNotes("")
      } else {
        setStatusMsg({ type: "error", text: res.error || "Failed to record stock inward" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#43291F] flex items-center gap-2">
            <PackagePlus className="w-6 h-6 text-[#737B52]" />
            Stock Inward &amp; Delivery Receiving
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Manager counter interface: Receive physical product shipments, puffs, bakery goods &amp; raw materials
          </p>
        </div>

        {lowStockItems.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 text-red-900 text-xs font-bold border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-700 animate-pulse" />
            <span>{lowStockItems.length} product{lowStockItems.length > 1 ? "s" : ""} low in stock</span>
          </div>
        )}
      </div>

      {statusMsg && (
        <Alert variant={statusMsg.type === "success" ? "olive" : "destructive"}>
          <AlertDescription>{statusMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Main Grid: Form on Left, Stock Watch & Log on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Delivery Receive Form */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
            <CardHeader className="p-4 border-b border-[#E8DED0] bg-[#F8F3E9]">
              <CardTitle className="font-serif text-base text-[#43291F] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#B56C4A]" />
                Receive Physical Stock
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Product Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="product" className="text-xs font-bold text-[#43291F]">
                    Select Delivered Product *
                  </Label>
                  <Select
                    id="product"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                    className="h-10 text-xs font-semibold"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.current_stock ?? 0} left)
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Current Stock Preview Card */}
                {selectedProduct && (
                  <div className="p-3 rounded-lg bg-[#F8F3E9] border border-[#E8DED0] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#705B51] block">Current Store Stock:</span>
                      <span className="font-serif font-bold text-base text-[#43291F] font-mono">
                        {selectedProduct.current_stock ?? 0} units
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#705B51] block">Cost Price (CP):</span>
                      <span className="font-serif font-bold text-base text-[#737B52] font-mono">
                        {formatCurrency(selectedProduct.cost_price || 0)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quantity with Touch Presets */}
                <div className="space-y-1.5">
                  <Label htmlFor="qty" className="text-xs font-bold text-[#43291F]">
                    Delivered Quantity (Units) *
                  </Label>
                  <Input
                    id="qty"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                    required
                    className="font-mono text-base font-bold h-10"
                  />
                  <div className="flex gap-1.5 pt-1">
                    {[+10, +25, +50, +100, +200].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantity((prev) => Math.max(1, prev + preset))}
                        className="px-2.5 py-1 rounded bg-[#EFE7DA] text-xs font-bold text-[#43291F] hover:bg-[#E8DED0] cursor-pointer"
                      >
                        +{preset}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setQuantity(50)}
                      className="px-2 py-1 rounded bg-[#F8F3E9] text-[10px] text-[#705B51] hover:bg-[#EFE7DA] border border-[#E8DED0]"
                    >
                      Reset 50
                    </button>
                  </div>
                </div>

                {/* Unit Cost & Total Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cost" className="text-xs font-bold text-[#43291F]">
                      Unit Cost (₹)
                    </Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitCost}
                      onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#43291F]">
                      Total Shipment Cost
                    </Label>
                    <div className="h-9 px-3 rounded-md bg-[#F8F3E9] border border-[#E8DED0] flex items-center font-mono font-bold text-xs text-[#737B52]">
                      {formatCurrency(totalInwardValue)}
                    </div>
                  </div>
                </div>

                {/* Supplier & Invoice */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="supplier" className="text-xs text-[#705B51]">
                      Supplier / Vendor
                    </Label>
                    <Input
                      id="supplier"
                      placeholder="e.g. Aavin Dairy"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ref" className="text-xs text-[#705B51]">
                      Challan / Bill Ref
                    </Label>
                    <Input
                      id="ref"
                      placeholder="e.g. INV-492"
                      value={invoiceRef}
                      onChange={(e) => setInvoiceRef(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Delivery Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs text-[#705B51]">
                    Manager Notes (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Received fresh morning batch, packed well..."
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting || quantity <= 0}
                  className="w-full h-11 bg-[#43291F] hover:bg-[#341F17] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#FAF0EB]" />
                      <span>Updating Store Stock...</span>
                    </>
                  ) : (
                    `Confirm Inward (+${quantity} units)`
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Low-Stock Alerts & Inwards History */}
        <div className="lg:col-span-7 space-y-4">
          {/* Low Stock Warning Banner */}
          {lowStockItems.length > 0 && (
            <Card className="border-2 border-red-300 bg-red-50/70 shadow-xs">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-700" />
                  <span className="text-xs font-bold text-red-950">
                    Low Stock Alert — Place Supplier Orders For:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lowStockItems.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(p.id)
                        setQuantity(50)
                      }}
                      className="px-2 py-1 rounded bg-white text-[11px] font-bold text-red-800 border border-red-200 hover:bg-red-100 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{p.name}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-red-700 text-white text-[9px]">
                        {p.current_stock ?? 0} left
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Inwards Received Table & Mobile Cards */}
          <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden min-w-0">
            <CardHeader className="p-3.5 sm:p-4 border-b border-[#E8DED0] bg-[#F8F3E9] flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-sm sm:text-base text-[#43291F] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#737B52]" />
                Recent Inward Deliveries Received
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {inwards.length} records
              </Badge>
            </CardHeader>

            {/* Mobile Card List (< md) */}
            <div className="block md:hidden divide-y divide-[#E8DED0]">
              {inwards.map((item) => (
                <div key={item.id} className="p-3.5 space-y-2 hover:bg-[#F8F3E9]/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#43291F]">
                        {item.products?.name || "Product"}
                      </h4>
                      <p className="text-[11px] text-[#705B51] mt-0.5">
                        {formatDateTime(item.created_at)}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs shrink-0">
                      +{item.quantity} units
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8DED0]/60">
                    <span className="text-[#705B51]">
                      Unit: <span className="font-mono text-[#43291F]">{formatCurrency(item.unit_cost || 0)}</span>
                    </span>
                    <span className="font-mono font-bold text-[#43291F]">
                      Total: {formatCurrency(item.total_cost || 0)}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#705B51] bg-[#F8F3E9] p-2 rounded-md">
                    <span>Vendor: <strong>{item.supplier_name || "Direct Delivery"}</strong></span>
                    {item.invoice_ref && (
                      <span className="ml-2 font-mono text-[#A09289]">Ref: {item.invoice_ref}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F3E9]/50 border-b border-[#E8DED0] font-serif font-bold text-[#43291F] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-center">Qty Added</th>
                    <th className="py-2.5 px-3 text-right">Unit CP</th>
                    <th className="py-2.5 px-3 text-right">Total Cost</th>
                    <th className="py-2.5 px-3">Supplier / Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DED0]">
                  {inwards.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                      <td className="py-2.5 px-3 text-[#705B51] whitespace-nowrap">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="py-2.5 px-3 font-serif font-bold text-[#43291F]">
                        {item.products?.name || "Product"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                          +{item.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#705B51]">
                        {formatCurrency(item.unit_cost || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#43291F]">
                        {formatCurrency(item.total_cost || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-[#705B51]">
                        <div>{item.supplier_name || "Direct Delivery"}</div>
                        {item.invoice_ref && (
                          <div className="text-[10px] text-[#A09289] font-mono">{item.invoice_ref}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {inwards.length === 0 && (
              <div className="py-12 text-center text-[#A09289] px-4">
                <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-serif font-bold text-sm text-[#43291F]">No Stock Inwards Yet</p>
                <p className="text-xs text-[#705B51] mt-0.5">Use the form on the left to receive today&apos;s deliveries.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
