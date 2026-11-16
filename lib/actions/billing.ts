'use server'

import { createClient } from '@/lib/supabase/server'
import { CheckoutPayload, Sale } from '@/types/database'

export async function completeSaleAction(payload: CheckoutPayload) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized: User session required' }
  }

  // Get manager profile & verify permission
  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id, role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    return { success: false, error: 'User account inactive or missing' }
  }

  const shopId = profile.shop_id

  if (!payload.items || payload.items.length === 0) {
    return { success: false, error: 'Cart cannot be empty' }
  }

  // 1. Server-side validation of products and current authorized prices
  const productIds = payload.items.map((i) => i.product_id)
  const { data: dbProducts, error: prodErr } = await supabase
    .from('products')
    .select('id, name, base_price, is_active, is_available')
    .in('id', productIds)

  if (prodErr || !dbProducts) {
    return { success: false, error: 'Failed to verify menu items against database' }
  }

  const prodMap = new Map(dbProducts.map((p) => [p.id, p]))

  let verifiedSubtotal = 0
  const validatedItems = []

  for (const item of payload.items) {
    const dbP = prodMap.get(item.product_id)
    if (!dbP) {
      return { success: false, error: `Product "${item.product_name}" is no longer in the menu` }
    }
    if (!dbP.is_active) {
      return { success: false, error: `Product "${item.product_name}" is archived` }
    }
    if (!dbP.is_available) {
      return { success: false, error: `Product "${item.product_name}" is currently marked unavailable` }
    }
    if (item.quantity <= 0) {
      return { success: false, error: `Invalid quantity for "${item.product_name}"` }
    }

    const verifiedPrice = Number(dbP.base_price)
    const lineTotal = verifiedPrice * item.quantity
    verifiedSubtotal += lineTotal

    validatedItems.push({
      product_id: dbP.id,
      product_name: dbP.name,
      variant_name: item.variant_name || null,
      unit_price: verifiedPrice,
      quantity: item.quantity,
    })
  }

  // Fetch shop tax settings
  const { data: settings } = await supabase
    .from('shop_settings')
    .select('tax_enabled, tax_rate')
    .eq('shop_id', shopId)
    .single()

  const discount = Math.max(0, Number(payload.discount_amount || 0))
  let taxAmount = 0
  if (settings?.tax_enabled && Number(settings.tax_rate) > 0) {
    const taxable = Math.max(0, verifiedSubtotal - discount)
    taxAmount = Number(((taxable * Number(settings.tax_rate)) / 100).toFixed(2))
  }

  const verifiedTotal = Number((verifiedSubtotal - discount + taxAmount).toFixed(2))

  // 2. Execute atomic sale transaction in PostgreSQL
  const { data: result, error: txError } = await supabase.rpc('complete_sale', {
    p_shop_id: shopId,
    p_manager_id: user.id,
    p_idempotency_key: payload.idempotency_key,
    p_items: validatedItems,
    p_subtotal: verifiedSubtotal,
    p_discount_amount: discount,
    p_discount_reason: payload.discount_reason || null,
    p_tax_amount: taxAmount,
    p_total_amount: verifiedTotal,
    p_payment_method: payload.payment_method,
    p_payment_amount: verifiedTotal,
    p_amount_tendered: payload.amount_tendered || null,
    p_change_amount: payload.change_amount || null,
    p_payment_ref: payload.payment_ref
      ? payload.payment_ref + (payload.card_last4 ? ' | Card:****' + payload.card_last4 : '')
      : (payload.card_last4 ? 'Card:****' + payload.card_last4 : null),
    p_customer_name: payload.customer_name || null,
    p_customer_phone: payload.customer_phone || null,
  })

  if (txError) {
    return { success: false, error: txError.message }
  }

  // 3. Fetch full sale snapshot for receipt printing
  const { data: fullSale } = await supabase
    .from('sales')
    .select(`
      *,
      sale_items (*),
      payments (*)
    `)
    .eq('id', result.sale_id)
    .single()

  return {
    success: true,
    sale_id: result.sale_id,
    invoice_no: result.invoice_no,
    duplicate: result.duplicate || false,
    sale: fullSale,
  }
}

export async function logReceiptPrint(
  saleId: string,
  printMethod: 'browser' | 'qz_tray' | 'pdf',
  isDuplicate: boolean,
  status: 'success' | 'failed',
  errorMessage?: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase.from('receipt_print_logs').insert({
    sale_id: saleId,
    printed_by: user.id,
    print_method: printMethod,
    is_duplicate: isDuplicate,
    status: status,
    error_message: errorMessage || null,
  })
}

export async function getSaleByInvoice(invoiceNo: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      profiles (full_name),
      sale_items (*),
      payments (*),
      receipt_print_logs (*)
    `)
    .eq('invoice_no', invoiceNo)
    .single()

  if (error) return null
  return data
}

export async function getRecentSales(limit = 50) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      profiles (full_name),
      sale_items (id, product_name, quantity, unit_price, subtotal),
      payments (method, amount)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data
}
