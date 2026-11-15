import { getIngredients, getSuppliers, getStockMovements } from "@/lib/actions/inventory"
import { AdminInventoryManager } from "@/components/admin/AdminInventoryManager"

export default async function AdminInventoryPage() {
  const [ingredients, suppliers, movements] = await Promise.all([
    getIngredients(),
    getSuppliers(),
    getStockMovements(100),
  ])

  return (
    <AdminInventoryManager
      ingredients={ingredients}
      suppliers={suppliers}
      movements={movements}
    />
  )
}
