"use client"

import * as React from "react"
import { Search, Printer, Receipt, Eye, Filter, Download, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ThermalReceipt } from "@/components/receipt/ThermalReceipt"
import { ReceiptData } from "@/lib/print/thermal"

interface AdminSalesHistoryProps {
  initialSales: any[]
  shopName: string
  shopAddress?: string | null
  shopPhone?: string | null
  paperWidth?: 58 | 80
}

export function AdminSalesHistory({
  initialSales,
  shopName,
  shopAddress,
  shopPhone,
  paperWidth = 80,
}: AdminSalesHistoryProps) {
  const [search, setSearch] = React.useState("")
  const [methodFilter, setMethodFilter] = React.useState<string>("all")
  const [selectedSale, setSelectedSale] = React.useState<any | null>(null)
  const [reprintReceipt, setReprintReceipt] = React.useState<ReceiptData | null>(null)
  const [showModal, setShowModal] = React.useState(false)

  const filteredSales = React.useMemo(() => {
    return initialSales.filter((s) => {
      const q = search.toLowerCase()
      const matchSearch =
        !search.trim() ||
        s.invoice_no?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q) ||
        s.customer_phone?.toLowerCase().includes(q) ||
        s.sale_items?.some((i: any) => i.product_name.toLowerCase().includes(q))

      const matchMethod =
        methodFilter === "all" ||
        s.payments?.some((p: any) => p.method.toLowerCase() === methodFilter)

      return matchSearch && matchMethod
    })
  }, [initialSales, search, methodFilter])

  const handleOpenReceipt = (sale: any) => {
    const receipt: ReceiptData = {
      shopName,
      shopAddress,
      shopPhone,
      invoiceNo: sale.invoice_no,
      date: new Date(sale.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: new Date(sale.created_at).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      cashierName: sale.profiles?.full_name || "Manager",
      customerName: sale.customer_name,
      customerPhone: sale.customer_phone,
      items: (sale.sale_items || []).map((item: any) => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        subtotal: Number(item.subtotal),
      })),
      subtotal: Number(sale.subtotal),
      discountAmount: Number(sale.discount_amount),
      taxEnabled: Number(sale.tax_amount) > 0,
      taxAmount: Number(sale.tax_amount),
      totalAmount: Number(sale.total_amount),
      paymentMethod: sale.payments?.[0]?.method || "cash",
      amountTendered: sale.payments?.[0]?.amount_tendered,
      changeAmount: sale.payments?.[0]?.change_amount,
      paymentRef: sale.payments?.[0]?.reference,
      isDuplicate: true,
    }

    setSelectedSale(sale)
    setReprintReceipt(receipt)
    setShowModal(true)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div>
          <h1 className="font-serif text-fluid-h1 font-bold text-[#43291F]">
            Sales &amp; Billing History
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Immutable, audit-verified record of every commercial sale at Heaven&apos;s Cafe
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#A09289]" />
            <Input
              placeholder="Search by bill number, product, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-[#F8F3E9] border-[#E8DED0]"
            />
          </div>

          <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(["all", "cash", "upi", "card"] as const).map((method) => (
              <button
                key={method}
                onClick={() => setMethodFilter(method)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer min-h-[36px] touch-manipulation ${
                  methodFilter === method
                    ? "bg-[#43291F] text-white"
                    : "bg-[#F8F3E9] text-[#705B51] hover:bg-[#EFE7DA] border border-[#E8DED0]"
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Sales Invoices Table / Mobile Cards */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden min-w-0">
        {/* Mobile Card List (< md) */}
        <div className="block md:hidden divide-y divide-[#E8DED0]">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="p-3.5 space-y-2 hover:bg-[#F8F3E9]/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-sm text-[#43291F]">
                      {sale.invoice_no}
                    </span>
                    <Badge variant="secondary" className="capitalize text-[10px]">
                      {sale.payments?.[0]?.method || "cash"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#705B51] mt-0.5">
                    <Clock className="w-3 h-3 text-[#A09289]" />
                    <span>{formatDateTime(sale.created_at)}</span>
                    <span className="text-[#A09289]">• Cashier: {sale.profiles?.full_name || "Manager"}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-serif font-black text-base text-[#43291F]">
                    {formatCurrency(sale.total_amount)}
                  </span>
                </div>
              </div>

              {/* Items summary */}
              <p className="text-xs text-[#705B51] line-clamp-2">
                {sale.sale_items?.map((i: any) => `${i.product_name} (${i.quantity})`).join(", ")}
              </p>

              {/* Customer & View Receipt */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8DED0]/60">
                <span className="text-[#A09289]">
                  {sale.customer_name ? (
                    <strong className="text-[#43291F] font-normal">{sale.customer_name}</strong>
                  ) : (
                    "Walk-in"
                  )}
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenReceipt(sale)}
                  className="h-8 text-xs font-semibold border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F] touch-manipulation"
                >
                  <Eye className="w-3.5 h-3.5 mr-1 text-[#B56C4A]" />
                  View Bill
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Line Items</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED0]">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#43291F]">
                    {sale.invoice_no}
                  </td>
                  <td className="py-3.5 px-4 text-[#705B51]">
                    {formatDateTime(sale.created_at)}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#43291F]">
                    {sale.profiles?.full_name || "Manager"}
                  </td>
                  <td className="py-3.5 px-4">
                    {sale.customer_name ? (
                      <div>
                        <span className="font-semibold text-[#43291F] block">{sale.customer_name}</span>
                        {sale.customer_phone && (
                          <span className="text-[11px] text-[#A09289] block">{sale.customer_phone}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#A09289] italic">Walk-in</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 max-w-xs truncate">
                    <span className="text-[#705B51]">
                      {sale.sale_items?.map((i: any) => `${i.product_name} (${i.quantity})`).join(", ")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="secondary" className="capitalize text-[10px]">
                      {sale.payments?.[0]?.method || "cash"}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right font-serif font-bold text-sm text-[#43291F]">
                    {formatCurrency(sale.total_amount)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReceipt(sale)}
                      className="h-7 text-xs border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F]"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1 text-[#B56C4A]" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSales.length === 0 && (
          <div className="py-14 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-[#FAF0EB] text-[#B56C4A] mx-auto flex items-center justify-center mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="font-serif font-bold text-base text-[#43291F]">
              {search || methodFilter !== "all" ? "No sales match your search" : "No Commercial Sales Recorded Yet"}
            </p>
            <p className="text-xs text-[#705B51] mt-1 max-w-sm mx-auto">
              {search || methodFilter !== "all"
                ? "Try clearing filters to see all completed transactions."
                : "Real-time orders processed at the store POS counter will automatically populate this audit register."}
            </p>
          </div>
        )}
      </Card>

      {/* Invoice Detail Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md w-full max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#43291F] font-serif">
              <Receipt className="w-5 h-5 text-[#B56C4A]" />
              Invoice Snapshot: {selectedSale?.invoice_no}
            </DialogTitle>
          </DialogHeader>

          {reprintReceipt && (
            <ThermalReceipt
              receipt={reprintReceipt}
              paperWidth={paperWidth}
              onClose={() => setShowModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
