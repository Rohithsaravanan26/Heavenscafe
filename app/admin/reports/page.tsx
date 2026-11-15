import {
  getDashboardOverview,
  getTopProducts,
  getPaymentMethodDistribution,
} from "@/lib/actions/analytics"
import { AdminReportsView } from "@/components/admin/AdminReportsView"

export default async function AdminReportsPage() {
  const [overview, topProducts, paymentMethods] = await Promise.all([
    getDashboardOverview(),
    getTopProducts(10),
    getPaymentMethodDistribution(),
  ])

  return (
    <AdminReportsView
      overviewData={overview}
      topProducts={topProducts}
      paymentMethods={paymentMethods}
    />
  )
}
