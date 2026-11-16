import {
  getIngredients,
  getSuppliers,
  getStockMovements,
  getLowStockIngredients,
  getStockPurchaseHistory,
  getRawMaterialUsageLogs,
  getInventoryAudits,
} from "@/lib/actions/inventory"
import { AdminInventoryManager } from "@/components/admin/AdminInventoryManager"

export const dynamic = "force-dynamic"

export default async function AdminInventoryPage() {
  const [
    ingredients,
    suppliers,
    movements,
    lowStockItems,
    purchaseHistory,
    usageLogs,
    audits,
  ] = await Promise.all([
    getIngredients(),
    getSuppliers(),
    getStockMovements(100),
    getLowStockIngredients(),
    getStockPurchaseHistory(50),
    getRawMaterialUsageLogs(100),
    getInventoryAudits(50),
  ])

  return (
    <AdminInventoryManager
      ingredients={ingredients}
      suppliers={suppliers}
      movements={movements}
      lowStockItems={lowStockItems}
      purchaseHistory={purchaseHistory}
      usageLogs={usageLogs}
      audits={audits}
    />
  )
}
