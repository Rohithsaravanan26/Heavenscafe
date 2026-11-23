'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Expense } from '@/types/database'

export async function getExpenses(month?: number, year?: number, paymentSource?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('expenses')
    .select(`
      *,
      profiles:recorded_by (full_name)
    `)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (month !== undefined && year !== undefined) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    query = query.gte('expense_date', startDate).lt('expense_date', endDate)
  }

  if (paymentSource && paymentSource !== 'all') {
    query = query.eq('payment_source', paymentSource)
  }

  const { data, error } = await query

  if (error) {
    console.error('getExpenses error:', error.message)
    return []
  }
  return data || []
}

export async function getTodayExpensesAction() {
  const supabase = await createClient()
  const todayStr = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      profiles:recorded_by (full_name)
    `)
    .eq('expense_date', todayStr)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getTodayExpensesAction error:', error.message)
    return []
  }
  return data || []
}

export async function getTodayCashExpensesTotalAction(): Promise<number> {
  const supabase = await createClient()
  const todayStr = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('expenses')
    .select('amount, payment_source')
    .eq('expense_date', todayStr)

  if (error || !data) return 0

  return data
    .filter((e) => e.payment_source === 'cash_drawer')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0)
}

export async function addExpenseAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id, role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    return { success: false, error: 'Account inactive or profile not found' }
  }

  const category = formData.get('category') as Expense['category']
  const description = formData.get('description') as string
  const amount = Number(formData.get('amount'))
  const expenseDate = (formData.get('expense_date') as string) || new Date().toISOString().split('T')[0]
  const reference = (formData.get('reference') as string) || null
  const paymentSource = (formData.get('payment_source') as string) || 'cash_drawer'

  if (!category || !description || isNaN(amount) || amount <= 0) {
    return { success: false, error: 'Valid category, description, and positive amount required' }
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      shop_id: profile.shop_id,
      category,
      description,
      amount,
      expense_date: expenseDate,
      reference,
      payment_source: paymentSource,
      recorded_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('addExpenseAction error:', error.message)
    return { success: false, error: error.message }
  }

  // Log audit
  await supabase.from('audit_logs').insert({
    shop_id: profile.shop_id,
    user_id: user.id,
    action_type: 'EXPENSE_RECORDED',
    table_name: 'expenses',
    record_id: data.id,
    new_value: { category, amount, description, payment_source: paymentSource },
  })

  revalidatePath('/pos/expenses')
  revalidatePath('/pos/closing')
  revalidatePath('/admin/expenses')
  revalidatePath('/admin/reports')
  return { success: true, expense: data }
}

export async function deleteExpenseAction(expenseId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

  const { error } = await supabase.from('expenses').delete().eq('id', expenseId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/pos/expenses')
  revalidatePath('/admin/expenses')
  revalidatePath('/admin/reports')
  return { success: true }
}
