-- ============================================================
-- SEED 013: Update All 43 Products with Benchmark Manufacturing Costs
-- Ensures accurate real-time profit and loss calculations
-- ============================================================

-- Hot Beverages
UPDATE products SET cost_price = 5.00, current_stock = 150, min_stock = 20 WHERE name = 'Tea';
UPDATE products SET cost_price = 7.00, current_stock = 100, min_stock = 15 WHERE name = 'Coffee';
UPDATE products SET cost_price = 4.00, current_stock = 80, min_stock = 10 WHERE name = 'Lemon Tea';

-- Savouries & Snacks
UPDATE products SET cost_price = 7.00, current_stock = 30, min_stock = 5 WHERE name = 'Veg Puffs';
UPDATE products SET cost_price = 9.00, current_stock = 25, min_stock = 5 WHERE name = 'Egg Puffs';
UPDATE products SET cost_price = 12.00, current_stock = 30, min_stock = 5 WHERE name = 'Chicken Puffs';
UPDATE products SET cost_price = 11.00, current_stock = 20, min_stock = 5 WHERE name = 'Mushroom Puffs';
UPDATE products SET cost_price = 11.00, current_stock = 20, min_stock = 5 WHERE name = 'Paneer Puffs';
UPDATE products SET cost_price = 4.00, current_stock = 40, min_stock = 10 WHERE name = 'Samosa';

-- Potato Fries
UPDATE products SET cost_price = 22.00, current_stock = 50, min_stock = 10 WHERE name = 'French Fries (Salted)';
UPDATE products SET cost_price = 25.00, current_stock = 40, min_stock = 10 WHERE name = 'Masala Fries';
UPDATE products SET cost_price = 28.00, current_stock = 40, min_stock = 10 WHERE name = 'Peri Peri Fries';
UPDATE products SET cost_price = 32.00, current_stock = 35, min_stock = 8 WHERE name = 'Cheesy Fries';

-- Garlic Breads
UPDATE products SET cost_price = 20.00, current_stock = 30, min_stock = 5 WHERE name = 'Plain Garlic Bread';
UPDATE products SET cost_price = 28.00, current_stock = 30, min_stock = 5 WHERE name = 'Cheese Garlic Bread';
UPDATE products SET cost_price = 32.00, current_stock = 25, min_stock = 5 WHERE name = 'Corn Cheese Garlic Bread';
UPDATE products SET cost_price = 36.00, current_stock = 25, min_stock = 5 WHERE name = 'Paneer Cheese Garlic Bread';

-- Sandwiches
UPDATE products SET cost_price = 22.00, current_stock = 30, min_stock = 5 WHERE name = 'Veg Grilled Sandwich';
UPDATE products SET cost_price = 25.00, current_stock = 25, min_stock = 5 WHERE name = 'Corn Cheese Sandwich';
UPDATE products SET cost_price = 30.00, current_stock = 20, min_stock = 5 WHERE name = 'Paneer Sandwich';
UPDATE products SET cost_price = 34.00, current_stock = 25, min_stock = 5 WHERE name = 'Chicken Sandwich';
UPDATE products SET cost_price = 42.00, current_stock = 20, min_stock = 5 WHERE name = 'Club Sandwich';

-- Rolls
UPDATE products SET cost_price = 18.00, current_stock = 25, min_stock = 5 WHERE name = 'Veg Roll';
UPDATE products SET cost_price = 26.00, current_stock = 20, min_stock = 5 WHERE name = 'Paneer Roll';
UPDATE products SET cost_price = 30.00, current_stock = 25, min_stock = 5 WHERE name = 'Chicken Roll';
UPDATE products SET cost_price = 22.00, current_stock = 20, min_stock = 5 WHERE name = 'Egg Roll';

-- Fried Chicken
UPDATE products SET cost_price = 35.00, current_stock = 30, min_stock = 8 WHERE name = 'Chicken Popcorn';
UPDATE products SET cost_price = 40.00, current_stock = 25, min_stock = 5 WHERE name = 'Chicken Strips';
UPDATE products SET cost_price = 48.00, current_stock = 20, min_stock = 5 WHERE name = 'Chicken Wings';
UPDATE products SET cost_price = 52.00, current_stock = 20, min_stock = 5 WHERE name = 'Chicken Lollipop';

-- Momos
UPDATE products SET cost_price = 20.00, current_stock = 30, min_stock = 8 WHERE name = 'Veg Steamed Momos';
UPDATE products SET cost_price = 24.00, current_stock = 30, min_stock = 8 WHERE name = 'Veg Fried Momos';
UPDATE products SET cost_price = 28.00, current_stock = 25, min_stock = 8 WHERE name = 'Chicken Steamed Momos';
UPDATE products SET cost_price = 32.00, current_stock = 25, min_stock = 8 WHERE name = 'Chicken Fried Momos';

-- Seafood
UPDATE products SET cost_price = 45.00, current_stock = 20, min_stock = 5 WHERE name = 'Fish Finger';
UPDATE products SET cost_price = 50.00, current_stock = 20, min_stock = 5 WHERE name = 'Prawns Popcorn';

-- Maggie
UPDATE products SET cost_price = 10.00, current_stock = 50, min_stock = 10 WHERE name = 'Plain Maggie';
UPDATE products SET cost_price = 15.00, current_stock = 40, min_stock = 10 WHERE name = 'Veg Maggie';
UPDATE products SET cost_price = 18.00, current_stock = 35, min_stock = 8 WHERE name = 'Cheese Maggie';
UPDATE products SET cost_price = 24.00, current_stock = 30, min_stock = 8 WHERE name = 'Chicken Maggie';

-- Pasta
UPDATE products SET cost_price = 28.00, current_stock = 25, min_stock = 5 WHERE name = 'White Sauce Veg Pasta';
UPDATE products SET cost_price = 28.00, current_stock = 25, min_stock = 5 WHERE name = 'Red Sauce Veg Pasta';
UPDATE products SET cost_price = 38.00, current_stock = 20, min_stock = 5 WHERE name = 'White Sauce Chicken Pasta';
UPDATE products SET cost_price = 38.00, current_stock = 20, min_stock = 5 WHERE name = 'Red Sauce Chicken Pasta';

-- Burger
UPDATE products SET cost_price = 25.00, current_stock = 30, min_stock = 5 WHERE name = 'Veg Burger';
UPDATE products SET cost_price = 30.00, current_stock = 25, min_stock = 5 WHERE name = 'Cheese Burger';
UPDATE products SET cost_price = 38.00, current_stock = 25, min_stock = 5 WHERE name = 'Chicken Burger';
UPDATE products SET cost_price = 46.00, current_stock = 20, min_stock = 5 WHERE name = 'Zinger Burger';

-- Mojito
UPDATE products SET cost_price = 18.00, current_stock = 40, min_stock = 10 WHERE name = 'Mint Mojito';
UPDATE products SET cost_price = 22.00, current_stock = 35, min_stock = 8 WHERE name = 'Blue Curacao';
UPDATE products SET cost_price = 22.00, current_stock = 35, min_stock = 8 WHERE name = 'Green Apple';
UPDATE products SET cost_price = 22.00, current_stock = 35, min_stock = 8 WHERE name = 'Watermelon';

-- Fallback for any other product: default cost to 40% of base_price
UPDATE products
  SET cost_price = ROUND(base_price * 0.40, 2),
      current_stock = 50,
      min_stock = 10,
      track_stock = TRUE
  WHERE cost_price = 0.00;
