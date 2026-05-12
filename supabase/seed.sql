-- ============================================================================
-- Dukan — demo merchant seed
-- 1 merchant, 1 outlet, ~40 SKUs, 5 customers
-- Idempotent: deletes any existing demo first, then inserts.
-- ============================================================================

-- Wipe any prior demo data
delete from merchants where name = 'Sapra Bazar Demo';

-- ---------------------------------------------------------------------------
-- Merchant + outlet
-- ---------------------------------------------------------------------------
with
  m as (
    insert into merchants (name, default_language, timezone, settings)
    values (
      'Sapra Bazar Demo',
      'hi-IN',
      'Asia/Kolkata',
      jsonb_build_object(
        'escalation_triggers', jsonb_build_array(
          'payment_dispute', 'return_request', 'complaint',
          'off_menu', 'bulk_order_over_10k', 'three_strike_misunderstanding'
        ),
        'voice_config', jsonb_build_object(
          'fallback_languages', jsonb_build_array('en-IN'),
          'silence_ms', 600,
          'interruption_threshold_ms', 200
        ),
        'order_caps', jsonb_build_object('max_items', 50, 'max_total_paise', 1000000)
      )
    )
    returning id
  ),
  o as (
    insert into outlets (merchant_id, name, address, phone_number, delivery_zones)
    select m.id, 'Sapra Bazar — Main Outlet', 'FC Road, Pune 411005', '+91 80 1234 5678',
           jsonb_build_array(
             jsonb_build_object('pincode', '411005', 'name', 'Shivaji Nagar'),
             jsonb_build_object('pincode', '411004', 'name', 'Deccan Gymkhana'),
             jsonb_build_object('pincode', '411038', 'name', 'Erandwane')
           )
    from m
    returning id, merchant_id
  )

