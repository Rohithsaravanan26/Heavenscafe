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
      product_addons (*)
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
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized: Session required' }

    const { data: profile } = await supabase.from('profiles').select('shop_id, role').eq('id', user.id).single()
    if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

    // Fallback for shopId if not set on profile
    let shopId = profile.shop_id
    if (!shopId) {
      const { data: defaultShop } = await supabase.from('shops').select('id').limit(1).single()
      shopId = defaultShop?.id
    }
    if (!shopId) return { success: false, error: 'Shop profile missing' }

    const name = (formData.get('name') as string)?.trim()
    const categoryId = formData.get('category_id') as string
    const basePrice = Number(formData.get('base_price'))
    const costPrice = Number(formData.get('cost_price') || 0)
    const currentStock = parseInt((formData.get('current_stock') as string) || '50', 10)
    const minStock = parseInt((formData.get('min_stock') as string) || '10', 10)
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
        cost_price: costPrice,
        current_stock: currentStock,
        min_stock: minStock,
        track_stock: true,
        description,
        track_inventory: trackInventory,
        is_available: isAvailable,
        is_active: true,
      })
      .select(`
        *,
        menu_categories (name)
      `)
      .single()

    if (error) {
      console.error('addProductAction insert error:', error.message)
      return { success: false, error: error.message }
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      shop_id: shopId,
      user_id: user.id,
      action_type: 'PRODUCT_CREATED',
      table_name: 'products',
      record_id: newProd.id,
      new_value: { name, base_price: basePrice, cost_price: costPrice },
    })

    revalidatePath('/admin/menu')
    revalidatePath('/admin/inventory')
    revalidatePath('/pos')
    return { success: true, product: newProd }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('addProductAction unexpected error:', msg)
    return { success: false, error: msg }
  }
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
  const costPrice = Number(formData.get('cost_price') || 0)
  const currentStock = parseInt((formData.get('current_stock') as string) || String(currentProd.current_stock ?? 50), 10)
  const minStock = parseInt((formData.get('min_stock') as string) || String(currentProd.min_stock ?? 10), 10)
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
      cost_price: costPrice,
      current_stock: currentStock,
      min_stock: minStock,
      description,
      track_inventory: trackInventory,
      is_available: isAvailable,
    })
    .eq('id', productId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/menu')
  revalidatePath('/admin/inventory')
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
  revalidatePath('/admin/inventory')
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
  revalidatePath('/admin/inventory')
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
  revalidatePath('/admin/inventory')
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
  revalidatePath('/admin/inventory')
  revalidatePath('/pos')
  return { success: true, category: data }
}

export async function deleteProductAction(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('shop_id, role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

  // Check if product exists
  const { data: prod } = await supabase.from('products').select('*').eq('id', productId).single()
  if (!prod) return { success: false, error: 'Product not found' }

  // Check if product has sales items or stock inwards
  const { count: salesCount } = await supabase
    .from('sale_items')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId)

  const { count: inwardsCount } = await supabase
    .from('stock_inwards')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId)

  const hasHistory = (salesCount ?? 0) > 0 || (inwardsCount ?? 0) > 0

  if (hasHistory) {
    // Audit-safe deactivation: deactivate and hide from POS & active menu so historical billing remains intact
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, is_available: false })
      .eq('id', productId)

    if (error) return { success: false, error: error.message }

    await supabase.from('audit_logs').insert({
      shop_id: profile.shop_id,
      user_id: user.id,
      action_type: 'PRODUCT_ARCHIVED_ON_DELETE',
      table_name: 'products',
      record_id: productId,
      old_value: { name: prod.name, base_price: prod.base_price },
      new_value: { is_active: false, is_available: false, reason: 'Archived because historical sales/inward records exist' },
    })

    revalidatePath('/admin/menu')
    revalidatePath('/admin/inventory')
    revalidatePath('/pos')
    return { 
      success: true, 
      action: 'archived', 
      message: `Product "${prod.name}" has previous billing records, so it was safely removed from active menu and POS.` 
    }
  }

  // Hard delete if no dependent financial history
  await supabase.from('product_variants').delete().eq('product_id', productId)
  await supabase.from('product_addons').delete().eq('product_id', productId)
  await supabase.from('product_price_history').delete().eq('product_id', productId)
  await supabase.from('product_wastage_logs').delete().eq('product_id', productId)

  const { error: delError } = await supabase.from('products').delete().eq('id', productId)
  if (delError) {
    // Fallback to archiving if any unforeseen constraint exists
    await supabase.from('products').update({ is_active: false, is_available: false }).eq('id', productId)
    return { success: true, action: 'archived', message: `Product "${prod.name}" was deactivated and removed from active menu.` }
  }

  await supabase.from('audit_logs').insert({
    shop_id: profile.shop_id,
    user_id: user.id,
    action_type: 'PRODUCT_DELETED',
    table_name: 'products',
    record_id: productId,
    old_value: { name: prod.name, base_price: prod.base_price },
  })

  revalidatePath('/admin/menu')
  revalidatePath('/admin/inventory')
  revalidatePath('/pos')
  return { success: true, action: 'deleted', message: `Product "${prod.name}" permanently deleted.` }
}

export async function deleteCategoryAction(categoryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('shop_id, role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

  // Check if any products exist under this category
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)

  if ((count ?? 0) > 0) {
    return { success: false, error: 'Cannot delete category that contains products. Reassign or delete products first.' }
  }

  const { error } = await supabase.from('menu_categories').delete().eq('id', categoryId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/menu')
  revalidatePath('/admin/inventory')
  revalidatePath('/pos')
  return { success: true }
}
