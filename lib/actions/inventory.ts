'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Returns the count of active retail products whose current_stock is at or below min_stock
 */
export async function getLowStockCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id')
    .eq('id', user.id)
    .single()
  if (!profile) return 0

  const { data: rows, error } = await supabase
    .from('products')
    .select('id, current_stock, min_stock')
    .eq('shop_id', profile.shop_id)
    .eq('is_active', true)
    .eq('track_stock', true)

  if (error || !rows) return 0
  return rows.filter((r) => Number(r.current_stock) <= Number(r.min_stock)).length
}

/**
 * Atomic stock inward action recorded by on-premises store manager
 */
export async function recordStockInwardAction(payload: {
  product_id: string
  quantity: number
  unit_cost?: number
  supplier_name?: string | null
  invoice_ref?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { success: false, error: 'Profile not found' }

  if (!payload.product_id || payload.quantity <= 0) {
    return { success: false, error: 'Valid product and positive quantity required' }
  }

  const { data, error } = await supabase.rpc('record_stock_inward', {
    p_shop_id: profile.shop_id,
    p_manager_id: user.id,
    p_product_id: payload.product_id,
    p_quantity: payload.quantity,
    p_unit_cost: payload.unit_cost || 0.00,
    p_supplier_name: payload.supplier_name || null,
    p_invoice_ref: payload.invoice_ref || null,
    p_notes: payload.notes || null,
  })

  if (error) {
    console.error('recordStockInwardAction error:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath('/pos/stock')
  revalidatePath('/pos')
  revalidatePath('/admin/inventory')
  return { success: true, result: data }
}

/**
 * Get recent stock inward delivery shipments for manager log and remote owner audit
 */
export async function getStockInwardsAction(limit = 100) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stock_inwards')
    .select(`
      *,
      products (name, base_price, cost_price),
      profiles:manager_id (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getStockInwardsAction error:', error.message)
    return []
  }
  return data || []
}
