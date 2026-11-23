import { getPOSCatalogue } from "@/lib/actions/menu"
import { getProductWastagesAction } from "@/lib/actions/billing"
import { WastageForm } from "@/components/pos/WastageForm"
import { Trash2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function POSWastagePage() {
  const [categories, wastages] = await Promise.all([
    getPOSCatalogue(),
    getProductWastagesAction(),
  ])

  // Extract products
  const products = categories.flatMap((cat: any) =>
    (cat.products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      base_price: Number(p.base_price || 0),
      cost_price: Number(p.cost_price || 0),
      current_stock: Number(p.current_stock || 0),
    }))
  )

  if (!products || products.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-[#FFFDF8] rounded-2xl border border-[#E8DED0] shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 mx-auto flex items-center justify-center mb-3">
          <Trash2 className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-xl font-bold text-[#43291F]">
          No Products Configured
        </h3>
        <p className="text-xs text-[#705B51] mt-1 mb-4">
          Wastage is recorded against menu items (puffs, coffee, burgers, etc.).
        </p>
      </div>
    )
  }

  return <WastageForm products={products} recentWastages={wastages} />
}
