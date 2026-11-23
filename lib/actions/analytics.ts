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
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const todayStartIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const monthStartIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // 1. Fetch Today's Completed Sales (Unjoined to eliminate duplicate row multiplication)
  const { data: todaySales } = await supabase
    .from('sales')
    .select('id, total_amount, sale_items(cost_price, quantity, profit)')
    .eq('shop_id', shopId)
    .eq('status', 'completed')
    .gte('created_at', todayStartIso)

  const todayGrossSales = (todaySales || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
  const todayTotalBills = (todaySales || []).length
  let todayCogs = 0
  let todayGrossProfit = 0
  for (const s of todaySales || []) {
    for (const item of (s as any).sale_items || []) {
      const cp = Number(item.cost_price || 0)
      const qty = Number(item.quantity || 0)
      todayCogs += cp * qty
      todayGrossProfit += Number(item.profit || 0)
    }
  }
  if (todayGrossProfit === 0 && todayGrossSales > 0) {
    todayGrossProfit = Math.max(0, todayGrossSales - todayCogs)
  }

  // 2. Fetch This Month's Completed Sales
  const { data: monthSales } = await supabase
    .from('sales')
    .select('id, total_amount, sale_items(cost_price, quantity, profit)')
    .eq('shop_id', shopId)
    .eq('status', 'completed')
    .gte('created_at', monthStartIso)

  const monthGrossSales = (monthSales || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
  const monthTotalBills = (monthSales || []).length
  let monthCogs = 0
  let monthGrossProfit = 0
  for (const s of monthSales || []) {
    for (const item of (s as any).sale_items || []) {
      const cp = Number(item.cost_price || 0)
      const qty = Number(item.quantity || 0)
      monthCogs += cp * qty
      monthGrossProfit += Number(item.profit || 0)
    }
  }
  if (monthGrossProfit === 0 && monthGrossSales > 0) {
    monthGrossProfit = Math.max(0, monthGrossSales - monthCogs)
  }

  // 3. Wastages
  const { data: wastages } = await supabase
    .from('product_wastages')
    .select('total_loss, wastage_date')
    .eq('shop_id', shopId)
    .gte('wastage_date', currentMonthStart)

  const todayWastageLoss = (wastages || [])
    .filter((w) => w.wastage_date === todayStr)
    .reduce((sum, w) => sum + Number(w.total_loss || 0), 0)

  const monthWastageLoss = (wastages || [])
    .reduce((sum, w) => sum + Number(w.total_loss || 0), 0)

  // 4. Operational Store Expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, expense_date')
    .eq('shop_id', shopId)
    .gte('expense_date', currentMonthStart)

  const todayExpenses = (expenses || [])
    .filter((e) => e.expense_date === todayStr)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0)

  const monthExpenses = (expenses || [])
    .reduce((sum, e) => sum + Number(e.amount || 0), 0)

  // 5. Net Profits
  const todayNetProfit = todayGrossProfit - todayWastageLoss - todayExpenses
  const monthNetProfit = monthGrossProfit - monthWastageLoss - monthExpenses

  // 6. Fetch low stock products (item-level)
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

  const kpis: DashboardKPIs = {
    today_sales: todayGrossSales,
    today_bills: todayTotalBills,
    month_sales: monthGrossSales,
    month_bills: monthTotalBills,
    avg_order_value: todayTotalBills > 0 ? Number((todayGrossSales / todayTotalBills).toFixed(2)) : 0,
    items_today: 0,
    low_stock_count: filteredLowStock.length,
  }

  // 7. Recent 7-day trend
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: recentDays } = await supabase
    .from('daily_sales_summary')
    .select('*')
    .eq('shop_id', shopId)
    .gte('sale_date', sevenDaysAgo)
    .order('sale_date', { ascending: true })

  return {
    kpis,
    today_cogs: todayCogs,
    today_gross_profit: todayGrossProfit,
    today_wastage_loss: todayWastageLoss,
    today_net_profit: todayNetProfit,
    today_expenses: todayExpenses,
    month_cogs: monthCogs,
    month_wastage_loss: monthWastageLoss,
    month_net_profit: monthNetProfit,
    total_expenses: monthExpenses,
    net_profit: monthNetProfit,
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

