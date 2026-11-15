"use client"

import * as React from "react"
import { Settings, Printer, Store, ShieldCheck, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateShopSettingsAction, updatePrinterSettingsAction } from "@/lib/actions/settings"
import { ThermalReceipt } from "@/components/receipt/ThermalReceipt"
import { ReceiptData } from "@/lib/print/thermal"

interface AdminSettingsFormProps {
  shop: any
  shopSettings: any
  printerSettings: any
}

export function AdminSettingsForm({
  shop,
  shopSettings,
  printerSettings,
}: AdminSettingsFormProps) {
  const [shopMsg, setShopMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const [printerMsg, setPrinterMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const [loadingShop, setLoadingShop] = React.useState(false)
  const [loadingPrinter, setLoadingPrinter] = React.useState(false)

  // Test Print receipt state
  const [showTestReceipt, setShowTestReceipt] = React.useState(false)
  const [paperWidthState, setPaperWidthState] = React.useState<58 | 80>(
    printerSettings?.paper_width === 58 ? 58 : 80
  )

  const testReceiptData: ReceiptData = {
    shopName: shop?.name || "Heaven's Cafe",
    shopAddress: shop?.address || "Main Road, Opp. Central Park",
    shopPhone: shop?.phone || "+91 9876543210",
    invoiceNo: `${shopSettings?.invoice_prefix || "HCF"}-20261115-0001`,
    date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
    cashierName: "Store Manager",
    customerName: "Test Customer",
    customerPhone: "9876500000",
    items: [
      { name: "Tea", quantity: 2, unitPrice: 15.00, subtotal: 30.00 },
      { name: "Coffee", quantity: 1, unitPrice: 20.00, subtotal: 20.00 },
      { name: "Veg Puffs", quantity: 2, unitPrice: 15.00, subtotal: 30.00 },
    ],
    subtotal: 80.00,
    discountAmount: 0.00,
    taxEnabled: shopSettings?.tax_enabled || false,
    taxRate: Number(shopSettings?.tax_rate || 0),
    taxLabel: shopSettings?.tax_label || "GST",
    taxAmount: shopSettings?.tax_enabled ? Number(((80 * Number(shopSettings.tax_rate || 0)) / 100).toFixed(2)) : 0,
    totalAmount: shopSettings?.tax_enabled ? 80 + Number(((80 * Number(shopSettings.tax_rate || 0)) / 100).toFixed(2)) : 80.00,
    paymentMethod: "cash",
    amountTendered: 100.00,
    changeAmount: 20.00,
    isDuplicate: false,
    footerLines: ["Thank you for visiting!", "Visit us again!"],
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#43291F]">
          Business & Thermal Printer Configuration
        </h1>
        <p className="text-xs text-[#705B51] mt-0.5">
          Configure cafe address, tax rules, invoice sequencing and physical thermal receipt printers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* ── SECTION 1: BUSINESS SETTINGS ── */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
          <CardHeader className="border-b border-[#E8DED0] pb-3">
            <CardTitle className="text-base text-[#43291F] flex items-center gap-2">
              <Store className="w-5 h-5 text-[#B56C4A]" />
              Store Information & Tax Settings
            </CardTitle>
            <CardDescription>
              Details printed at the header of customer sales bills
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {shopMsg && (
              <Alert variant={shopMsg.type === "success" ? "olive" : "destructive"} className="mb-4">
                <AlertDescription>{shopMsg.text}</AlertDescription>
              </Alert>
            )}

            <form
              action={async (formData) => {
                setLoadingShop(true)
                const res = await updateShopSettingsAction(formData)
                setLoadingShop(false)
                if (res.success) {
                  setShopMsg({ type: "success", text: "Store settings saved successfully." })
                } else {
                  setShopMsg({ type: "error", text: res.error || "Failed to save settings." })
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="shop_name">Cafe Business Name *</Label>
                <Input
                  id="shop_name"
                  name="shop_name"
                  defaultValue={shop?.name || "Heaven's Cafe"}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Address (Printed on Bills)</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={shop?.address || ""}
                  placeholder="e.g. Shop #4, Cafe Boulevard, City"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={shop?.phone || ""}
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invoice_prefix">Invoice Prefix *</Label>
                <Input
                  id="invoice_prefix"
                  name="invoice_prefix"
                  defaultValue={shopSettings?.invoice_prefix || "HCF"}
                  maxLength={6}
                  required
                />
                <p className="text-[10px] text-[#A09289]">
                  Bill format will be: <span className="font-mono font-bold">{shopSettings?.invoice_prefix || "HCF"}-YYYYMMDD-XXXX</span>
                </p>
              </div>

              {/* Tax Settings */}
              <div className="p-3 rounded-lg bg-[#F8F3E9] border border-[#E8DED0] space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tax_enabled"
                    name="tax_enabled"
                    value="true"
                    defaultChecked={shopSettings?.tax_enabled}
                    className="rounded text-[#43291F]"
                  />
                  <Label htmlFor="tax_enabled" className="text-xs font-bold cursor-pointer">
                    Enable Sales Tax / GST Calculation
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <Label htmlFor="tax_label" className="text-[10px]">Tax Label</Label>
                    <Input
                      id="tax_label"
                      name="tax_label"
                      defaultValue={shopSettings?.tax_label || "GST"}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax_rate" className="text-[10px]">Tax Rate (%)</Label>
                    <Input
                      id="tax_rate"
                      name="tax_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={shopSettings?.tax_rate || 0}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loadingShop}
                className="w-full h-11 bg-[#43291F] hover:bg-[#341F17] text-white font-bold"
              >
                {loadingShop ? "Saving Settings..." : "Save Store Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── SECTION 2: THERMAL PRINTER SETTINGS ── */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm">
          <CardHeader className="border-b border-[#E8DED0] pb-3">
            <CardTitle className="text-base text-[#43291F] flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#737B52]" />
              Thermal Receipt Printer Setup
            </CardTitle>
            <CardDescription>
              Supports 58mm and 80mm thermal printers via Browser or QZ Tray ESC/POS
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {printerMsg && (
              <Alert variant={printerMsg.type === "success" ? "olive" : "destructive"} className="mb-4">
                <AlertDescription>{printerMsg.text}</AlertDescription>
              </Alert>
            )}

            <form
              action={async (formData) => {
                setLoadingPrinter(true)
                const res = await updatePrinterSettingsAction(formData)
                setLoadingPrinter(false)
                if (res.success) {
                  setPrinterMsg({ type: "success", text: "Thermal printer configuration updated." })
                } else {
                  setPrinterMsg({ type: "error", text: res.error || "Failed to save printer settings." })
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="paper_width">Thermal Paper Width *</Label>
                <Select
                  id="paper_width"
                  name="paper_width"
                  defaultValue={printerSettings?.paper_width || 80}
                  onChange={(e) => setPaperWidthState(Number(e.target.value) as 58 | 80)}
                >
                  <option value="80">80mm Paper Width (Standard POS - 44 cols)</option>
                  <option value="58">58mm Paper Width (Compact Thermal - 32 cols)</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="connection_type">Print Bridge Protocol *</Label>
                <Select
                  id="connection_type"
                  name="connection_type"
                  defaultValue={printerSettings?.connection_type || "browser"}
                >
                  <option value="browser">Browser Print (Universal CSS Fallback)</option>
                  <option value="qz_tray">QZ Tray Bridge (Silent Direct ESC/POS)</option>
                  <option value="network">Network / IP LAN Thermal Printer</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="printer_name">Printer Name (As recognized in OS)</Label>
                <Input
                  id="printer_name"
                  name="printer_name"
                  defaultValue={printerSettings?.printer_name || ""}
                  placeholder="e.g. POS-80C or EPSON TM-T88VI"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="printer_ip">Printer IP (Network)</Label>
                  <Input
                    id="printer_ip"
                    name="printer_ip"
                    defaultValue={printerSettings?.printer_ip || ""}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="printer_port">Port</Label>
                  <Input
                    id="printer_port"
                    name="printer_port"
                    defaultValue={printerSettings?.printer_port || 9100}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={loadingPrinter}
                  className="flex-1 h-11 bg-[#737B52] hover:bg-[#606742] text-white font-bold"
                >
                  {loadingPrinter ? "Saving..." : "Save Printer Config"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTestReceipt(!showTestReceipt)}
                  className="h-11 border-[#E8DED0] text-[#43291F] hover:bg-[#F8F3E9]"
                >
                  {showTestReceipt ? "Hide Test Bill" : "Test Print Layout"}
                </Button>
              </div>
            </form>

            {/* Test Print Preview */}
            {showTestReceipt && (
              <div className="mt-6 pt-6 border-t border-[#E8DED0]">
                <h4 className="font-serif font-bold text-sm text-[#43291F] mb-3 text-center">
                  Live Thermal Receipt Preview ({paperWidthState}mm)
                </h4>
                <ThermalReceipt
                  receipt={testReceiptData}
                  paperWidth={paperWidthState}
                  printerName={printerSettings?.printer_name}
                  connectionType={printerSettings?.connection_type}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
