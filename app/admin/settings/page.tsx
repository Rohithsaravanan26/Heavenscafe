import { getShopAndPrinterSettings } from "@/lib/actions/settings"
import { AdminSettingsForm } from "@/components/admin/AdminSettingsForm"

export default async function AdminSettingsPage() {
  const settingsData = await getShopAndPrinterSettings()

  return (
    <AdminSettingsForm
      shop={settingsData?.shop}
      shopSettings={settingsData?.shopSettings}
      printerSettings={settingsData?.printerSettings}
    />
  )
}