-- ---------------------------------------------------------------------------
-- Catalog — ~40 typical kirana SKUs
-- ---------------------------------------------------------------------------
insert into catalog_items (merchant_id, sku, name_default, name_localized, aliases, price_paise, unit, stock_count, category)
select o.merchant_id, sku, name_default, name_localized::jsonb, aliases, price_paise, unit, stock_count, category
from o, (values
  -- Atta / flour
  ('atta-aashirvaad-5kg', 'Aashirvaad Atta 5kg', '{"hi":"आशीर्वाद आटा 5 किलो","en":"Aashirvaad Atta 5kg"}', ARRAY['atta', 'aata', 'flour', 'aashirvaad', 'wheat flour'], 28500, '5kg', 50, 'staples'),
  ('atta-fortune-5kg', 'Fortune Chakki Atta 5kg', '{"hi":"फॉर्च्यून आटा 5 किलो","en":"Fortune Atta 5kg"}', ARRAY['fortune', 'chakki atta', 'fortune atta'], 26500, '5kg', 40, 'staples'),

  -- Rice
  ('rice-basmati-1kg', 'India Gate Basmati Rice 1kg', '{"hi":"बासमती चावल 1 किलो","en":"Basmati Rice 1kg"}', ARRAY['rice', 'chawal', 'basmati', 'india gate'], 18500, '1kg', 80, 'staples'),
  ('rice-sona-masoori-5kg', 'Sona Masoori Rice 5kg', '{"hi":"सोना मसूरी 5 किलो","en":"Sona Masoori Rice 5kg"}', ARRAY['sona masoori', 'rice 5kg', 'south indian rice'], 39500, '5kg', 30, 'staples'),

  -- Dal
  ('dal-toor-1kg', 'Toor Dal 1kg', '{"hi":"तूर दाल 1 किलो","en":"Toor Dal 1kg"}', ARRAY['toor dal', 'tur dal', 'arhar dal', 'yellow lentils'], 15500, '1kg', 60, 'staples'),
  ('dal-moong-1kg', 'Moong Dal 1kg', '{"hi":"मूंग दाल 1 किलो","en":"Moong Dal 1kg"}', ARRAY['moong', 'moong dal', 'green gram'], 14500, '1kg', 50, 'staples'),
  ('dal-chana-1kg', 'Chana Dal 1kg', '{"hi":"चना दाल 1 किलो","en":"Chana Dal 1kg"}', ARRAY['chana dal', 'chana', 'bengal gram'], 12500, '1kg', 50, 'staples'),

  -- Oil
  ('oil-fortune-sunflower-1l', 'Fortune Sunflower Oil 1L', '{"hi":"फॉर्च्यून सूरजमुखी तेल 1 लीटर","en":"Fortune Sunflower Oil 1L"}', ARRAY['oil', 'tel', 'sunflower oil', 'fortune oil'], 16500, '1L', 70, 'staples'),
  ('oil-fortune-sunflower-5l', 'Fortune Sunflower Oil 5L', '{"hi":"फॉर्च्यून तेल 5 लीटर","en":"Fortune Sunflower Oil 5L"}', ARRAY['oil 5l', '5 litre oil', 'fortune 5l'], 79500, '5L', 25, 'staples'),

  -- Sugar / salt
  ('sugar-1kg', 'Sugar 1kg', '{"hi":"चीनी 1 किलो","en":"Sugar 1kg"}', ARRAY['sugar', 'cheeni', 'chini'], 4500, '1kg', 100, 'staples'),
  ('salt-tata-1kg', 'Tata Salt 1kg', '{"hi":"टाटा नमक 1 किलो","en":"Tata Salt 1kg"}', ARRAY['salt', 'namak', 'tata salt'], 3000, '1kg', 100, 'staples'),

  -- Dairy
  ('milk-amul-500ml', 'Amul Gold Milk 500ml', '{"hi":"अमूल गोल्ड दूध 500ml","en":"Amul Gold Milk 500ml"}', ARRAY['milk', 'doodh', 'amul', 'amul milk'], 3400, '500ml', 60, 'dairy'),
  ('milk-amul-1l', 'Amul Gold Milk 1L', '{"hi":"अमूल दूध 1 लीटर","en":"Amul Gold Milk 1L"}', ARRAY['amul 1 litre', 'milk 1l', 'doodh 1 litre'], 6600, '1L', 50, 'dairy'),
  ('dahi-amul-400g', 'Amul Dahi 400g', '{"hi":"अमूल दही 400 ग्राम","en":"Amul Curd 400g"}', ARRAY['dahi', 'curd', 'amul dahi', 'yoghurt'], 5500, '400g', 40, 'dairy'),
  ('paneer-amul-200g', 'Amul Paneer 200g', '{"hi":"अमूल पनीर 200 ग्राम","en":"Amul Paneer 200g"}', ARRAY['paneer', 'amul paneer', 'cottage cheese'], 9500, '200g', 30, 'dairy'),
  ('butter-amul-100g', 'Amul Butter 100g', '{"hi":"अमूल मक्खन 100 ग्राम","en":"Amul Butter 100g"}', ARRAY['butter', 'makkhan', 'amul butter'], 5500, '100g', 40, 'dairy'),
  ('ghee-amul-500ml', 'Amul Ghee 500ml', '{"hi":"अमूल घी 500ml","en":"Amul Ghee 500ml"}', ARRAY['ghee', 'amul ghee'], 35500, '500ml', 25, 'dairy'),

  -- Vegetables (representative)
  ('aloo-1kg', 'Aloo (Potato) 1kg', '{"hi":"आलू 1 किलो","en":"Potato 1kg"}', ARRAY['aloo', 'potato', 'alu'], 4000, '1kg', 80, 'vegetables'),
  ('pyaaz-1kg', 'Pyaaz (Onion) 1kg', '{"hi":"प्याज़ 1 किलो","en":"Onion 1kg"}', ARRAY['pyaaz', 'onion', 'kanda'], 4500, '1kg', 80, 'vegetables'),
  ('tamatar-500g', 'Tamatar (Tomato) 500g', '{"hi":"टमाटर 500 ग्राम","en":"Tomato 500g"}', ARRAY['tamatar', 'tomato'], 3500, '500g', 60, 'vegetables'),
  ('hari-mirch-100g', 'Hari Mirch (Green Chilli) 100g', '{"hi":"हरी मिर्च 100 ग्राम","en":"Green Chilli 100g"}', ARRAY['hari mirch', 'chilli', 'green chilli'], 2000, '100g', 30, 'vegetables'),
  ('adrak-100g', 'Adrak (Ginger) 100g', '{"hi":"अदरक 100 ग्राम","en":"Ginger 100g"}', ARRAY['adrak', 'ginger'], 2500, '100g', 40, 'vegetables'),
  ('lehsun-100g', 'Lehsun (Garlic) 100g', '{"hi":"लहसुन 100 ग्राम","en":"Garlic 100g"}', ARRAY['lehsun', 'garlic'], 3500, '100g', 40, 'vegetables'),

  -- Biscuits / snacks
  ('biscuits-parle-g-150g', 'Parle-G 150g', '{"hi":"पार्ले-जी 150 ग्राम","en":"Parle-G 150g"}', ARRAY['parle g', 'parle', 'biscuit', 'parle-g'], 2500, '150g', 100, 'snacks'),
  ('biscuits-good-day-200g', 'Britannia Good Day 200g', '{"hi":"गुड डे 200 ग्राम","en":"Good Day 200g"}', ARRAY['good day', 'biscuit', 'britannia'], 4500, '200g', 60, 'snacks'),
  ('biscuits-marie-150g', 'Marie Gold 150g', '{"hi":"मेरी गोल्ड 150 ग्राम","en":"Marie Gold 150g"}', ARRAY['marie gold', 'marie biscuit', 'marie'], 2000, '150g', 50, 'snacks'),
  ('lays-classic-50g', 'Lays Classic Salted 50g', '{"hi":"लेज़ साल्टेड 50 ग्राम","en":"Lays Classic 50g"}', ARRAY['lays', 'chips', 'salted chips'], 2000, '50g', 80, 'snacks'),

  -- Cleaning
  ('surf-excel-1kg', 'Surf Excel Easy Wash 1kg', '{"hi":"सर्फ़ एक्सेल 1 किलो","en":"Surf Excel 1kg"}', ARRAY['surf', 'detergent', 'surf excel', 'washing powder'], 28000, '1kg', 40, 'cleaning'),
  ('vim-bar-200g', 'Vim Dishwash Bar 200g', '{"hi":"विम बार 200 ग्राम","en":"Vim Bar 200g"}', ARRAY['vim', 'dishwash', 'vim bar', 'bartan saabun'], 1500, '200g', 60, 'cleaning'),
  ('harpic-500ml', 'Harpic Toilet Cleaner 500ml', '{"hi":"हार्पिक 500ml","en":"Harpic 500ml"}', ARRAY['harpic', 'toilet cleaner'], 11500, '500ml', 30, 'cleaning'),

  -- Personal care
  ('soap-dove-100g', 'Dove Soap 100g', '{"hi":"डव साबुन 100 ग्राम","en":"Dove Soap 100g"}', ARRAY['dove', 'soap', 'dove soap'], 6500, '100g', 50, 'personal-care'),
  ('shampoo-clinic-plus-175ml', 'Clinic Plus Shampoo 175ml', '{"hi":"क्लिनिक प्लस 175ml","en":"Clinic Plus Shampoo 175ml"}', ARRAY['shampoo', 'clinic plus'], 9500, '175ml', 30, 'personal-care'),
  ('toothpaste-colgate-150g', 'Colgate Strong Teeth 150g', '{"hi":"कोलगेट 150 ग्राम","en":"Colgate Toothpaste 150g"}', ARRAY['colgate', 'toothpaste', 'manjan'], 11500, '150g', 40, 'personal-care'),

  -- Beverages
  ('tea-tata-250g', 'Tata Premium Tea 250g', '{"hi":"टाटा चाय 250 ग्राम","en":"Tata Tea 250g"}', ARRAY['tea', 'chai', 'tata tea', 'chai patti'], 14500, '250g', 40, 'beverages'),
  ('coffee-nescafe-50g', 'Nescafe Classic 50g', '{"hi":"नेस्कैफे 50 ग्राम","en":"Nescafe 50g"}', ARRAY['coffee', 'nescafe', 'instant coffee'], 17500, '50g', 30, 'beverages'),
  ('coke-750ml', 'Coca Cola 750ml', '{"hi":"कोका कोला 750ml","en":"Coca Cola 750ml"}', ARRAY['coke', 'coca cola', 'cold drink', 'cola'], 4500, '750ml', 50, 'beverages'),

  -- Eggs / bread
  ('eggs-12pc', 'Eggs (12 pcs)', '{"hi":"अंडे 12 पीस","en":"Eggs 12 pcs"}', ARRAY['eggs', 'ande', 'anda', 'egg'], 8500, '12-pack', 30, 'dairy'),
  ('bread-britannia-400g', 'Britannia Brown Bread 400g', '{"hi":"ब्राउन ब्रेड 400 ग्राम","en":"Brown Bread 400g"}', ARRAY['bread', 'pav', 'britannia bread', 'brown bread'], 4500, '400g', 40, 'bakery'),
  ('maggi-70g', 'Maggi 2-min Noodles 70g', '{"hi":"मैगी 70 ग्राम","en":"Maggi Noodles 70g"}', ARRAY['maggi', 'noodles', 'maggie'], 1400, '70g', 80, 'snacks')

) as items(sku, name_default, name_localized, aliases, price_paise, unit, stock_count, category);

