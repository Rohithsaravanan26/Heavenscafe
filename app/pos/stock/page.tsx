import { getProductStockList } from "@/lib/actions/analytics"
import { getStockInwardsAction } from "@/lib/actions/inventory"
import { StockInwardForm } from "@/components/pos/StockInwardForm"

export const dynamic = "force-dynamic"

export default async function POSStockInwardPage() {
  const [products, inwards] = await Promise.all([
    getProductStockList(),
    getStockInwardsAction(40),
  ])

  return <StockInwardForm products={products} initialInwards={inwards} />
}
