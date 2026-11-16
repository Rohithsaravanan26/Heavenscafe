export type UserRole = 'ADMIN' | 'SHOP_MANAGER'

export interface Profile {
  id: string
  shop_id: string
  full_name: string
  phone: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Shop {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  gst_number: string | null
  logo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ShopSettings {
  id: string
  shop_id: string
  invoice_prefix: string
  tax_enabled: boolean
  tax_rate: number
  tax_label: string
  currency_symbol: string
  created_at: string
  updated_at: string
}

export interface PrinterSettings {
  id: string
  shop_id: string
  printer_name: string | null
  connection_type: 'browser' | 'qz_tray' | 'network'
  paper_width: 58 | 80
  printer_ip: string | null
  printer_port: number | null
  header_lines: string[]
  footer_lines: string[]
  show_tax: boolean
  created_at: string
  updated_at: string
}

export interface MenuCategory {
  id: string
  shop_id: string
  name: string
  display_order: number
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  shop_id: string
  category_id: string
  name: string
  description: string | null
  base_price: number
  is_active: boolean
  is_available: boolean
  track_inventory: boolean
  display_order: number
  is_featured: boolean
  created_at: string
  updated_at: string
  // relations
  menu_categories?: MenuCategory
  product_variants?: ProductVariant[]
  product_addons?: ProductAddon[]
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  price_adjustment: number
  is_available: boolean
  display_order: number
  created_at: string
}

export interface ProductAddon {
  id: string
  product_id: string
  name: string
  price: number
  is_available: boolean
  created_at: string
}

export interface ProductPriceHistory {
  id: string
  product_id: string
  old_price: number
  new_price: number
  changed_by: string
  changed_at: string
  reason: string | null
}

export interface ProductImage {
  id: string
  product_id: string
  storage_path: string
  url: string
  is_primary: boolean
  created_at: string
}

export interface Sale {
  id: string
  shop_id: string
  invoice_no: string
  manager_id: string
  customer_name: string | null
  customer_phone: string | null
  subtotal: number
  discount_amount: number
  discount_reason: string | null
  tax_amount: number
  total_amount: number
  status: 'completed' | 'cancelled' | 'refunded'
  idempotency_key: string
  created_at: string
  updated_at: string
  // relations
  profiles?: Profile
  sale_items?: SaleItem[]
  payments?: Payment[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  product_name: string
  variant_name: string | null
  unit_price: number
  quantity: number
  subtotal: number
  created_at: string
}

export interface Payment {
  id: string
  sale_id: string
  method: 'cash' | 'upi' | 'card' | 'other'
  amount: number
  amount_tendered: number | null
  change_amount: number | null
  reference: string | null
  created_at: string
}

export interface Refund {
  id: string
  sale_id: string
  reason: string
  total_amount: number
  processed_by: string
  created_at: string
}

export interface RefundItem {
  id: string
  refund_id: string
  sale_item_id: string
  quantity: number
  amount: number
}

export interface ReceiptPrintLog {
  id: string
  sale_id: string
  printed_by: string
  print_method: 'browser' | 'qz_tray' | 'pdf'
  is_duplicate: boolean
  status: 'success' | 'failed' | 'pending'
  error_message: string | null
  created_at: string
}

export interface Ingredient {
  id: string
  shop_id: string
  name: string
  unit: 'g' | 'kg' | 'ml' | 'l' | 'pcs'
  min_stock: number
  current_stock: number
  cost_per_unit: number | null
  preferred_supplier_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // relations
  suppliers?: Supplier
}

export interface Recipe {
  id: string
  product_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
  // relations
  recipe_items?: (RecipeItem & { ingredients?: Ingredient })[]
}

export interface RecipeItem {
  id: string
  recipe_id: string
  ingredient_id: string
  quantity: number
  ingredients?: Ingredient
}

export interface Supplier {
  id: string
  shop_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: string
  shop_id: string
  supplier_id: string | null
  reference_no: string | null
  received_by: string
  total_cost: number
  notes: string | null
  received_at: string
  created_at: string
  // relations
  suppliers?: Supplier
  purchase_items?: PurchaseItem[]
}

export interface PurchaseItem {
  id: string
  purchase_order_id: string
  ingredient_id: string
  quantity: number
  unit_cost: number
  total_cost: number
  ingredients?: Ingredient
}

export interface StockMovement {
  id: string
  shop_id: string
  ingredient_id: string
  movement_type: 'purchase' | 'sale_deduction' | 'wastage' | 'adjustment' | 'opening'
  quantity: number
  unit_cost: number | null
  reference_id: string | null
  reference_type: string | null
  reason: string | null
  stock_before: number
  stock_after: number
  performed_by: string
  created_at: string
  // relations
  ingredients?: Ingredient
  profiles?: Profile
}

export interface Expense {
  id: string
  shop_id: string
  category: 'rent' | 'electricity' | 'gas' | 'salary' | 'maintenance' | 'ingredients' | 'other'
  description: string
  amount: number
  expense_date: string
  reference: string | null
  recorded_by: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface DailyClosing {
  id: string
  shop_id: string
  closing_date: string
  cash_sales: number
  upi_sales: number
  card_sales: number
  other_sales: number
  total_sales: number
  expected_cash: number
  actual_cash: number
  difference: number
  remarks: string | null
  submitted_by: string
  reviewed_by: string | null
  status: 'submitted' | 'reviewed' | 'discrepancy'
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Notification {
  id: string
  shop_id: string
  type: 'low_stock' | 'critical_stock' | 'out_of_stock' | 'daily_closing' | 'discrepancy' | 'system'
  title: string
  message: string
  related_id: string | null
  related_type: string | null
  is_read: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  shop_id: string
  user_id: string
  action_type: string
  table_name: string
  record_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  profiles?: Profile
}

// POS & Cart Client Types
export interface CartItem {
  id: string // unique item key in cart (e.g. productId + variantId)
  product_id: string
  product_name: string
  category_name?: string
  variant_id?: string
  variant_name?: string
  unit_price: number
  quantity: number
  subtotal: number
  addons?: {
    addon_id: string
    addon_name: string
    price: number
  }[]
}

export interface CheckoutPayload {
  shop_id: string
  manager_id: string
  idempotency_key: string
  items: {
    product_id: string
    product_name: string
    variant_name?: string | null
    unit_price: number
    quantity: number
  }[]
  subtotal: number
  discount_amount: number
  discount_reason?: string | null
  tax_amount: number
  total_amount: number
  payment_method: 'cash' | 'upi' | 'card' | 'other'
  payment_amount: number
  amount_tendered?: number | null
  change_amount?: number | null
  payment_ref?: string | null
  card_last4?: string | null
  customer_name?: string | null
  customer_phone?: string | null
}

export interface DashboardKPIs {
  today_sales: number
  today_bills: number
  month_sales: number
  month_bills: number
  avg_order_value: number
  items_today: number
  low_stock_count: number
}