-- ---------------------------------------------------------------------------
-- Customers — 5 demo regulars
-- ---------------------------------------------------------------------------
with merchant as (select id from merchants where name = 'Sapra Bazar Demo'),
  c1 as (
    insert into customers (merchant_id, phone, name, preferred_language, total_orders, lifetime_value_paise)
    select id, '+919876543210', 'Raj Sharma', 'hi-IN', 24, 845000 from merchant
    returning id, merchant_id
  ),
  c2 as (
    insert into customers (merchant_id, phone, name, preferred_language, total_orders, lifetime_value_paise)
    select id, '+919876543211', 'Anita Mehta', 'hi-IN', 18, 612000 from merchant
    returning id, merchant_id
  ),
  c3 as (
    insert into customers (merchant_id, phone, name, preferred_language, total_orders, lifetime_value_paise)
    select id, '+919876543212', 'Vikram Joshi', 'mr-IN', 31, 1124000 from merchant
    returning id, merchant_id
  ),
  c4 as (
    insert into customers (merchant_id, phone, name, preferred_language, total_orders, lifetime_value_paise)
    select id, '+919876543213', 'Priya Iyer', 'en-IN', 12, 384000 from merchant
    returning id, merchant_id
  ),
  c5 as (
    insert into customers (merchant_id, phone, name, preferred_language, total_orders, lifetime_value_paise)
    select id, '+919876543214', 'Sunil Kulkarni', 'mr-IN', 7, 156000 from merchant
    returning id, merchant_id
  )
insert into customer_addresses (customer_id, label, full_text, is_default) values
  ((select id from c1), 'home', 'Flat 502, Sapphire Heights, FC Road, Pune 411005', true),
  ((select id from c2), 'home', 'Bungalow 14, Prabhat Road, Pune 411004', true),
  ((select id from c3), 'home', '203, Karve Nagar, Pune 411052', true),
  ((select id from c4), 'home', 'Flat 7B, Erandwane Apartments, Pune 411038', true),
  ((select id from c5), 'home', 'Row House 12, Senapati Bapat Road, Pune 411016', true);
