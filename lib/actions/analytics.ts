'use server'

import { createClient } from '@/lib/supabase/server'
import { DashboardKPIs } from '@/types/database'

export async function getDashboardOverview() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'ADMIN') return null

  const shopId = profile.shop_id
  const todayStr = new Date().toISOString().split('T')[0]
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0]

  // 1. Fetch Commercial Summary for Today
  const { data: todaySummary } = await supabase.rpc('get_commercial_summary', {
    p_shop_id: shopId,
    p_start_date: todayStr,
    p_end_date: todayStr,
  })

  // 2. Fetch Commercial Summary for This Month
  const { data: monthSummary } = await supabase.rpc('get_commercial_summary', {
    p_shop_id: shopId,
    p_start_date: currentMonthStart,
    p_end_date: todayStr,
  })

  // 3. Fallback or baseline KPIs
  const kpis: DashboardKPIs = {
    today_sales: Number(todaySummary?.gross_sales || 0),
    today_bills: Number(todaySummary?.total_bills || 0),
    month_sales: Number(monthSummary?.gross_sales || 0),
    month_bills: Number(monthSummary?.total_bills || 0),
    avg_order_value: Number(todaySummary?.avg_bill || 0),
    items_today: 0,
    low_stock_count: Number(todaySummary?.low_stock_count || 0),
  }

  // 4. Fetch low stock products (item-level)
  const { data: lowStockProducts } = await supabase
    .from('products')
    .select('id, name, base_price, cost_price, current_stock, min_stock')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .eq('track_stock', true)
    .order('current_stock', { ascending: true })

  const filteredLowStock = (lowStockProducts || []).filter(
    (p) => Number(p.current_stock) <= Number(p.min_stock)
  )

  // 5. Recent 7-day trend
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: recentDays } = await supabase
    .from('daily_sales_summary')
    .select('*')
    .eq('shop_id', shopId)
    .gte('sale_date', sevenDaysAgo)
    .order('sale_date', { ascending: true })

  return {
    kpis,
    today_cogs: Number(todaySummary?.total_cogs || 0),
    today_gross_profit: Number(todaySummary?.gross_profit || 0),
    today_wastage_loss: Number(todaySummary?.wastage_loss || 0),
    today_net_profit: Number(todaySummary?.net_profit || 0),
    month_cogs: Number(monthSummary?.total_cogs || 0),
    month_wastage_loss: Number(monthSummary?.wastage_loss || 0),
    month_net_profit: Number(monthSummary?.net_profit || 0),
    total_expenses: Number(monthSummary?.expenses || 0),
    net_profit: Number(monthSummary?.net_profit || 0),
    recent_trend: recentDays || [],
    low_stock_items: filteredLowStock.slice(0, 10),
  }
}

export async function getProductStockList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user.id).single()
  if (!profile) return []

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      base_price,
      cost_price,
      current_stock,
      min_stock,
      track_stock,
      is_available,
      menu_categories (name)
    `)
    .eq('shop_id', profile.shop_id)
    .eq('is_active', true)
    .order('category_id')

  if (error) return []
  return data || []
}

export async function getSalesChartData(days = 14) {
  const supabase = await createClient()

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data } = await supabase
    .from('daily_sales_summary')
    .select('*')
    .gte('sale_date', startDate)
    .order('sale_date', { ascending: true })

  return data || []
}

export async function getTopProducts(limit = 10) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('product_sales_performance')
    .select('*')
    .order('total_quantity', { ascending: false })
    .limit(limit)

  return data || []
}

export async function getPaymentMethodDistribution() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('payment_method_summary')
    .select('*')
    .order('sale_date', { ascending: false })
    .limit(30)

  // Aggregate by method
  const methodMap: Record<string, { count: number; total: number }> = {}
  if (data) {
    for (const row of data) {
      if (!methodMap[row.method]) {
        methodMap[row.method] = { count: 0, total: 0 }
      }
      methodMap[row.method].count += Number(row.transaction_count || 0)
      methodMap[row.method].total += Number(row.total_amount || 0)
    }
  }

  return Object.entries(methodMap).map(([method, stats]) => ({
    method,
    count: stats.count,
    total: Number(stats.total.toFixed(2)),
  }))
}

export async function getAuditLogs(limit = 50) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles (full_name, role)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data
}
