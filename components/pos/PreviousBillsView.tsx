"use client"

import * as React from "react"
import { Search, Printer, Receipt, Eye, RefreshCw, Calendar, User, Phone, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ThermalReceipt } from "@/components/receipt/ThermalReceipt"
import { ReceiptData } from "@/lib/print/thermal"

interface PreviousBillsViewProps {
  initialSales: any[]
  shopName: string
  shopAddress?: string | null
  shopPhone?: string | null
  paperWidth?: 58 | 80
  printerName?: string | null
  connectionType?: "browser" | "qz_tray" | "network"
}

export function PreviousBillsView({
  initialSales,
  shopName,
  shopAddress,
  shopPhone,
  paperWidth = 80,
  printerName,
  connectionType = "browser",
}: PreviousBillsViewProps) {
  const [search, setSearch] = React.useState("")
  const [selectedSale, setSelectedSale] = React.useState<any | null>(null)
  const [reprintReceipt, setReprintReceipt] = React.useState<ReceiptData | null>(null)
  const [showModal, setShowModal] = React.useState(false)

  const filteredSales = React.useMemo(() => {
    if (!search.trim()) return initialSales
    const q = search.toLowerCase()
    return initialSales.filter(
      (s) =>
        s.invoice_no?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q) ||
        s.customer_phone?.toLowerCase().includes(q) ||
        s.payments?.some((p: any) => p.method.toLowerCase().includes(q))
    )
  }, [initialSales, search])

  const handleOpenReprint = (sale: any) => {
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
      isDuplicate: true, // Marked as reprint / duplicate
    }

    setSelectedSale(sale)
    setReprintReceipt(receipt)
    setShowModal(true)
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto w-full min-w-0">
      {/* Page Title & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div>
          <h2 className="font-serif text-fluid-h2 font-bold text-[#43291F]">
            Previous Bills &amp; Reprinting
          </h2>
          <p className="text-xs text-[#705B51] mt-0.5">
            Instant search and reprint recent sales receipts for Heaven&apos;s Cafe
          </p>
        </div>

        {/* Quick Search Input */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#A09289]" />
          <Input
            type="text"
            placeholder="Search invoice, phone, guest..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs bg-[#FFFDF8] border-[#E8DED0]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-xs text-[#705B51] hover:text-[#43291F] p-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden min-w-0">
        {/* ── MOBILE CARD LIST (< md) ── */}
        <div className="block md:hidden divide-y divide-[#E8DED0]">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="p-3.5 space-y-2.5 hover:bg-[#F8F3E9]/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-sm text-[#43291F]">
                      {sale.invoice_no}
                    </span>
                    <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">
                      {sale.payments?.[0]?.method || "cash"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#705B51] mt-0.5">
                    <Clock className="w-3 h-3 text-[#A09289]" />
                    <span>{formatDateTime(sale.created_at)}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <span className="font-serif font-black text-base text-[#43291F]">
                    {formatCurrency(sale.total_amount)}
                  </span>
                  <span className="block text-[10px] text-[#705B51]">
                    {sale.sale_items?.length || 0} item{sale.sale_items?.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Customer info & Action row */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E8DED0]/60">
                <div className="text-xs text-[#705B51] truncate">
                  {sale.customer_name ? (
                    <span className="font-medium text-[#43291F]">
                      {sale.customer_name} {sale.customer_phone && `(${sale.customer_phone})`}
                    </span>
                  ) : (
                    <span className="text-[#A09289] italic">Walk-in Customer</span>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenReprint(sale)}
                  className="h-9 px-3 text-xs font-bold border-[#E8DED0] bg-[#FFFDF8] hover:bg-[#F8F3E9] text-[#43291F] shrink-0 touch-manipulation"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5 text-[#B56C4A]" />
                  Reprint
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* ── DESKTOP & TABLET DATA TABLE (>= md) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED0]">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#43291F]">
                    {sale.invoice_no}
                  </td>
                  <td className="py-3 px-4 text-[#705B51] whitespace-nowrap">
                    {formatDateTime(sale.created_at)}
                  </td>
                  <td className="py-3 px-4">
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
                  <td className="py-3 px-4 text-[#705B51]">
                    {sale.sale_items?.length || 0} items
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className="capitalize text-[10px]">
                      {sale.payments?.[0]?.method || "cash"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-serif font-bold text-sm text-[#43291F]">
                    {formatCurrency(sale.total_amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReprint(sale)}
                      className="h-8 text-xs font-semibold border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F]"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1 text-[#B56C4A]" />
                      Reprint
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredSales.length === 0 && (
          <div className="py-14 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#FAF0EB] text-[#B56C4A] mx-auto flex items-center justify-center mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="font-serif font-bold text-base text-[#43291F]">
              {search ? "No bills match your search" : "No Previous Bills Yet"}
            </p>
            <p className="text-xs text-[#705B51] mt-1 max-w-sm mx-auto">
              {search
                ? "Try searching by invoice number, customer name, or payment method."
                : "Transactions completed at the POS counter will appear here immediately for quick receipt reprint and customer auditing."}
            </p>
          </div>
        )}
      </Card>

      {/* Reprint Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md w-full max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#43291F] font-serif">
              <Printer className="w-5 h-5 text-[#B56C4A]" />
              Reprint Bill ({selectedSale?.invoice_no})
            </DialogTitle>
          </DialogHeader>

          {reprintReceipt && (
            <ThermalReceipt
              receipt={reprintReceipt}
              paperWidth={paperWidth}
              printerName={printerName}
              connectionType={connectionType}
              onClose={() => setShowModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
