'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DailyClosing } from '@/types/database'

export async function getTodayClosingSummary() {
  const supabase = await createClient()

  // Sum today's completed payments by method
  const today = new Date().toISOString().split('T')[0]

  const { data: sales, error } = await supabase
    .from('sales')
    .select(`
      id,
      total_amount,
      payments (
        method,
        amount
      )
    `)
    .eq('status', 'completed')
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lte('created_at', `${today}T23:59:59.999Z`)

  let cashSales = 0
  let upiSales = 0
  let cardSales = 0
  let otherSales = 0
  let totalSales = 0

  if (sales) {
    for (const sale of sales) {
      totalSales += Number(sale.total_amount || 0)
      if (sale.payments) {
        for (const p of sale.payments as { method: string; amount: number }[]) {
          const amt = Number(p.amount || 0)
          if (p.method === 'cash') cashSales += amt
          else if (p.method === 'upi') upiSales += amt
          else if (p.method === 'card') cardSales += amt
          else otherSales += amt
        }
      }
    }
  }

  // Sum today's cash drawer expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, payment_source')
    .eq('expense_date', today)

  const cashExpenses = (expenses || [])
    .filter((e) => e.payment_source === 'cash_drawer')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0)

  const expectedCash = Math.max(0, cashSales - cashExpenses)

  // Check if today already has a closing record
  const { data: existingClosing } = await supabase
    .from('daily_closings')
    .select('*')
    .eq('closing_date', today)
    .single()

  return {
    closing_date: today,
    cash_sales: Number(cashSales.toFixed(2)),
    upi_sales: Number(upiSales.toFixed(2)),
    card_sales: Number(cardSales.toFixed(2)),
    other_sales: Number(otherSales.toFixed(2)),
    total_sales: Number(totalSales.toFixed(2)),
    cash_expenses: Number(cashExpenses.toFixed(2)),
    expected_cash: Number(expectedCash.toFixed(2)),
    existing_closing: existingClosing,
  }
}

export async function submitDailyClosingAction(actualCash: number, remarks?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user.id).single()
  if (!profile) return { success: false, error: 'Profile not found' }

  const summary = await getTodayClosingSummary()
  const expectedCash = summary.expected_cash
  const difference = Number((actualCash - expectedCash).toFixed(2))
  const isDiscrepancy = Math.abs(difference) > 0.01

  const { data, error } = await supabase
    .from('daily_closings')
    .upsert({
      shop_id: profile.shop_id,
      closing_date: summary.closing_date,
      cash_sales: summary.cash_sales,
      upi_sales: summary.upi_sales,
      card_sales: summary.card_sales,
      other_sales: summary.other_sales,
      total_sales: summary.total_sales,
      expected_cash: expectedCash,
      actual_cash: actualCash,
      remarks: remarks || null,
      submitted_by: user.id,
      status: isDiscrepancy ? 'discrepancy' : 'submitted',
    }, {
      onConflict: 'shop_id,closing_date'
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // If discrepancy, create admin notification
  if (isDiscrepancy) {
    const diffSign = difference > 0 ? `+₹${difference}` : `-₹${Math.abs(difference)}`
    await supabase.from('notifications').insert({
      shop_id: profile.shop_id,
      type: 'discrepancy',
      title: `Daily Cash Discrepancy (${summary.closing_date})`,
      message: `Expected cash ₹${expectedCash}, but physical cash counted was ₹${actualCash} (Difference: ${diffSign}). Remarks: ${remarks || 'None'}`,
      related_id: data.id,
      related_type: 'daily_closing',
    })
  }

  // Audit
  await supabase.from('audit_logs').insert({
    shop_id: profile.shop_id,
    user_id: user.id,
    action_type: 'DAILY_CLOSING_SUBMITTED',
    table_name: 'daily_closings',
    record_id: data.id,
    new_value: { actual_cash: actualCash, difference, remarks },
  })

  revalidatePath('/pos/closing')
  revalidatePath('/admin')
  return { success: true, closing: data }
}

export async function getClosingHistory(limit = 30) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('daily_closings')
    .select(`
      *,
      profiles!daily_closings_submitted_by_fkey (full_name)
    `)
    .order('closing_date', { ascending: false })
    .limit(limit)

  if (error) return []
  return data
}
