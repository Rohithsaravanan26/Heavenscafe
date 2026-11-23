import { getDashboardOverview } from "@/lib/actions/analytics"
import { getLowStockCount } from "@/lib/actions/inventory"
import { getClosingHistory } from "@/lib/actions/closing"
import { DashboardOverview } from "@/components/admin/DashboardOverview"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const [overviewData, lowStockCount, recentClosings] = await Promise.all([
    getDashboardOverview(),
    getLowStockCount(),
    getClosingHistory(5),
  ])

  return (
    <DashboardOverview
      data={overviewData}
      lowStockCount={lowStockCount}
      recentClosings={recentClosings}
    />
  )
}
