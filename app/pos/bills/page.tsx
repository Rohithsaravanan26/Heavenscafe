import { getRecentSales } from "@/lib/actions/billing"
import { getShopAndPrinterSettings } from "@/lib/actions/settings"
import { PreviousBillsView } from "@/components/pos/PreviousBillsView"

export default async function PreviousBillsPage() {
  const [sales, settingsData] = await Promise.all([
    getRecentSales(50),
    getShopAndPrinterSettings(),
  ])

  const shop = settingsData?.shop
  const printerSettings = settingsData?.printerSettings

  return (
    <PreviousBillsView
      initialSales={sales}
      shopName={shop?.name || "Heaven's Cafe"}
      shopAddress={shop?.address}
      shopPhone={shop?.phone}
      paperWidth={printerSettings?.paper_width || 80}
      printerName={printerSettings?.printer_name}
      connectionType={printerSettings?.connection_type || "browser"}
    />
  )
}
