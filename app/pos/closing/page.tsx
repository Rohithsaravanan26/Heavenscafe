import { getTodayClosingSummary } from "@/lib/actions/closing"
import { DailyClosingForm } from "@/components/pos/DailyClosingForm"

export default async function POSClosingPage() {
  const summary = await getTodayClosingSummary()

  return <DailyClosingForm summary={summary} />
}
