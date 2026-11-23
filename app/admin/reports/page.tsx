import {
  getDashboardOverview,
  getTopProducts,
  getPaymentMethodDistribution,
} from "@/lib/actions/analytics"
import { getClosingHistory } from "@/lib/actions/closing"
import { AdminReportsView } from "@/components/admin/AdminReportsView"

export const dynamic = "force-dynamic"

export default async function AdminReportsPage() {
  const [overview, topProducts, paymentMethods, closingHistory] = await Promise.all([
    getDashboardOverview(),
    getTopProducts(10),
    getPaymentMethodDistribution(),
    getClosingHistory(60),
  ])

  return (
    <AdminReportsView
      overviewData={overview}
      topProducts={topProducts}
      paymentMethods={paymentMethods}
      closingHistory={closingHistory}
    />
  )
}
