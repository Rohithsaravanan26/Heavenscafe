'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { MenuCategory, Product } from '@/types/database'

export async function getPOSCatalogue() {
  const supabase = await createClient()

  // Fetch visible categories with ordered active products
  const { data: categories, error: catErr } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('is_visible', true)
    .order('display_order', { ascending: true })

  if (catErr || !categories) return []

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select(`
      *,
      product_variants (*),
      product_addons (*)
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (prodErr || !products) return []

  // Group products by category
  return categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category_id === cat.id),
  }))
}

export async function getAllProductsAdmin() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      menu_categories (name),
      product_variants (*),
      product_addons (*),
      recipes (id, name, is_active)
    `)
    .order('category_id')
    .order('display_order')

  if (error) return []
  return data
}

export async function getCategoriesAdmin() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('menu_categories')
    .select('*, products(count)')
    .order('display_order', { ascending: true })

  if (error) return []
  return data
}

export async function addProductAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('shop_id, role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

  const shopId = profile.shop_id
  const name = formData.get('name') as string
  const categoryId = formData.get('category_id') as string
  const basePrice = Number(formData.get('base_price'))
  const description = (formData.get('description') as string) || null
  const trackInventory = formData.get('track_inventory') === 'true'
  const isAvailable = formData.get('is_available') !== 'false'

  if (!name || !categoryId || isNaN(basePrice) || basePrice < 0) {
    return { success: false, error: 'Valid name, category, and non-negative price required' }
  }

  const { data: newProd, error } = await supabase
    .from('products')
    .insert({
      shop_id: shopId,
      category_id: categoryId,
      name,
      base_price: basePrice,
      description,
      track_inventory: trackInventory,
      is_available: isAvailable,
      is_active: true,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Log audit
  await supabase.from('audit_logs').insert({
    shop_id: shopId,
    user_id: user.id,
    action_type: 'PRODUCT_CREATED',
    table_name: 'products',
    record_id: newProd.id,
    new_value: { name, base_price: basePrice },
  })

  revalidatePath('/admin/menu')
  revalidatePath('/pos')
  return { success: true, product: newProd }
}

export async function updateProductAction(productId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('shop_id, role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

  const { data: currentProd } = await supabase.from('products').select('*').eq('id', productId).single()
  if (!currentProd) return { success: false, error: 'Product not found' }

  const name = formData.get('name') as string
  const categoryId = formData.get('category_id') as string
  const basePrice = Number(formData.get('base_price'))
  const description = (formData.get('description') as string) || null
  const trackInventory = formData.get('track_inventory') === 'true'
  const isAvailable = formData.get('is_available') !== 'false'

  // If price changed, write to immutable product_price_history
  if (Number(currentProd.base_price) !== basePrice) {
    await supabase.from('product_price_history').insert({
      product_id: productId,
      old_price: currentProd.base_price,
      new_price: basePrice,
      changed_by: user.id,
      reason: (formData.get('price_change_reason') as string) || 'Manual price update',
    })
  }

  const { error } = await supabase
    .from('products')
    .update({
      name,
      category_id: categoryId,
      base_price: basePrice,
      description,
      track_inventory: trackInventory,
      is_available: isAvailable,
    })
    .eq('id', productId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/menu')
  revalidatePath('/pos')
  return { success: true }
}

export async function toggleProductAvailabilityAction(productId: string, isAvailable: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('products')
    .update({ is_available: isAvailable })
    .eq('id', productId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/menu')
  revalidatePath('/pos')
  return { success: true }
}

export async function archiveProductAction(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', productId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/menu')
  revalidatePath('/pos')
  return { success: true }
}

export async function restoreProductAction(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

  const { error } = await supabase
    .from('products')
    .update({ is_active: true })
    .eq('id', productId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/menu')
  revalidatePath('/pos')
  return { success: true }
}

export async function addCategoryAction(name: string, displayOrder = 0) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('shop_id, role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

  const { data, error } = await supabase
    .from('menu_categories')
    .insert({
      shop_id: profile.shop_id,
      name,
      display_order: displayOrder,
      is_visible: true,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/menu')
  revalidatePath('/pos')
  return { success: true, category: data }
}
