'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Expense } from '@/types/database'

export async function getExpenses(month?: number, year?: number) {
  const supabase = await createClient()

  let query = supabase
    .from('expenses')
    .select(`
      *,
      profiles (full_name)
    `)
    .order('expense_date', { ascending: false })

  if (month !== undefined && year !== undefined) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    query = query.gte('expense_date', startDate).lt('expense_date', endDate)
  }

  const { data, error } = await query

  if (error) return []
  return data
}

export async function addExpenseAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('shop_id, role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

  const category = formData.get('category') as Expense['category']
  const description = formData.get('description') as string
  const amount = Number(formData.get('amount'))
  const expenseDate = (formData.get('expense_date') as string) || new Date().toISOString().split('T')[0]
  const reference = (formData.get('reference') as string) || null

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
      recorded_by: user.id,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Log audit
  await supabase.from('audit_logs').insert({
    shop_id: profile.shop_id,
    user_id: user.id,
    action_type: 'EXPENSE_RECORDED',
    table_name: 'expenses',
    record_id: data.id,
    new_value: { category, amount, description },
  })

  revalidatePath('/admin/expenses')
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

  revalidatePath('/admin/expenses')
  return { success: true }
}
