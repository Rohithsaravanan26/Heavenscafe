import { getIngredients, getSuppliers } from "@/lib/actions/inventory"
import { StockInwardForm } from "@/components/pos/StockInwardForm"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { PackagePlus } from "lucide-react"

export default async function POSStockInwardPage() {
  const [ingredients, suppliers] = await Promise.all([
    getIngredients(),
    getSuppliers(),
  ])

  if (!ingredients || ingredients.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-[#FFFDF8] rounded-2xl border border-[#E8DED0] shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-[#FAF0EB] text-[#B56C4A] mx-auto flex items-center justify-center mb-3">
          <PackagePlus className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-xl font-bold text-[#43291F]">
          No Raw Ingredients Configured
        </h3>
        <p className="text-xs text-[#705B51] mt-1 mb-4">
          Before logging inward stock, ingredients (like milk, tea powder, coffee beans, cups) must be added by the admin.
        </p>
        <p className="text-xs text-[#A09289]">
          Log in with an ADMIN account and visit Inventory → Ingredients to add raw materials.
        </p>
      </div>
    )
  }

  return <StockInwardForm ingredients={ingredients} suppliers={suppliers} />
}
