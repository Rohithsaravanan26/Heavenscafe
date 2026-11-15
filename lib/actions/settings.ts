'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ShopSettings, PrinterSettings, Profile } from '@/types/database'

export async function getShopAndPrinterSettings() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('id', profile.shop_id)
    .single()

  const { data: shopSettings } = await supabase
    .from('shop_settings')
    .select('*')
    .eq('shop_id', profile.shop_id)
    .single()

  const { data: printerSettings } = await supabase
    .from('printer_settings')
    .select('*')
    .eq('shop_id', profile.shop_id)
    .single()

  return {
    shop,
    shopSettings,
    printerSettings,
  }
}

export async function updateShopSettingsAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'ADMIN') return { success: false, error: 'Admin permission required' }

  const name = formData.get('shop_name') as string
  const address = (formData.get('address') as string) || null
  const phone = (formData.get('phone') as string) || null
  const invoicePrefix = (formData.get('invoice_prefix') as string) || 'HCF'
  const taxEnabled = formData.get('tax_enabled') === 'true'
  const taxRate = Number(formData.get('tax_rate') || 0)
  const taxLabel = (formData.get('tax_label') as string) || 'GST'

  // Update shop info
  await supabase
    .from('shops')
    .update({ name, address, phone })
    .eq('id', profile.shop_id)

  // Update shop settings
  const { error } = await supabase
    .from('shop_settings')
    .upsert({
      shop_id: profile.shop_id,
      invoice_prefix: invoicePrefix,
      tax_enabled: taxEnabled,
      tax_rate: taxRate,
      tax_label: taxLabel,
    }, {
      onConflict: 'shop_id'
    })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function updatePrinterSettingsAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { success: false, error: 'Profile not found' }

  const printerName = (formData.get('printer_name') as string) || null
  const connectionType = (formData.get('connection_type') as 'browser' | 'qz_tray' | 'network') || 'browser'
  const paperWidth = Number(formData.get('paper_width')) === 58 ? 58 : 80
  const printerIp = (formData.get('printer_ip') as string) || null
  const printerPort = Number(formData.get('printer_port')) || null
  const showTax = formData.get('show_tax') === 'true'

  const { error } = await supabase
    .from('printer_settings')
    .upsert({
      shop_id: profile.shop_id,
      printer_name: printerName,
      connection_type: connectionType,
      paper_width: paperWidth,
      printer_ip: printerIp,
      printer_port: printerPort,
      show_tax: showTax,
    }, {
      onConflict: 'shop_id'
    })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/settings')
  revalidatePath('/pos')
  return { success: true }
}

export async function getStaffList() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true })

  if (error) return []
  return data
}
