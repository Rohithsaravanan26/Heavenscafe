import { getProductStockList } from "@/lib/actions/analytics"
import { getProductWastagesAction } from "@/lib/actions/billing"
import { getStockInwardsAction } from "@/lib/actions/inventory"
import { AdminInventoryManager } from "@/components/admin/AdminInventoryManager"

export const dynamic = "force-dynamic"

export default async function AdminInventoryPage() {
  const [products, wastages, inwards] = await Promise.all([
    getProductStockList(),
    getProductWastagesAction(),
    getStockInwardsAction(100),
  ])

  return (
    <AdminInventoryManager
      products={products}
      wastages={wastages}
      inwards={inwards}
    />
  )
}
