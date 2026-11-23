"use client"

import * as React from "react"
import { Search, Printer, Receipt, Eye, RefreshCw, Calendar, User, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ThermalReceipt } from "@/components/receipt/ThermalReceipt"
import { ReceiptData } from "@/lib/print/thermal"
import { Sale } from "@/types/database"

interface PreviousBillsViewProps {
  initialSales: any[]
  shopName: string
  shopAddress?: string | null
  shopPhone?: string | null
  paperWidth?: 58 | 80
  printerName?: string | null
  connectionType?: 'browser' | 'qz_tray' | 'network'
}

export function PreviousBillsView({
  initialSales,
  shopName,
  shopAddress,
  shopPhone,
  paperWidth = 80,
  printerName,
  connectionType = 'browser',
}: PreviousBillsViewProps) {
  const [search, setSearch] = React.useState("")
  const [selectedSale, setSelectedSale] = React.useState<any | null>(null)
  const [reprintReceipt, setReprintReceipt] = React.useState<ReceiptData | null>(null)
  const [showModal, setShowModal] = React.useState(false)

  const filteredSales = React.useMemo(() => {
    if (!search.trim()) return initialSales
    const q = search.toLowerCase()
    return initialSales.filter((s) =>
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
      date: new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#43291F]">
            Previous Bills & Reprinting
          </h2>
          <p className="text-xs text-[#705B51]">
            View and reprint recent sales receipts for Heaven&apos;s Cafe
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#A09289]" />
          <Input
            type="text"
            placeholder="Search invoice, phone, guest..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-[#FFFDF8]"
          />
        </div>
      </div>

      {/* Bills Table Card */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date & Time</th>
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
                  <td className="py-3 px-4 text-[#705B51]">
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
                      className="h-7 text-xs border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F]"
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

        {filteredSales.length === 0 && (
          <div className="py-14 text-center">
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#43291F]">
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
