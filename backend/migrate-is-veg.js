const db = require("./routes/database");

async function migrate() {
  try {
    console.log("Starting DB migration to add is_veg...");

    // 1. Alter table to add is_veg column if not exists
    await db.query(`
      ALTER TABLE public.menu_items 
      ADD COLUMN IF NOT EXISTS is_veg boolean DEFAULT true;
    `);
    console.log("✅ is_veg column created successfully (or already exists).");

    // 2. Set specific known non-vegetarian dishes to is_veg = false
    const nonVegItems = [
      "Butter Chicken",
      "Fish Curry",
      "Chicken Tikka",
      "Hyderabadi Biryani",
      "Mutton Biryani",
      "Egg Curry"
    ];

    for (const itemName of nonVegItems) {
      const result = await db.query(
        "UPDATE public.menu_items SET is_veg = false WHERE item_name ILIKE $1 RETURNING item_name",
        [`%${itemName}%`]
      );
      if (result.rowCount > 0) {
        console.log(`✅ Set non-veg status to false for: ${itemName}`);
      }
    }

    // 3. Print out a summary of the menu items and their veg status
    const summary = await db.query(`
      SELECT item_id, item_name, is_veg, is_available, price 
      FROM public.menu_items 
      ORDER BY item_name
    `);
    console.log("\n--- Current Menu Items Status ---");
    summary.rows.forEach(row => {
      console.log(`[${row.is_veg ? "VEG" : "NON-VEG"}] ${row.item_name} - ₹${row.price}`);
    });

    console.log("\n🎉 Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrate();
