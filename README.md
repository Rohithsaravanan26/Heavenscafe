# Heaven's Cafe – Complete POS, Billing, Inventory & Business Management System

A production-grade, centralized web application engineered for **Heaven's Cafe**. Built with Next.js 16 (App Router), TypeScript (strict mode), Tailwind CSS, shadcn/ui, and Supabase PostgreSQL.

---

## 1. System Architecture

The application contains two distinct, role-enforced interfaces backed by a single centralized PostgreSQL database:

### A. Admin Dashboard (`/admin`)
Used by the cafe owner remotely with complete administrative access:
- **Business Overview**: Real-time sales KPIs, average order value, operating expenses, net profit, low stock count.
- **Sales & Billing History**: Search by bill number, date, cashier, product; view full item snapshots; reprint bills.
- **Menu & Pricing**: Dynamic categories, product CRUD, price modification with immutable price audit logs, availability toggles, inventory tracking config.
- **Inventory & Ingredients**: Raw ingredients (g, kg, ml, l, pcs), stock movements history, minimum stock thresholds, suppliers directory.
- **Operational Expenses**: Rent, electricity, gas, staff salaries, repairs, and direct market ingredients.
- **Reports & P&L Analysis**: Monthly P&L statement, top selling items by quantity and revenue, payment method breakdown.
- **Staff Accounts**: Manager and admin accounts with role-based permissions.
- **Business & Printer Settings**: Cafe address, contact phone, invoice numbering prefix, tax configuration, 58mm/80mm thermal receipt printer configuration.
- **Audit Logs**: Tamper-evident log of all sensitive commercial actions.
- **Notifications Inbox**: Low-stock alerts, critical stock warnings, cash discrepancies.

### B. Shop Manager POS (`/pos`)
Used by the physical operator of the cafe:
- **New Billing**: High-speed touch-friendly product catalogue, live search, category pills, cart with real-time subtotal, discount permissions, tax, cash tendered calculator, and change returned display.
- **Physical Bill Printing**: 58mm and 80mm ESC/POS thermal receipt formatting with QZ Tray bridge and browser fallback.
- **Previous Bills**: Search recent receipts and trigger reprint marked as `DUPLICATE / REPRINT`.
- **Stock Inward**: Log incoming ingredients, unit costs, and purchase orders from suppliers.
- **Wastage Entry**: Log damaged or spoiled stock with mandatory reasons.
- **Daily Closing**: Cash reconciliation comparing physical drawer cash with database sales, discrepancy detection, and admin alert.

---

## 2. Design System & Brand Identity

The UI faithfully matches the vintage-inspired Heaven's Cafe aesthetic:
- **Background**: `#F8F3E9` (Warm parchment)
- **Surface**: `#FFFDF8` (Ivory card surface)
- **Espresso**: `#43291F` (Primary deep coffee brand)
- **Dark Text**: `#30231E` (Dark coffee text)
- **Terracotta**: `#B56C4A` (Warm terracotta accent)
- **Olive**: `#737B52` (Secondary olive green accent)
- **Border**: `#E8DED0` (Subtle warm parchment borders)
- **Typography**: `Playfair Display` for serif headings, `Inter` for clean body typography, and `JetBrains Mono` / `Courier New` for thermal receipts.

---

## 3. Technology Stack

