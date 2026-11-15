import { getPOSCatalogue } from "@/lib/actions/menu"
import { getShopAndPrinterSettings } from "@/lib/actions/settings"
import { getCurrentUser } from "@/lib/actions/auth"
import { POSTerminal } from "@/components/pos/POSTerminal"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Coffee } from "lucide-react"

export default async function POSPage() {
  const [categories, settingsData, authData] = await Promise.all([
    getPOSCatalogue(),
    getShopAndPrinterSettings(),
    getCurrentUser(),
  ])

  const shop = settingsData?.shop
  const shopSettings = settingsData?.shopSettings
  const printerSettings = settingsData?.printerSettings
  const cashierName = authData?.profile?.full_name || "Manager"

  // Empty state when catalogue hasn't been imported yet
  if (!categories || categories.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-[#FFFDF8] rounded-2xl border border-[#E8DED0] shadow-sm text-center">
        <div className="w-14 h-14 rounded-full bg-[#FAF0EB] text-[#B56C4A] mx-auto flex items-center justify-center mb-4">
          <Coffee className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#43291F]">
          Menu Catalogue Not Initialized
        </h2>
        <p className="text-sm text-[#705B51] mt-2 mb-6 max-w-md mx-auto">
          The Heaven&apos;s Cafe menu has not been seeded into the database yet.
          Please run the provided <code className="bg-[#EFE7DA] px-1.5 py-0.5 rounded text-xs font-mono">seed.sql</code> in your Supabase SQL Editor.
        </p>
        <Alert variant="olive" className="text-left text-xs max-w-md mx-auto">
          <AlertTitle>Quick Setup Guide</AlertTitle>
          <AlertDescription>
            1. Open Supabase Dashboard → SQL Editor
            <br />
            2. Run all files in <span className="font-mono">supabase/migrations/</span>
            <br />
            3. Run <span className="font-mono">supabase/seed.sql</span> to import all 43 items
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <POSTerminal
      categories={categories}
      shopName={shop?.name || "Heaven's Cafe"}
      shopAddress={shop?.address}
      shopPhone={shop?.phone}
      taxEnabled={shopSettings?.tax_enabled || false}
      taxRate={Number(shopSettings?.tax_rate || 0)}
      taxLabel={shopSettings?.tax_label || "GST"}
      cashierName={cashierName}
      paperWidth={printerSettings?.paper_width || 80}
      printerName={printerSettings?.printer_name}
      connectionType={printerSettings?.connection_type || "browser"}
    />
  )
}
