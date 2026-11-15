import { getRecentSales } from "@/lib/actions/billing"
import { getShopAndPrinterSettings } from "@/lib/actions/settings"
import { AdminSalesHistory } from "@/components/admin/AdminSalesHistory"

export default async function AdminSalesPage() {
  const [sales, settingsData] = await Promise.all([
    getRecentSales(100),
    getShopAndPrinterSettings(),
  ])

  const shop = settingsData?.shop
  const printerSettings = settingsData?.printerSettings

  return (
    <AdminSalesHistory
      initialSales={sales}
      shopName={shop?.name || "Heaven's Cafe"}
      shopAddress={shop?.address}
      shopPhone={shop?.phone}
      paperWidth={printerSettings?.paper_width || 80}
    />
  )
}
