import { getDashboardOverview } from "@/lib/actions/analytics"
import { DashboardOverview } from "@/components/admin/DashboardOverview"

export default async function AdminDashboardPage() {
  const overviewData = await getDashboardOverview()

  return <DashboardOverview data={overviewData} />
}
