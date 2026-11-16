import { getIngredients, getRawMaterialUsageLogs } from "@/lib/actions/inventory"
import { getDashboardOverview } from "@/lib/actions/analytics"
import { DailyUsageForm } from "@/components/pos/DailyUsageForm"
import { Scale } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function POSMaterialUsagePage() {
  const [ingredients, recentLogs, overview] = await Promise.all([
    getIngredients(),
    getRawMaterialUsageLogs(10),
    getDashboardOverview(),
  ])

  if (!ingredients || ingredients.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-[#FFFDF8] rounded-2xl border border-[#E8DED0] shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-[#FAF0EB] text-[#B56C4A] mx-auto flex items-center justify-center mb-3">
          <Scale className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-xl font-bold text-[#43291F]">
          No Raw Ingredients Found
        </h3>
        <p className="text-xs text-[#705B51] mt-1 mb-4">
          Before reporting material usage, ingredients must be set up in the Admin portal.
        </p>
      </div>
    )
  }

  return (
    <DailyUsageForm
      ingredients={ingredients}
      recentLogs={recentLogs}
      todaySalesCount={overview?.kpis?.today_bills || 0}
    />
  )
}
