"use client"

import * as React from "react"
import { Search, Plus, Minus, Trash2, ShoppingBag, Receipt, CheckCircle, CreditCard, Banknote, QrCode, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency, generateIdempotencyKey } from "@/lib/utils"
import { completeSaleAction } from "@/lib/actions/billing"
import { ThermalReceipt } from "@/components/receipt/ThermalReceipt"
import { ReceiptData } from "@/lib/print/thermal"

interface CategoryWithProducts {
  id: string
  name: string
  display_order: number
  products: {
    id: string
    name: string
    base_price: number
    is_available: boolean
    is_active: boolean
    track_inventory: boolean
  }[]
}

interface POSTerminalProps {
  categories: CategoryWithProducts[]
  shopName: string
  shopAddress?: string | null
  shopPhone?: string | null
  taxEnabled?: boolean
  taxRate?: number
  taxLabel?: string
  cashierName: string
  paperWidth?: 58 | 80
  printerName?: string | null
  connectionType?: 'browser' | 'qz_tray' | 'network'
}

interface CartLine {
  productId: string
  name: string
  unitPrice: number
  quantity: number
}

export function POSTerminal({
  categories,
  shopName,
  shopAddress,
  shopPhone,
  taxEnabled = false,
  taxRate = 0,
  taxLabel = 'GST',
  cashierName,
  paperWidth = 80,
  printerName,
  connectionType = 'browser',
}: POSTerminalProps) {
  const [selectedCatId, setSelectedCatId] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [cart, setCart] = React.useState<CartLine[]>([])
  const [customerName, setCustomerName] = React.useState("")
  const [customerPhone, setCustomerPhone] = React.useState("")
  const [discountAmount, setDiscountAmount] = React.useState<number>(0)
  const [discountReason, setDiscountReason] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'upi' | 'card' | 'other'>('cash')
  const [amountTendered, setAmountTendered] = React.useState<string>("")
  const [paymentRef, setPaymentRef] = React.useState("")
  const [cardLast4, setCardLast4] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null)

  // Receipt Modal State
  const [completedReceipt, setCompletedReceipt] = React.useState<ReceiptData | null>(null)
  const [showReceiptModal, setShowReceiptModal] = React.useState(false)

  // Filtered products list
  const allProducts = React.useMemo(() => {
    return categories.flatMap((cat) =>
      cat.products.map((p) => ({ ...p, categoryName: cat.name, categoryId: cat.id }))
    )
  }, [categories])

  const displayedProducts = React.useMemo(() => {
    return allProducts.filter((p) => {
      const matchCat = selectedCatId === "all" || p.categoryId === selectedCatId
      const matchQuery =
        searchQuery.trim() === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCat && matchQuery
    })
  }, [allProducts, selectedCatId, searchQuery])

  // Cart operations
  const addToCart = (product: { id: string; name: string; base_price: number; is_available: boolean }) => {
    if (!product.is_available) return

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            unitPrice: Number(product.base_price),
            quantity: 1,
          },
        ]
      }
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta
            return newQty > 0 ? { ...item, quantity: newQty } : null
          }
          return item
        })
        .filter(Boolean) as CartLine[]
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const clearCart = () => {
    setCart([])
    setCustomerName("")
    setCustomerPhone("")
    setDiscountAmount(0)
    setDiscountReason("")
    setAmountTendered("")
    setPaymentRef("")
    setCardLast4("")
    setCheckoutError(null)
  }

  // Totals calculations
  const subtotal = React.useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  }, [cart])

  const effectiveDiscount = Math.min(subtotal, Math.max(0, discountAmount))
  const taxableAmount = Math.max(0, subtotal - effectiveDiscount)

  const taxAmount = React.useMemo(() => {
    if (!taxEnabled || taxRate <= 0) return 0
    return Number(((taxableAmount * taxRate) / 100).toFixed(2))
  }, [taxEnabled, taxRate, taxableAmount])

  const totalAmount = Number((taxableAmount + taxAmount).toFixed(2))

  // Cash change calculation
  const tenderedNum = Number(amountTendered) || 0
  const changeAmount = paymentMethod === 'cash' && tenderedNum > totalAmount ? tenderedNum - totalAmount : 0

  // Submit & Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    setCheckoutError(null)

    const idempotencyKey = generateIdempotencyKey()

    try {
      const payload = {
        shop_id: "", // will be read from user profile on server
        manager_id: "",
        idempotency_key: idempotencyKey,
        items: cart.map((c) => ({
          product_id: c.productId,
          product_name: c.name,
          unit_price: c.unitPrice,
          quantity: c.quantity,
        })),
        subtotal,
        discount_amount: effectiveDiscount,
        discount_reason: effectiveDiscount > 0 ? discountReason || 'Manager discount' : null,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_amount: totalAmount,
        amount_tendered: paymentMethod === 'cash' && tenderedNum > 0 ? tenderedNum : null,
        change_amount: paymentMethod === 'cash' && changeAmount > 0 ? changeAmount : null,
        payment_ref: paymentRef.trim()
          ? paymentRef.trim() + (cardLast4.trim() ? ' | Card:****' + cardLast4.trim() : '')
          : (cardLast4.trim() ? 'Card:****' + cardLast4.trim() : null),
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
      }

      const res = await completeSaleAction(payload)

      if (!res.success || !res.sale) {
        setCheckoutError(res.error || 'Failed to complete sale')
        return
      }

      // Build thermal receipt data
      const now = new Date()
      const receipt: ReceiptData = {
        shopName,
        shopAddress,
        shopPhone,
        invoiceNo: res.invoice_no,
        date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        cashierName,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        items: cart.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.unitPrice * i.quantity,
        })),
        subtotal,
        discountAmount: effectiveDiscount,
        taxEnabled,
        taxRate,
        taxLabel,
        taxAmount,
        totalAmount,
        paymentMethod,
        amountTendered: paymentMethod === 'cash' && tenderedNum > 0 ? tenderedNum : null,
        changeAmount: changeAmount > 0 ? changeAmount : null,
        paymentRef: paymentRef.trim() || null,
        isDuplicate: false,
      }

      setCompletedReceipt(receipt)
      setShowReceiptModal(true)
      clearCart()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setCheckoutError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* ── LEFT: PRODUCT CATALOGUE (lg:col-span-7 xl:col-span-8) ── */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        {/* Search & Categories Bar */}
        <div className="bg-[#FFFDF8] p-3.5 rounded-xl border border-[#E8DED0] shadow-sm flex flex-col gap-3">
          {/* Live Search */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#A09289]" />
            <Input
              type="text"
              placeholder="Search coffee, puffs, fries, sandwich, pasta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#F8F3E9] border-[#E8DED0] h-10 text-sm focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-[#A09289] hover:text-[#43291F]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCatId("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCatId === "all"
                  ? "bg-[#43291F] text-[#FFFDF8] shadow-sm"
                  : "bg-[#F8F3E9] text-[#705B51] hover:bg-[#EFE7DA] border border-[#E8DED0]"
              }`}
            >
              All Items ({allProducts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCatId === cat.id
                    ? "bg-[#43291F] text-[#FFFDF8] shadow-sm"
                    : "bg-[#F8F3E9] text-[#705B51] hover:bg-[#EFE7DA] border border-[#E8DED0]"
                }`}
              >
                {cat.name} ({cat.products.length})
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
          {displayedProducts.map((product) => {
            const inCart = cart.find((i) => i.productId === product.id)
            return (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition-all text-left select-none ${
                  product.is_available
                    ? "bg-[#FFFDF8] border-[#E8DED0] hover:border-[#B56C4A] hover:shadow-md cursor-pointer active:scale-[0.98]"
                    : "bg-[#F0ECE1] border-[#E8DED0] opacity-60 cursor-not-allowed"
                }`}
              >
                {/* Active in-cart indicator badge */}
                {inCart && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#B56C4A] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                    {inCart.quantity}
                  </span>
                )}

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#737B52] font-semibold block mb-1 truncate">
                    {product.categoryName}
                  </span>
                  <h4 className="font-serif font-bold text-sm text-[#43291F] leading-snug line-clamp-2">
                    {product.name}
                  </h4>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E8DED0]/60">
                  <span className="font-serif font-bold text-base text-[#43291F]">
                    {formatCurrency(product.base_price)}
                  </span>
                  {product.is_available ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#F0F1EA] text-[#737B52]">
                      Available
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                      Sold Out
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {displayedProducts.length === 0 && (
          <div className="text-center py-12 bg-[#FFFDF8] rounded-xl border border-[#E8DED0] p-6">
            <ShoppingBag className="w-10 h-10 text-[#A09289] mx-auto mb-2" />
            <h3 className="font-serif text-lg font-bold text-[#43291F]">No Products Found</h3>
            <p className="text-xs text-[#705B51] mt-1">
              Try adjusting your search query or selected category.
            </p>
          </div>
        )}
      </div>

      {/* ── RIGHT: CART & CHECKOUT PANEL (lg:col-span-5 xl:col-span-4) ── */}
      <div className="lg:col-span-5 xl:col-span-4 sticky top-16 flex flex-col gap-3">
        <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-md flex flex-col">
          <CardHeader className="py-3 px-4 border-b border-[#E8DED0] flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#B56C4A]" />
              <CardTitle className="text-base text-[#43291F]">Current Order</CardTitle>
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-xs text-red-700 hover:bg-red-50 h-7 px-2"
              >
                Clear Cart
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-4 flex flex-col gap-3">
            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="text-center py-8 text-[#A09289]">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">Cart is empty</p>
                <p className="text-[11px] text-[#705B51]">Click any product on the left to add</p>
              </div>
            ) : (
              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F8F3E9]/80 border border-[#E8DED0]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-bold text-xs text-[#43291F] truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-[#705B51]">
                        {formatCurrency(item.unitPrice)} each
                      </p>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="w-6 h-6 rounded bg-[#FFFDF8] border border-[#E8DED0] flex items-center justify-center text-[#43291F] hover:bg-[#EFE7DA] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-xs min-w-[18px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="w-6 h-6 rounded bg-[#FFFDF8] border border-[#E8DED0] flex items-center justify-center text-[#43291F] hover:bg-[#EFE7DA] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line subtotal */}
                    <span className="font-serif font-bold text-xs text-[#43291F] min-w-[50px] text-right">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>

                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-[#A09289] hover:text-red-700 ml-1 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Optional Customer Info */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8DED0]">
              <div>
                <label className="text-[10px] font-semibold text-[#705B51] block mb-0.5">
                  Customer Name (Opt)
                </label>
                <Input
                  type="text"
                  placeholder="Walk-in guest"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-8 text-xs bg-[#F8F3E9]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#705B51] block mb-0.5">
                  Phone (Opt)
                </label>
                <Input
                  type="tel"
                  placeholder="Mobile no."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-8 text-xs bg-[#F8F3E9]"
                />
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-1.5 pt-2 border-t border-[#E8DED0] text-xs">
              <div className="flex justify-between text-[#705B51]">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {/* Discount Entry */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#705B51]">Discount (₹)</span>
                <Input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="h-7 w-24 text-right text-xs bg-[#F8F3E9]"
                />
              </div>

              {taxEnabled && (
                <div className="flex justify-between text-[#705B51]">
                  <span>{taxLabel} ({taxRate}%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-[#43291F] pt-1.5 border-t border-[#E8DED0]">
                <span className="font-serif">Final Total</span>
                <span className="font-serif text-lg">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5 pt-2 border-t border-[#E8DED0]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#43291F] block">
                Payment Method
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['cash', 'upi', 'card', 'other'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-1 rounded-lg text-xs font-bold uppercase tracking-wider flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === method
                        ? "bg-[#43291F] text-[#FFFDF8] shadow-sm"
                        : "bg-[#F8F3E9] text-[#705B51] hover:bg-[#EFE7DA] border border-[#E8DED0]"
                    }`}
                  >
                    {method === 'cash' && <Banknote className="w-4 h-4" />}
                    {method === 'upi' && <QrCode className="w-4 h-4" />}
                    {method === 'card' && <CreditCard className="w-4 h-4" />}
                    {method === 'other' && <Receipt className="w-4 h-4" />}
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Tendered & Change Calculator */}
            {paymentMethod === 'cash' && (
              <div className="p-2.5 rounded-lg bg-[#FAF0EB] border border-[#F3DDD2] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[#623723]">
                    Cash Received:
                  </label>
                  <Input
                    type="number"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder={totalAmount.toString()}
                    className="h-8 w-28 text-right font-bold text-xs bg-white"
                  />
                </div>
                {/* Quick denomination pills */}
                <div className="flex gap-1 justify-end">
                  {[50, 100, 200, 500].map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => setAmountTendered(denom.toString())}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-[#E8DED0] hover:bg-[#F8F3E9]"
                    >
                      ₹{denom}
                    </button>
                  ))}
                </div>
                {changeAmount > 0 && (
                  <div className="flex justify-between text-xs font-bold text-emerald-800 pt-1 border-t border-[#E5B9A5]">
                    <span>Change to Return:</span>
                    <span className="font-serif text-sm">₹{changeAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* UPI Reference */}
            {paymentMethod === 'upi' && (
              <div>
                <label className="text-[10px] font-semibold text-[#705B51] block mb-0.5">
                  UPI Reference ID (optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 123456789012"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="h-8 text-xs bg-[#F8F3E9]"
                />
              </div>
            )}

            {/* Card Fields */}
            {paymentMethod === 'card' && (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-semibold text-[#705B51] block mb-0.5">
                    Card Last 4 Digits (optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 4242"
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    className="h-8 text-xs bg-[#F8F3E9]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#705B51] block mb-0.5">
                    Card Reference / Auth Code (optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Authorization code"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="h-8 text-xs bg-[#F8F3E9]"
                  />
                </div>
              </div>
            )}

            {/* Other Reference */}
            {paymentMethod === 'other' && (
              <div>
                <label className="text-[10px] font-semibold text-[#705B51] block mb-0.5">
                  Reference / Note (optional)
                </label>
                <Input
                  type="text"
                  placeholder="Transaction reference or note"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="h-8 text-xs bg-[#F8F3E9]"
                />
              </div>
            )}

            {checkoutError && (
              <p className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200">
                {checkoutError}
              </p>
            )}

            {/* Complete Sale Button */}
            <Button
              onClick={handleCheckout}
              disabled={cart.length === 0 || submitting}
              className="w-full h-12 bg-[#43291F] hover:bg-[#341F17] text-white font-bold text-sm shadow-md mt-1"
            >
              {submitting ? (
                "Processing Transaction..."
              ) : (
                <>
                  Charge {formatCurrency(totalAmount)} & Print
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── RECEIPT MODAL ── */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Bill Generated Successfully
            </DialogTitle>
          </DialogHeader>

          {completedReceipt && (
            <ThermalReceipt
              receipt={completedReceipt}
              paperWidth={paperWidth}
              printerName={printerName}
              connectionType={connectionType}
              onClose={() => setShowReceiptModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
