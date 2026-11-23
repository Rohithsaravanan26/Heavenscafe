'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
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

export async function getClosingHistory(limit = 60) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('daily_closings')
    .select('*')
    .order('closing_date', { ascending: false })
    .limit(limit)

  if (error || !data) {
    console.error('getClosingHistory error:', error)
    return []
  }

  // Decoupled profile lookup to prevent PostgREST PGRST200 schema foreign-key cache errors
  const userIds = Array.from(
    new Set(
      [
        ...data.map((c: any) => c.submitted_by),
        ...data.map((c: any) => c.reviewed_by),
      ].filter(Boolean)
    )
  )

  let profileMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    if (profiles) {
      profileMap = Object.fromEntries(
        profiles.map((p: any) => [p.id, p.full_name || 'Staff'])
      )
    }
  }

  return data.map((item: any) => ({
    ...item,
    profiles: {
      full_name: profileMap[item.submitted_by] || 'Store Manager',
    },
    reviewer: item.reviewed_by
      ? { full_name: profileMap[item.reviewed_by] || 'Admin' }
      : null,
  }))
}

export async function reviewDailyClosingAction(closingId: string, reviewNotes?: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'User session expired. Please sign in again.' }
    }

    // Check user profile and role case-insensitively
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id, role, full_name')
      .eq('id', user.id)
      .single()

    const userRole = (profile?.role || '').toUpperCase()
    if (!profile || (userRole !== 'ADMIN' && userRole !== 'OWNER')) {
      return { success: false, error: 'Only administrators can review daily register closings.' }
    }

    // Use admin client to reliably perform update and audit log
    const adminSupabase = await createAdminClient()

    const { data: existingClosing, error: fetchErr } = await adminSupabase
      .from('daily_closings')
      .select('*')
      .eq('id', closingId)
      .single()

    if (fetchErr || !existingClosing) {
      return { success: false, error: 'Closing record not found.' }
    }

    const adminName = profile.full_name || 'Cafe Owner'
    const updatedRemarks = reviewNotes?.trim()
      ? existingClosing.remarks
        ? `${existingClosing.remarks} | Admin Review (${adminName}): ${reviewNotes.trim()}`
        : `Admin Review (${adminName}): ${reviewNotes.trim()}`
      : existingClosing.remarks

    const { data: updatedClosing, error: updateErr } = await adminSupabase
      .from('daily_closings')
      .update({
        status: 'reviewed',
        reviewed_by: user.id,
        remarks: updatedRemarks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', closingId)
      .select()
      .single()

    if (updateErr) {
      return { success: false, error: `Failed to review closing: ${updateErr.message}` }
    }

    // Record tamper-evident audit log
    await adminSupabase.from('audit_logs').insert({
      shop_id: profile.shop_id || existingClosing.shop_id,
      user_id: user.id,
      action_type: 'DAILY_CLOSING_REVIEWED',
      table_name: 'daily_closings',
      record_id: closingId,
      old_value: { status: existingClosing.status, reviewed_by: existingClosing.reviewed_by },
      new_value: { status: 'reviewed', reviewed_by: user.id, remarks: updatedRemarks },
    })

    revalidatePath('/pos/closing')
    revalidatePath('/admin')
    revalidatePath('/admin/reports')

    return { success: true, closing: updatedClosing }
  } catch (err: any) {
    console.error('reviewDailyClosingAction error:', err)
    return { success: false, error: err?.message || 'An unexpected error occurred during review.' }
  }
}
