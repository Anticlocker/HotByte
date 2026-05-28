/**
 * seedDefaultMenu.js
 * ──────────────────────────────────────────────────────────────────────────
 * Onboarding seed service.
 * Creates the 4 default categories and 22 starter menu items for a hotel.
 *
 * Features:
 *  • Runs inside a database transaction — rolls back fully on any error.
 *  • Duplicate-safe  — skips hotels that already have categories.
 *  • Multi-tenant    — every record is scoped to the given hotel_id.
 *  • Dynamic IDs     — never hard-codes category_id; resolves after insert.
 *
 * Usage (inside any async function):
 *   const { seedDefaultMenu } = require('./seedDefaultMenu');
 *   const result = await seedDefaultMenu(db, hotelId);
 *   // result → { seeded: true|false, categoriesCreated, itemsCreated, reason? }
 */

// ─── 1. Default Category Definitions ────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  'Starters',
  'Main Course',
  'Desserts',
  'Beverages',
];

// ─── 2. Default Menu Items (category referenced by name, not ID) ─────────────
const DEFAULT_ITEMS = [
  // ── Starters ──
  {
    category: 'Starters',
    item_name: 'Paneer Tikka Angara',
    price: 249.00,
    image_url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=80',
    description: 'Spicy grilled cottage cheese with bell peppers.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Starters',
    item_name: 'Crispy Corn',
    price: 179.00,
    image_url: 'https://images.unsplash.com/photo-1517093602195-b40af9688b46?auto=format&fit=crop&w=500&q=80',
    description: 'Golden fried sweet corn kernels with spices.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Starters',
    item_name: 'Hara Bhara Kabab',
    price: 189.00,
    image_url: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=500&q=80',
    description: 'Healthy spinach and green pea patties.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Starters',
    item_name: 'Veg Manchurian',
    price: 199.00,
    image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=500&q=80',
    description: 'Indo-Chinese style vegetable balls in spicy gravy.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Starters',
    item_name: 'Spring Rolls',
    price: 169.00,
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80',
    description: 'Crispy rolls stuffed with sautéed vegetables.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Starters',
    item_name: 'Chilli Paneer',
    price: 229.00,
    image_url: 'https://images.unsplash.com/photo-1624462966581-bc6d768cbce5?auto=format&fit=crop&w=500&q=80',
    description: 'Cottage cheese cubes tossed in spicy chilli sauce.',
    is_available: true,
    is_veg: true,
  },

  // ── Main Course ──
  {
    category: 'Main Course',
    item_name: 'Butter Chicken',
    price: 299.00,
    image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=500&q=80',
    description: 'Classic creamy chicken curry in tomato gravy.',
    is_available: true,
    is_veg: false,
  },
  {
    category: 'Main Course',
    item_name: 'Hyderabadi Biryani',
    price: 279.00,
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80',
    description: 'Authentic slow-cooked basmati rice with spices.',
    is_available: true,
    is_veg: false,
  },
  {
    category: 'Main Course',
    item_name: 'Veg Diwani Handi',
    price: 239.00,
    image_url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=500&q=80',
    description: 'Assorted vegetables cooked in a rich handi gravy.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Main Course',
    item_name: 'Fish Curry',
    price: 329.00,
    image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80',
    description: 'Traditional coastal style fish curry.',
    is_available: true,
    is_veg: false,
  },
  {
    category: 'Main Course',
    item_name: 'Paneer Butter Masala',
    price: 259.00,
    image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80',
    description: 'Cottage cheese in a rich and creamy tomato sauce.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Main Course',
    item_name: 'Dal Tadka',
    price: 179.00,
    image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80',
    description: 'Yellow lentils tempered with aromatic spices.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Main Course',
    item_name: 'Laccha Paratha',
    price: 59.00,
    image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80',
    description: 'Multi-layered flaky whole wheat flatbread.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Main Course',
    item_name: 'Butter Naan',
    price: 49.00,
    image_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=500&q=80',
    description: 'Soft and buttery leavened flatbread.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Main Course',
    item_name: 'Jeera Rice',
    price: 149.00,
    image_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=500&q=80',
    description: 'Basmati rice tempered with cumin seeds.',
    is_available: true,
    is_veg: true,
  },

  // ── Desserts ──
  {
    category: 'Desserts',
    item_name: 'Kesari Firni',
    price: 129.00,
    image_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=500&q=80',
    description: 'Traditional saffron infused ground rice pudding.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Desserts',
    item_name: 'Gulab Jamun',
    price: 99.00,
    image_url: 'https://images.unsplash.com/photo-1605333396915-47ed6b68a00e?auto=format&fit=crop&w=500&q=80',
    description: 'Soft khoya balls soaked in sugar syrup.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Desserts',
    item_name: 'Ras Malai',
    price: 139.00,
    image_url: 'https://images.unsplash.com/photo-1589135306090-e5552a196d86?auto=format&fit=crop&w=500&q=80',
    description: 'Flattened cottage cheese balls in thickened milk.',
    is_available: true,
    is_veg: true,
  },

  // ── Beverages ──
  {
    category: 'Beverages',
    item_name: 'Masala Chaas',
    price: 49.00,
    image_url: 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?auto=format&fit=crop&w=500&q=80',
    description: 'Refreshing spiced buttermilk with mint.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Beverages',
    item_name: 'Mango Lassi',
    price: 89.00,
    image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=500&q=80',
    description: 'Thick yogurt drink blended with sweet mangoes.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Beverages',
    item_name: 'Fresh Lime Soda',
    price: 59.00,
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80',
    description: 'Zesty lime soda served sweet or salted.',
    is_available: true,
    is_veg: true,
  },
  {
    category: 'Beverages',
    item_name: 'Mineral Water',
    price: 20.00,
    image_url: 'https://images.unsplash.com/photo-1608889175123-8ec330b86f84?auto=format&fit=crop&w=500&q=80',
    description: 'Packaged 1L drinking water.',
    is_available: true,
    is_veg: true,
  },
];

