'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Ingredient, Supplier, StockMovement } from '@/types/database'

export async function getIngredients() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ingredients')
    .select(`
      *,
      suppliers (name)
    `)
    .eq('is_active', true)
    .order('name')

  if (error) return []
  return data
}

export async function getSuppliers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) return []
  return data
}

export async function addIngredientAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('shop_id, role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

  const name = formData.get('name') as string
  const unit = formData.get('unit') as 'g' | 'kg' | 'ml' | 'l' | 'pcs'
  const minStock = Number(formData.get('min_stock') || 0)
  const initialStock = Number(formData.get('current_stock') || 0)
  const costPerUnit = Number(formData.get('cost_per_unit') || 0)
  const preferredSupplierId = (formData.get('preferred_supplier_id') as string) || null

  if (!name || !unit) {
    return { success: false, error: 'Name and measurement unit are required' }
  }

  const { data: newIng, error } = await supabase
    .from('ingredients')
    .insert({
      shop_id: profile.shop_id,
      name,
      unit,
      min_stock: minStock,
      current_stock: initialStock,
      cost_per_unit: costPerUnit > 0 ? costPerUnit : null,
      preferred_supplier_id: preferredSupplierId,
      is_active: true,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // If initial stock was provided, record an 'opening' stock movement
  if (initialStock > 0) {
    await supabase.from('stock_movements').insert({
      shop_id: profile.shop_id,
      ingredient_id: newIng.id,
      movement_type: 'opening',
      quantity: initialStock,
      unit_cost: costPerUnit > 0 ? costPerUnit : null,
      reason: 'Opening stock entry',
      stock_before: 0,
      stock_after: initialStock,
      performed_by: user.id,
    })
  }

  revalidatePath('/admin/inventory')
  return { success: true, ingredient: newIng }
}

export async function addSupplierAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user.id).single()
  if (!profile) return { success: false, error: 'Profile not found' }

  const name = formData.get('name') as string
  const phone = (formData.get('phone') as string) || null
  const email = (formData.get('email') as string) || null
  const address = (formData.get('address') as string) || null
  const notes = (formData.get('notes') as string) || null

  if (!name) return { success: false, error: 'Supplier name is required' }

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      shop_id: profile.shop_id,
      name,
      phone,
      email,
      address,
      notes,
      is_active: true,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/inventory')
  return { success: true, supplier: data }
}

export async function receiveStockAction(payload: {
  supplier_id?: string | null
  reference_no?: string | null
  notes?: string | null
  items: { ingredient_id: string; quantity: number; unit_cost: number }[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user.id).single()
  if (!profile) return { success: false, error: 'Profile not found' }

  if (!payload.items || payload.items.length === 0) {
    return { success: false, error: 'No items in stock receipt' }
  }

  const { data, error } = await supabase.rpc('receive_stock', {
    p_shop_id: profile.shop_id,
    p_manager_id: user.id,
    p_supplier_id: payload.supplier_id || null,
    p_reference_no: payload.reference_no || null,
    p_notes: payload.notes || null,
    p_items: payload.items,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/inventory')
  revalidatePath('/pos/stock')
  return { success: true, result: data }
}

export async function recordWastageAction(payload: {
  ingredient_id: string
  quantity: number
  reason: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user.id).single()
  if (!profile) return { success: false, error: 'Profile not found' }

  if (!payload.ingredient_id || payload.quantity <= 0 || !payload.reason) {
    return { success: false, error: 'Ingredient, positive quantity, and reason are required' }
  }

  const { data, error } = await supabase.rpc('record_wastage', {
    p_shop_id: profile.shop_id,
    p_manager_id: user.id,
    p_ingredient_id: payload.ingredient_id,
    p_quantity: payload.quantity,
    p_reason: payload.reason,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/inventory')
  revalidatePath('/pos/wastage')
  return { success: true, result: data }
}

export async function getStockMovements(limit = 100) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stock_movements')
    .select(`
      *,
      ingredients (name, unit),
      profiles (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data
}

// ── NEW ACTIONS ────────────────────────────────────────────────────────────────

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

  // Supabase JS v2 doesn't support column-to-column comparisons directly;
  // fetch minimal rows and filter in JS.
  const { data: rows, error } = await supabase
    .from('ingredients')
    .select('id, current_stock, min_stock')
    .eq('shop_id', profile.shop_id)
    .eq('is_active', true)

  if (error || !rows) return 0
  return rows.filter((r) => Number(r.current_stock) <= Number(r.min_stock)).length
}

export async function getLowStockIngredients() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id')
    .eq('id', user.id)
    .single()
  if (!profile) return []

  const { data, error } = await supabase
    .from('ingredients')
    .select(`
      id,
      name,
      unit,
      current_stock,
      min_stock,
      preferred_supplier_id,
      suppliers (name, phone)
    `)
    .eq('shop_id', profile.shop_id)
    .eq('is_active', true)
    .order('name')

  if (error || !data) return []
  return data.filter((r) => Number(r.current_stock) <= Number(r.min_stock))
}

export async function getStockPurchaseHistory(limit = 100) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      purchase_items (
        *,
        ingredients (name, unit)
      ),
      suppliers (name, phone)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data
}

export async function updateIngredientAvgUsage(ingredientId: string, avgUsage: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

  const { error } = await supabase
    .from('recipe_items')
    .update({ avg_usage_per_sale: avgUsage })
    .eq('ingredient_id', ingredientId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/inventory')
  return { success: true }
}
