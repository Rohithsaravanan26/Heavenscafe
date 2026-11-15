import { getExpenses } from "@/lib/actions/expenses"
import { AdminExpensesManager } from "@/components/admin/AdminExpensesManager"

export default async function AdminExpensesPage() {
  const expenses = await getExpenses()

  return <AdminExpensesManager initialExpenses={expenses} />
}