// ─── 3. Core seed function ───────────────────────────────────────────────────
/**
 * Seeds default categories and menu items for a hotel.
 *
 * @param {object} db      - pg Pool or Client with .query()
 * @param {number} hotelId - The hotel's primary key
 * @returns {Promise<{seeded:boolean, categoriesCreated:number, itemsCreated:number, reason?:string}>}
 */
async function seedDefaultMenu(db, hotelId, useExistingTransaction = false) {
  // ── Duplicate Guard ─────────────────────────────────────────────────────
  const existingCheck = await db.query(
    'SELECT COUNT(*) AS cnt FROM public.menu_category WHERE hotel_id = $1',
    [hotelId]
  );
  if (parseInt(existingCheck.rows[0].cnt) > 0) {
    return {
      seeded: false,
      categoriesCreated: 0,
      itemsCreated: 0,
      reason: 'Hotel already has categories — skipping seed to prevent duplicates.',
    };
  }

  // ── Begin Transaction (if not already in one) ───────────────────────────
  const client = useExistingTransaction ? db : await db.connect();
  try {
    if (!useExistingTransaction) await client.query('BEGIN');

    // ── Step 1: Insert categories and collect generated IDs ──────────────
    const categoryIdMap = {}; // { 'Starters': 12, 'Main Course': 13, ... }

    for (const catName of DEFAULT_CATEGORIES) {
      const res = await client.query(
        `INSERT INTO public.menu_category (category_name, hotel_id)
         VALUES ($1, $2)
         RETURNING category_id`,
        [catName, hotelId]
      );
      categoryIdMap[catName] = res.rows[0].category_id;
    }

    // ── Step 2: Insert menu items mapped to the just-created IDs ─────────
    let itemsCreated = 0;
    for (const item of DEFAULT_ITEMS) {
      const catId = categoryIdMap[item.category];
      if (!catId) continue; // Safety guard — should never happen

      await client.query(
        `INSERT INTO public.menu_items
           (item_name, category_id, price, image_url, description, is_available, is_veg, hotel_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          item.item_name,
          catId,
          item.price,
          item.image_url,
          item.description,
          item.is_available,
          item.is_veg,
          hotelId,
        ]
      );
      itemsCreated++;
    }

    if (!useExistingTransaction) await client.query('COMMIT');

    console.log(
      `✅ [seedDefaultMenu] Hotel ${hotelId}: seeded ${DEFAULT_CATEGORIES.length} categories, ${itemsCreated} items.`
    );

    return {
      seeded: true,
      categoriesCreated: DEFAULT_CATEGORIES.length,
      itemsCreated,
    };
  } catch (err) {
    if (!useExistingTransaction) await client.query('ROLLBACK');
    console.error(`❌ [seedDefaultMenu] Hotel ${hotelId}: seed failed.`, err.message);
    throw err; // Re-throw so the caller can handle it
  } finally {
    if (!useExistingTransaction) client.release();
  }
}

module.exports = { seedDefaultMenu, DEFAULT_CATEGORIES, DEFAULT_ITEMS };
