"use client"

import * as React from "react"
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Zap,
  RotateCcw,
  AlertTriangle,
  User,
  Phone,
  Loader2,
  UtensilsCrossed,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, generateIdempotencyKey } from "@/lib/utils"
import { fastCheckoutAction } from "@/lib/actions/billing"
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
    cost_price?: number
    current_stock?: number
    min_stock?: number
    is_available: boolean
    is_active: boolean
    track_stock?: boolean
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
  connectionType?: "browser" | "qz_tray" | "network"
}

interface CartLine {
  productId: string
  name: string
  unitPrice: number
  costPrice: number
  quantity: number
}

export function POSTerminal({
  categories,
  shopName,
  shopAddress,
  shopPhone,
  taxEnabled = false,
  taxRate = 0,
  taxLabel = "GST",
  cashierName,
  paperWidth = 80,
}: POSTerminalProps) {
  const [selectedCatId, setSelectedCatId] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [cart, setCart] = React.useState<CartLine[]>([])
  const [customerName, setCustomerName] = React.useState("")
  const [customerPhone, setCustomerPhone] = React.useState("")
  const [discountAmount, setDiscountAmount] = React.useState<number>(0)
  const [discountReason, setDiscountReason] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "upi" | "card">("cash")
  const [amountTendered, setAmountTendered] = React.useState<string>("")
  const [paymentRef, setPaymentRef] = React.useState("")
  const [cardLast4, setCardLast4] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null)
  const [mobileView, setMobileView] = React.useState<"menu" | "cart">("menu")

  // Receipt Modal State
  const [completedReceipt, setCompletedReceipt] = React.useState<ReceiptData | null>(null)
  const [showReceiptModal, setShowReceiptModal] = React.useState(false)

  // Flattened products
  const allProducts = React.useMemo(() => {
    return categories.flatMap((cat) =>
      cat.products.map((p) => ({
        ...p,
        categoryName: cat.name,
        categoryId: cat.id,
      }))
    )
  }, [categories])

  const displayedProducts = React.useMemo(() => {
    return allProducts.filter((p) => {
      const matchCat = selectedCatId === "all" || p.categoryId === selectedCatId
      const matchQuery =
        searchQuery.trim() === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCat && matchQuery && p.is_active
    })
  }, [allProducts, selectedCatId, searchQuery])

  // Cart operations (Instant in-memory updates)
  const addToCart = (product: {
    id: string
    name: string
    base_price: number
    cost_price?: number
    is_available: boolean
  }) => {
    if (!product.is_available) return

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            unitPrice: Number(product.base_price),
            costPrice: Number(product.cost_price || 0),
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

  const totalItemsCount = React.useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  const effectiveDiscount = Math.min(subtotal, Math.max(0, discountAmount))
  const taxableAmount = Math.max(0, subtotal - effectiveDiscount)

  const taxAmount = React.useMemo(() => {
    if (!taxEnabled || taxRate <= 0) return 0
    return Number(((taxableAmount * taxRate) / 100).toFixed(2))
  }, [taxEnabled, taxRate, taxableAmount])

  const totalAmount = Number((taxableAmount + taxAmount).toFixed(2))

  const tenderedNum = Number(amountTendered) || 0
  const changeAmount = paymentMethod === "cash" && tenderedNum > totalAmount ? tenderedNum - totalAmount : 0

  // High-Speed Single RPC Checkout (<50ms execution)
  const handleCheckout = async () => {
    if (cart.length === 0 || submitting) return
    setSubmitting(true)
    setCheckoutError(null)

    const idempotencyKey = generateIdempotencyKey()

    try {
      const payload = {
        idempotency_key: idempotencyKey,
        items: cart.map((c) => ({
          product_id: c.productId,
          product_name: c.name,
          unit_price: c.unitPrice,
          cost_price: c.costPrice,
          quantity: c.quantity,
        })),
        subtotal,
        discount_amount: effectiveDiscount,
        discount_reason: effectiveDiscount > 0 ? discountReason || "Cashier discount" : null,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        amount_tendered: paymentMethod === "cash" && tenderedNum > 0 ? tenderedNum : null,
        change_amount: changeAmount > 0 ? changeAmount : null,
        payment_ref: paymentRef.trim() || null,
        card_last4: cardLast4.trim() || null,
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
      }

      const res = await fastCheckoutAction(payload)

      if (!res.success || !res.sale_id) {
        setCheckoutError(res.error || "Failed to complete checkout")
        return
      }

      // Build thermal receipt data immediately
      const now = new Date()
      const receipt: ReceiptData = {
        shopName,
        shopAddress,
        shopPhone,
        invoiceNo: res.invoice_no,
        date: now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
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
        amountTendered: paymentMethod === "cash" && tenderedNum > 0 ? tenderedNum : null,
        changeAmount: changeAmount > 0 ? changeAmount : null,
        paymentRef: paymentRef.trim() || null,
        isDuplicate: false,
      }

      setCompletedReceipt(receipt)
      setShowReceiptModal(true)
      clearCart()
      setMobileView("menu")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setCheckoutError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col md:grid md:grid-cols-12 gap-3 min-h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-5.5rem)] overflow-hidden">
      {/* ── MOBILE VIEW TOGGLE SWITCHER (< md) ── */}
      <div className="flex md:hidden bg-[#EFE7DA] p-1 rounded-xl border border-[#E8DED0] shrink-0">
        <button
          type="button"
          onClick={() => setMobileView("menu")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 touch-manipulation min-h-[38px] ${
            mobileView === "menu"
              ? "bg-[#43291F] text-white shadow-xs"
              : "text-[#705B51] hover:text-[#43291F]"
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Menu ({allProducts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView("cart")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 touch-manipulation min-h-[38px] ${
            mobileView === "cart"
              ? "bg-[#43291F] text-white shadow-xs"
              : "text-[#705B51] hover:text-[#43291F]"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Active Bill ({totalItemsCount})</span>
          {totalAmount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#B56C4A] text-white text-[10px] font-mono">
              {formatCurrency(totalAmount)}
            </span>
          )}
        </button>
      </div>

      {/* ── LEFT COLUMN: PRODUCTS & MENU (Tablet: 7 cols, Desktop: 8 cols) ── */}
      <div
        className={`md:col-span-7 lg:col-span-8 flex flex-col h-full overflow-hidden bg-[#FFFDF8] rounded-xl border border-[#E8DED0] p-2.5 sm:p-3 shadow-sm min-w-0 ${
          mobileView === "cart" ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Top Controls: Search & Category Pills */}
        <div className="space-y-2.5 pb-2.5 border-b border-[#E8DED0] shrink-0">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#705B51]" />
            <Input
              placeholder="Search coffee, puffs, burgers, fries, mojitos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-[#F8F3E9] border-[#E8DED0] focus-visible:ring-[#43291F]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-[#705B51] hover:text-[#43291F] p-1"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Pills (Horizontal Touch-Scroll for Tablets) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[#D8CEBE]">
            <button
              onClick={() => setSelectedCatId("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer min-h-[36px] ${
                selectedCatId === "all"
                  ? "bg-[#43291F] text-white shadow-sm"
                  : "bg-[#F8F3E9] text-[#705B51] hover:bg-[#EFE7DA]"
              }`}
            >
              All Items ({allProducts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[36px] ${
                  selectedCatId === cat.id
                    ? "bg-[#43291F] text-white shadow-sm"
                    : "bg-[#F8F3E9] text-[#705B51] hover:bg-[#EFE7DA]"
                }`}
              >
                {cat.name} ({cat.products.length})
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid (Fast touch tap) */}
        <div className="flex-1 overflow-y-auto pt-2.5 pr-1 pb-16 md:pb-2 scrollbar-thin min-w-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-2.5">
            {displayedProducts.map((p) => {
              const inCart = cart.find((c) => c.productId === p.id)
              const stock = p.current_stock ?? 50
              const isLowStock = p.track_stock && stock <= (p.min_stock ?? 10)
              const isOutOfStock = p.track_stock && stock <= 0

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!p.is_available || isOutOfStock}
                  onClick={() => addToCart(p)}
                  className={`group relative flex flex-col justify-between p-2.5 sm:p-3 rounded-xl border text-left transition-all select-none active:scale-95 cursor-pointer min-h-[92px] touch-manipulation ${
                    inCart
                      ? "bg-[#F5EFE6] border-[#43291F] shadow-sm ring-1 ring-[#43291F]"
                      : "bg-[#FFFDF8] border-[#E8DED0] hover:border-[#B56C4A] hover:shadow-sm"
                  } ${!p.is_available || isOutOfStock ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {/* Item Name & Category */}
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[#737B52] tracking-wider block truncate">
                      {p.categoryName}
                    </span>
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-[#43291F] leading-snug line-clamp-2 mt-0.5">
                      {p.name}
                    </h4>
                  </div>

                  {/* Price & Stock Status */}
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#E8DED0]/60 min-w-0">
                    <span className="font-bold text-xs sm:text-sm text-[#43291F]">
                      {formatCurrency(p.base_price)}
                    </span>

                    {/* Quantity or Stock badge */}
                    {inCart ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#43291F] text-white text-[10px] sm:text-xs font-bold shadow-xs">
                        {inCart.quantity} in bill
                      </span>
                    ) : isOutOfStock ? (
                      <span className="text-[9px] sm:text-[10px] text-red-600 font-bold">Out</span>
                    ) : isLowStock ? (
                      <span className="text-[9px] sm:text-[10px] text-amber-700 font-semibold bg-amber-100 px-1 rounded">
                        {stock} left
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] text-[#A09289]">
                        {stock}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {displayedProducts.length === 0 && (
            <div className="py-16 text-center text-[#705B51]">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-serif font-bold text-sm">No items matching &quot;{searchQuery}&quot;</p>
              <p className="text-xs text-[#A09289] mt-1">Try another keyword or select a different category.</p>
            </div>
          )}
        </div>

        {/* Floating Mobile Sticky Cart Bar (< md) when items are selected */}
        {cart.length > 0 && mobileView === "menu" && (
          <div className="md:hidden fixed bottom-3 left-3 right-3 z-30 animate-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={() => setMobileView("cart")}
              className="w-full bg-[#43291F] text-white p-3.5 rounded-xl shadow-xl flex items-center justify-between font-bold text-sm border border-[#E8DED0] active:scale-98 transition-transform"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#B56C4A] text-white text-xs flex items-center justify-center">
                  {totalItemsCount}
                </span>
                <span className="font-serif">Current Bill</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-base">{formatCurrency(totalAmount)}</span>
                <span className="text-xs font-normal text-[#FAF0EB] bg-[#341F17] px-2 py-1 rounded-md">
                  Review &amp; Pay &rarr;
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT COLUMN: ACTIVE ORDER & 1-TAP CHARGE (Tablet: 5 cols, Desktop: 4 cols) ── */}
      <div
        className={`md:col-span-5 lg:col-span-4 flex flex-col h-full bg-[#FFFDF8] rounded-xl border border-[#E8DED0] shadow-sm p-3 sm:p-3.5 overflow-hidden min-w-0 ${
          mobileView === "menu" ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#E8DED0] shrink-0">
          <div>
            <div className="flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#B56C4A]" />
              <h3 className="font-serif font-bold text-sm text-[#43291F]">Active Bill</h3>
            </div>
            <span className="text-[10px] text-[#705B51]">
              {totalItemsCount} item{totalItemsCount !== 1 ? "s" : ""} selected
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] text-red-700 hover:text-red-900 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Cart Line Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1.5 scrollbar-thin">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="flex items-center justify-between p-2 rounded-lg bg-[#F8F3E9]/70 border border-[#E8DED0]"
            >
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-bold text-[#43291F] truncate">{item.name}</p>
                <p className="text-[10px] text-[#705B51]">
                  {formatCurrency(item.unitPrice)} × {item.quantity} ={" "}
                  <strong className="text-[#43291F]">{formatCurrency(item.unitPrice * item.quantity)}</strong>
                </p>
              </div>

              {/* Quantity Adjusters with Touch Target Optimization */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.productId, -1)}
                  className="w-8 h-8 rounded-lg bg-white border border-[#E8DED0] text-[#43291F] font-bold text-sm flex items-center justify-center hover:bg-[#EFE7DA] active:scale-90 touch-manipulation shadow-2xs"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-7 text-center text-xs font-black text-[#43291F] font-mono">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.productId, 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-[#E8DED0] text-[#43291F] font-bold text-sm flex items-center justify-center hover:bg-[#EFE7DA] active:scale-90 touch-manipulation shadow-2xs"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  className="w-8 h-8 rounded-lg text-[#A09289] hover:text-red-700 hover:bg-red-50 flex items-center justify-center ml-0.5 touch-manipulation transition-colors"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="py-12 text-center text-[#A09289]">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#B56C4A]" />
              <p className="font-serif font-bold text-xs text-[#43291F]">Cart is Empty</p>
              <p className="text-[11px] text-[#705B51] mt-0.5">
                Tap items on the left to add them to this bill.
              </p>
            </div>
          )}
        </div>

        {/* Totals & Payment Section (Always visible on tablet) */}
        <div className="border-t border-[#E8DED0] pt-2.5 space-y-2 shrink-0">
          {/* Subtotal & Discount row */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[#705B51]">
              <span>Subtotal:</span>
              <span className="font-semibold text-[#43291F]">{formatCurrency(subtotal)}</span>
            </div>

            {effectiveDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount:</span>
                <span>-{formatCurrency(effectiveDiscount)}</span>
              </div>
            )}

            {taxEnabled && taxAmount > 0 && (
              <div className="flex justify-between text-[#705B51]">
                <span>{taxLabel} ({taxRate}%):</span>
                <span>+{formatCurrency(taxAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold text-[#43291F] pt-1 border-t border-[#E8DED0]">
              <span className="font-serif text-base">Total to Pay:</span>
              <span className="font-serif text-lg text-[#43291F] font-black">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector (Big 1-Tap Buttons) */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`min-h-[44px] py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer touch-manipulation ${
                paymentMethod === "cash"
                  ? "bg-[#43291F] text-white shadow-sm ring-1 ring-[#43291F]"
                  : "bg-[#F8F3E9] text-[#705B51] hover:bg-[#EFE7DA]"
              }`}
            >
              <Banknote className="w-4 h-4" />
              Cash
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("upi")}
              className={`min-h-[44px] py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer touch-manipulation ${
                paymentMethod === "upi"
                  ? "bg-[#737B52] text-white shadow-sm ring-1 ring-[#737B52]"
                  : "bg-[#F8F3E9] text-[#705B51] hover:bg-[#EFE7DA]"
              }`}
            >
              <QrCode className="w-4 h-4" />
              UPI / QR
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`min-h-[44px] py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer touch-manipulation ${
                paymentMethod === "card"
                  ? "bg-[#B56C4A] text-white shadow-sm ring-1 ring-[#B56C4A]"
                  : "bg-[#F8F3E9] text-[#705B51] hover:bg-[#EFE7DA]"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Card
            </button>
          </div>

          {/* Quick Details for Payment Mode */}
          {paymentMethod === "cash" && totalAmount > 0 && (
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-[#705B51] whitespace-nowrap">Tender:</span>
              <Input
                type="number"
                placeholder={`₹${totalAmount}`}
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                className="h-7 text-xs font-bold"
              />
              {changeAmount > 0 && (
                <span className="text-[11px] font-bold text-emerald-700 whitespace-nowrap">
                  Change: {formatCurrency(changeAmount)}
                </span>
              )}
            </div>
          )}

          {paymentMethod === "upi" && (
            <div className="pt-1">
              <Input
                placeholder="UPI Ref / Txn ID (Optional)"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="pt-1">
              <Input
                placeholder="Card Last 4 Digits (Optional)"
                maxLength={4}
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ""))}
                className="h-7 text-xs"
              />
            </div>
          )}

          {checkoutError && (
            <p className="text-[11px] text-red-600 font-semibold">{checkoutError}</p>
          )}

          {/* Big Action Checkout Button (<100ms reaction) */}
          <Button
            type="button"
            disabled={cart.length === 0 || submitting}
            onClick={handleCheckout}
            className="w-full h-11 bg-[#43291F] hover:bg-[#341F17] text-white font-bold text-sm tracking-wide shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#FAF0EB]" />
                <span>Processing Bill...</span>
              </>
            ) : (
              `Charge ${formatCurrency(totalAmount)} & Print`
            )}
          </Button>
        </div>
      </div>

      {/* ── THERMAL RECEIPT DIALOG ── */}
      {showReceiptModal && completedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-[#FFFDF8] rounded-2xl max-w-sm w-full max-h-[92dvh] flex flex-col p-4 sm:p-5 border border-[#E8DED0] shadow-2xl space-y-3 sm:space-y-4 overflow-hidden">
            <div className="text-center space-y-1 shrink-0">
              <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-1.5 font-bold">
                ✓
              </span>
              <h3 className="font-serif font-bold text-lg text-[#43291F]">Bill Completed!</h3>
              <p className="text-xs text-[#705B51]">
                Invoice: <strong className="font-mono text-[#43291F]">{completedReceipt.invoiceNo}</strong>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 bg-white rounded-lg border border-[#E8DED0] text-xs font-mono max-h-[50dvh]">
              <ThermalReceipt receipt={completedReceipt} paperWidth={paperWidth} />
            </div>

            <div className="flex gap-2 shrink-0 pt-1">
              <Button
                variant="outline"
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 text-xs h-10 border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F]"
              >
                Close (New Order)
              </Button>
              <Button
                onClick={() => {
                  window.print()
                  setShowReceiptModal(false)
                }}
                className="flex-1 bg-[#43291F] hover:bg-[#341F17] text-white text-xs font-bold h-10 shadow-xs"
              >
                Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
