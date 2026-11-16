import { getIngredients } from "@/lib/actions/inventory"
import { InventoryAuditForm } from "@/components/pos/InventoryAuditForm"
import { ClipboardCheck } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function POSInventoryAuditPage() {
  const ingredients = await getIngredients()

  if (!ingredients || ingredients.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-[#FFFDF8] rounded-2xl border border-[#E8DED0] shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-[#FAF0EB] text-[#B56C4A] mx-auto flex items-center justify-center mb-3">
          <ClipboardCheck className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-xl font-bold text-[#43291F]">
          No Ingredients to Audit
        </h3>
        <p className="text-xs text-[#705B51] mt-1 mb-4">
          Add raw materials in the Admin portal before performing a store inventory audit.
        </p>
      </div>
    )
  }

  return <InventoryAuditForm ingredients={ingredients} />
}
