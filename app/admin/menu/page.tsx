import { getAllProductsAdmin, getCategoriesAdmin } from "@/lib/actions/menu"
import { AdminMenuManager } from "@/components/admin/AdminMenuManager"

export default async function AdminMenuPage() {
  const [products, categories] = await Promise.all([
    getAllProductsAdmin(),
    getCategoriesAdmin(),
  ])

  return (
    <AdminMenuManager
      initialProducts={products}
      initialCategories={categories}
    />
  )
}
