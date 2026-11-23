import { getProductStockList } from "@/lib/actions/analytics"
import { getProductWastagesAction } from "@/lib/actions/billing"
import { AdminInventoryManager } from "@/components/admin/AdminInventoryManager"

export const dynamic = "force-dynamic"

export default async function AdminInventoryPage() {
  const [products, wastages] = await Promise.all([
    getProductStockList(),
    getProductWastagesAction(),
  ])

  return (
    <AdminInventoryManager
      products={products}
      wastages={wastages}
    />
  )
}
