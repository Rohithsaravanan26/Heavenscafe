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

  // 1. Fetch real stored function KPIs
  const { data: kpiData, error: kpiErr } = await supabase.rpc('get_dashboard_kpis', {
    p_shop_id: shopId,
  })

  const kpis: DashboardKPIs = kpiData || {
    today_sales: 0,
    today_bills: 0,
    month_sales: 0,
    month_bills: 0,
    avg_order_value: 0,
    items_today: 0,
    low_stock_count: 0,
  }

  // 2. Fetch monthly operating expenses
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('shop_id', shopId)
    .gte('expense_date', currentMonthStart)

  const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0)

  // 3. Fetch recent 7-day revenue trend
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: recentDays } = await supabase
    .from('daily_sales_summary')
    .select('*')
    .eq('shop_id', shopId)
    .gte('sale_date', sevenDaysAgo)
    .order('sale_date', { ascending: true })

  // 4. Fetch low stock items
  const { data: lowStockItems } = await supabase
    .from('ingredients')
    .select('id, name, unit, current_stock, min_stock')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .filter('current_stock', 'lte', 'min_stock')
    .limit(5)

  // Net profit calculation = Month revenue - Month operating expenses
  const netProfit = Number((kpis.month_sales - totalExpenses).toFixed(2))

  return {
    kpis,
    total_expenses: totalExpenses,
    net_profit: netProfit,
    recent_trend: recentDays || [],
    low_stock_items: lowStockItems || [],
  }
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