- **Framework**: Next.js 16.4.6 with Turbopack (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth (Session handling, server-side validation)
- **State Management**: TanStack Query v5 + React 19
- **Forms & Validation**: React Hook Form + Zod
- **Analytics & Charts**: Recharts + date-fns
- **Icons**: Lucide React
- **Printing**: Monospace ESC/POS format for 58mm & 80mm printers, QZ Tray bridge, and dedicated thermal CSS print media query.

---

## 4. Setup & Installation Guide

### Prerequisites
- Node.js 20+ (Node.js 24 recommended)
- npm 10+
- A Supabase project (Free or Pro tier)

### Step 1: Clone or Navigate to Project
```bash
cd "d:\HEAVEN's billing\heavens-cafe"
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```
Fill in your Supabase project credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Database Setup & Migrations

Execute the migration scripts in numerical order using the **Supabase Dashboard → SQL Editor** or Supabase CLI:

1. `supabase/migrations/001_extensions.sql` — Enables `uuid-ossp` and `pgcrypto`.
2. `supabase/migrations/002_core.sql` — Creates `shops`, `profiles`, `role_permissions`, `shop_settings`, and `printer_settings`.
3. `supabase/migrations/003_menu.sql` — Creates `menu_categories`, `products`, `product_price_history`, `product_variants`, `product_addons`, and `product_images`.
4. `supabase/migrations/004_inventory.sql` — Creates `suppliers`, `ingredients`, `recipes`, `recipe_items`, `purchase_orders`, `purchase_items`, and `stock_movements`.
5. `supabase/migrations/005_billing.sql` — Creates `sales`, `sale_items`, `payments`, `refunds`, `refund_items`, and `receipt_print_logs`.
6. `supabase/migrations/006_business.sql` — Creates `expenses`, `daily_closings`, `notifications`, and `audit_logs`.
7. `supabase/migrations/007_rls.sql` — Configures comprehensive Row Level Security policies for role isolation.
8. `supabase/migrations/008_functions.sql` — Defines atomic PostgreSQL functions:
   - `complete_sale(...)`: Transaction-safe sale completion with price snapshot, recipe inventory deduction, audit logging, and idempotency protection.
   - `receive_stock(...)`: Atomic stock inward entry and purchase order logging.
   - `record_wastage(...)`: Traceable stock deduction with mandatory reason.
   - `check_low_stock_alerts(...)`: Generates notifications when stock crosses threshold.
   - `get_dashboard_kpis(...)`: Computes real commercial metrics.
9. `supabase/migrations/009_views.sql` — Defines analytical database views:
   - `daily_sales_summary`
   - `monthly_sales_summary`
   - `product_sales_performance`
   - `payment_method_summary`
   - `hourly_sales_heatmap`
   - `inventory_status`

---

## 6. Initial Menu Catalogue Import

The database seed contains all **43 products across 13 categories** matching the Heaven's Cafe printed menu:
- **Hot Beverages**: Tea (₹15), Coffee (₹20), Lemon Tea (₹15)
- **Savouries & Snacks**: Veg Puffs (₹15), Egg Puffs (₹20), Chicken Puffs (₹25), Veg Samosa (₹10), Chicken Samosa (₹15)
- **Potato Fries**: French Fries Classic (₹40), French Fries Peri-Peri (₹45), Potato Smilies (₹50)
- **Breads**: Plain Bread Omelet (₹40), Cheese Bread Omelet (₹45), Chicken Bread Omelet (₹50), Chicken Cheese Bread Omelet (₹55)
- **Sandwich**: Veg Sandwich (₹40), Veg Cheese Sandwich (₹50), Paneer Sandwich (₹60), Chicken Cheese Sandwich (₹70)
- **Rolls**: Veg Roll (₹40), Chicken Roll (₹50)
- **Chicken Corner**: Chicken Lollipop (₹130), Chicken Strips (₹120), Loaded Chicken Fries (₹100), Honey Garlic Chicken (₹90), Chicken Nuggets (₹60), Chicken Cutlet (₹30)
- **Momos Corner**: Veg Fried Momos (₹60), Chicken Fried Momos (₹80)
- **Sea Foods**: Fish Finger (₹90)
- **Maggie**: Veg Maggie (₹40), Egg Maggie (₹45), Chicken Maggie (₹50), Chicken Cheese Maggie (₹60)
- **Pasta**: Veg White Sauce Pasta (₹80), Chicken White Sauce Pasta (₹90)
- **Burger**: Veg Burger (₹80), Chicken Burger (₹90)
- **Mojito**: Blueberry Mint (₹40), Strawberry Mint (₹40), Green Apple Mint (₹40), Orange Mint (₹40), Mango Mint (₹40)

To import this data idempotently, execute:
```sql
supabase/seed.sql
```
in your Supabase SQL editor.

---

## 7. Creating Initial Admin & Manager Users

1. In Supabase Dashboard → **Authentication** → **Users**, click **Add User**.
   - Create an admin user with your email and a strong password.
   - Create a manager user (e.g. `manager@heavenscafe.com`).

2. Link their user IDs to `profiles` in the SQL Editor:
```sql
-- Admin profile
INSERT INTO profiles (id, shop_id, full_name, role, is_active)
SELECT 
  '<admin-user-uuid-from-auth.users>',
  (SELECT id FROM shops WHERE name = 'Heaven''s Cafe' LIMIT 1),
  'Cafe Owner',
  'ADMIN',
  TRUE;

-- Shop Manager profile
INSERT INTO profiles (id, shop_id, full_name, role, is_active)
SELECT 
  '<manager-user-uuid-from-auth.users>',
  (SELECT id FROM shops WHERE name = 'Heaven''s Cafe' LIMIT 1),
  'Store Manager',
  'SHOP_MANAGER',
  TRUE;
```

---

## 8. Physical Thermal Receipt Printing Guide

Heaven's Cafe supports two printing workflows:

### A. Universal Browser Thermal Print (Zero Setup)
1. Go to **Admin → Business Settings → Thermal Receipt Printer**.
2. Select **Paper Width**: `80mm` or `58mm`.
3. Set **Print Bridge**: `Browser Print`.
4. When a bill is completed in POS, click **Print Bill**. The browser's print dialog opens automatically formatted for narrow thermal paper with zero margins and font scaling.

### B. Direct Silent ESC/POS Printing via QZ Tray Bridge
1. Download and install [QZ Tray](https://qz.io/download/) on the POS terminal computer.
2. Connect your 58mm or 80mm thermal receipt printer via USB or Network.
3. In **Admin → Business Settings**, select **Print Bridge**: `QZ Tray Bridge` and enter your exact printer name (e.g. `POS-80C`).
4. Completed bills will print silently without browser print dialog popups. If QZ Tray is not running, the system automatically falls back to browser printing without discarding the sale.

---

## 9. Testing & Quality Assurance

Run the production build test:
```bash
npm run build
```
Start the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to test:
- `/login`: Compulsory sign-in with role-based routing.
- `/pos`: Interactive POS terminal, product grid, cart calculations, cash tendered change calculator, thermal receipt generation.
- `/pos/bills`: Previous bills list and duplicate reprint testing.
- `/pos/stock`: Inward stock receiving entry.
- `/pos/wastage`: Wastage entry with inventory deduction.
- `/pos/closing`: End-of-day cash reconciliation.
- `/admin`: Real KPI dashboard, revenue trend charts, and low-stock alerts.
- `/admin/menu`: Product price updates and price history audit logs.
- `/admin/settings`: Store details, GST rates, and thermal printer test bill.

---

## 10. Backup & Disaster Recovery

### Managed Supabase Backups
- Supabase automatically performs daily logical backups for all Pro plans with point-in-time recovery (PITR).
- For self-managed backups, run PostgreSQL dump periodically:
```bash
pg_dump -h db.<your-project>.supabase.co -U postgres -d postgres > heavens_cafe_backup_$(date +%Y%m%d).sql
```
- Restoration can be performed via `psql`:
```bash
psql -h db.<your-project>.supabase.co -U postgres -d postgres < heavens_cafe_backup_YYYYMMDD.sql
```
