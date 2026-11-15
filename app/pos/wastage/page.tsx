import { getIngredients } from "@/lib/actions/inventory"
import { WastageForm } from "@/components/pos/WastageForm"
import { Trash2 } from "lucide-react"

export default async function POSWastagePage() {
  const ingredients = await getIngredients()

  if (!ingredients || ingredients.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-[#FFFDF8] rounded-2xl border border-[#E8DED0] shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 mx-auto flex items-center justify-center mb-3">
          <Trash2 className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-xl font-bold text-[#43291F]">
          No Ingredients Tracked
        </h3>
        <p className="text-xs text-[#705B51] mt-1 mb-4">
          Wastage can only be recorded against registered inventory ingredients.
        </p>
      </div>
    )
  }

  return <WastageForm ingredients={ingredients} />
}
