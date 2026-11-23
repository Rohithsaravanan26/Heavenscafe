import { getTodayExpensesAction } from "@/lib/actions/expenses"
import { DailyExpenseForm } from "@/components/pos/DailyExpenseForm"

export const dynamic = "force-dynamic"

export default async function POSDailyExpensesPage() {
  const todayExpenses = await getTodayExpensesAction()

  return <DailyExpenseForm initialExpenses={todayExpenses} />
}
