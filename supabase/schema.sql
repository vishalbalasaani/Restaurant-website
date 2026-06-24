-- =============================================
-- FLAVOUR HOUSE — Database Schema
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage categories" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  image_url TEXT DEFAULT '',
  is_veg BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read available products" ON products FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  mobile_number TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Authenticated can manage profiles" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- =============================================
-- ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT NOT NULL,
  order_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read own orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public can update orders" ON orders FOR UPDATE USING (true);
CREATE POLICY "Authenticated can manage orders" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- ORDER ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  image_url TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can create order items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read order items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage order items" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- RESTAURANT SETTINGS TABLE (Single Row)
-- =============================================
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT DEFAULT 'Flavour House',
  phone TEXT DEFAULT '+91 98765 43210',
  whatsapp TEXT DEFAULT '919876543210',
  instagram TEXT DEFAULT 'https://instagram.com/flavourhouse',
  address TEXT DEFAULT '42, Spice Lane, Jubilee Hills, Hyderabad — 500033',
  opening_time TIME DEFAULT '11:00',
  closing_time TIME DEFAULT '23:00',
  kitchen_open BOOLEAN DEFAULT true,
  upi_id TEXT DEFAULT 'flavourhouse@upi',
  bank_details TEXT DEFAULT 'HDFC Bank | A/C: 1234567890 | IFSC: HDFC0001234',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read settings" ON restaurant_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated can update settings" ON restaurant_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_settings;

-- =============================================
-- STORAGE BUCKET FOR PRODUCT IMAGES
-- =============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- =============================================
-- SEED DATA
-- =============================================

-- Insert default restaurant settings
INSERT INTO restaurant_settings (business_name) VALUES ('Flavour House');

-- Seed Categories
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Starters', 'starters', 1),
  ('Biryani', 'biryani', 2),
  ('Curries', 'curries', 3),
  ('Drinks', 'drinks', 4),
  ('Desserts', 'desserts', 5);

-- Seed Products (using Unsplash placeholder images)
INSERT INTO products (name, description, price, image_url, is_veg, is_available, category_id, sort_order) VALUES
  -- Starters
  ('Paneer Tikka', 'Marinated cottage cheese grilled to perfection with mint chutney', 249, 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'starters'), 1),
  ('Chicken 65', 'Spicy deep-fried chicken with curry leaves and green chillies', 299, 'https://images.unsplash.com/photo-1610057099443-fde6c99db9e1?w=400&h=300&fit=crop', false, true, (SELECT id FROM categories WHERE slug = 'starters'), 2),
  ('Veg Spring Rolls', 'Crispy rolls stuffed with fresh vegetables and served with sweet chili sauce', 199, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'starters'), 3),
  ('Mutton Seekh Kebab', 'Minced mutton skewers with aromatic spices, grilled on charcoal', 349, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop', false, true, (SELECT id FROM categories WHERE slug = 'starters'), 4),

  -- Biryani
  ('Hyderabadi Chicken Biryani', 'Fragrant basmati rice layered with tender chicken and aromatic spices', 349, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop', false, true, (SELECT id FROM categories WHERE slug = 'biryani'), 1),
  ('Veg Dum Biryani', 'Slow-cooked basmati rice with seasonal vegetables and whole spices', 279, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'biryani'), 2),
  ('Mutton Biryani', 'Traditional Hyderabadi mutton biryani slow-cooked in sealed pot', 449, 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=400&h=300&fit=crop', false, true, (SELECT id FROM categories WHERE slug = 'biryani'), 3),
  ('Egg Biryani', 'Flavourful rice with boiled eggs and rich masala gravy', 249, 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400&h=300&fit=crop', false, true, (SELECT id FROM categories WHERE slug = 'biryani'), 4),

  -- Curries
  ('Butter Chicken', 'Tender chicken in rich, creamy tomato-based sauce with butter and cream', 329, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop', false, true, (SELECT id FROM categories WHERE slug = 'curries'), 1),
  ('Dal Makhani', 'Creamy black lentils slow-cooked overnight with butter and spices', 229, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'curries'), 2),
  ('Palak Paneer', 'Cottage cheese cubes in smooth, spiced spinach gravy', 259, 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'curries'), 3),
  ('Chicken Chettinad', 'South Indian style chicken curry with freshly ground spices', 319, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop', false, true, (SELECT id FROM categories WHERE slug = 'curries'), 4),

  -- Drinks
  ('Mango Lassi', 'Chilled yogurt drink blended with fresh Alphonso mango pulp', 149, 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'drinks'), 1),
  ('Masala Chai', 'Traditional Indian tea brewed with cardamom, ginger, and cinnamon', 79, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'drinks'), 2),
  ('Fresh Lime Soda', 'Refreshing lime soda — sweet or salted, your choice', 99, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed514?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'drinks'), 3),
  ('Cold Coffee', 'Creamy iced coffee blended with vanilla ice cream', 169, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'drinks'), 4),

  -- Desserts
  ('Gulab Jamun', 'Soft milk dumplings soaked in fragrant rose-cardamom syrup', 149, 'https://images.unsplash.com/photo-1666190060504-40bbe801e1b0?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'desserts'), 1),
  ('Rasmalai', 'Soft paneer discs soaked in saffron-infused sweetened milk', 179, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'desserts'), 2),
  ('Chocolate Brownie', 'Warm, fudgy chocolate brownie with vanilla ice cream', 199, 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'desserts'), 3),
  ('Kulfi', 'Traditional Indian ice cream with pistachios and saffron', 129, 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=400&h=300&fit=crop', true, true, (SELECT id FROM categories WHERE slug = 'desserts'), 4);
