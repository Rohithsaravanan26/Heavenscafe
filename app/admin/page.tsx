import { getDashboardOverview } from "@/lib/actions/analytics"
import { getLowStockCount } from "@/lib/actions/inventory"
import { DashboardOverview } from "@/components/admin/DashboardOverview"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const [overviewData, lowStockCount] = await Promise.all([
    getDashboardOverview(),
    getLowStockCount(),
  ])

  return <DashboardOverview data={overviewData} lowStockCount={lowStockCount} />
}
