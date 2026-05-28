/**
 * seedExistingHotels.js
 * ──────────────────────────────────────────────────────────────────────────
 * One-time migration/seed utility.
 * Populates default categories and menu items for every existing hotel that
 * currently has an EMPTY menu (zero categories).
 *
 * Safety rules:
 *  • NEVER overwrites / modifies hotels that already have categories.
 *  • Each hotel gets its own isolated copy of categories and items.
 *  • Runs atomically per-hotel (separate transaction per hotel).
 *
 * Usage:
 *   node backend/scripts/seedExistingHotels.js
 *
 * Options (env vars):
 *   DRY_RUN=true   — Print what would be seeded without touching the DB.
 *   HOTEL_ID=5     — Seed only a specific hotel (useful for testing).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../routes/database');
const { seedDefaultMenu } = require('../routes/seedDefaultMenu');

const DRY_RUN  = process.env.DRY_RUN  === 'true';
const HOTEL_ID = process.env.HOTEL_ID ? parseInt(process.env.HOTEL_ID) : null;

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  HotByte — Default Menu Seed for Existing Hotels');
  console.log(`  Mode : ${DRY_RUN ? '🟡 DRY RUN (no changes)' : '🟢 LIVE'}`);
  if (HOTEL_ID) console.log(`  Scope: Hotel ID ${HOTEL_ID} only`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // ── 1. Fetch target hotels ─────────────────────────────────────────────
    let hotelsQuery;
    let hotelsParams;

    if (HOTEL_ID) {
      hotelsQuery = 'SELECT hotel_id, name, slug FROM public.hotels WHERE hotel_id = $1 ORDER BY hotel_id';
      hotelsParams = [HOTEL_ID];
    } else {
      hotelsQuery = 'SELECT hotel_id, name, slug FROM public.hotels ORDER BY hotel_id';
      hotelsParams = [];
    }

    const hotelsRes = await db.query(hotelsQuery, hotelsParams);
    const allHotels = hotelsRes.rows;

    if (allHotels.length === 0) {
      console.log('ℹ️  No hotels found in database.\n');
      process.exit(0);
    }

    console.log(`Found ${allHotels.length} hotel(s). Checking which have empty menus...\n`);

    let seededCount   = 0;
    let skippedCount  = 0;
    let errorCount    = 0;

    // ── 2. Process each hotel ──────────────────────────────────────────────
    for (const hotel of allHotels) {
      const { hotel_id, name, slug } = hotel;

      // Check if the hotel already has categories
      const catCheck = await db.query(
        'SELECT COUNT(*) AS cnt FROM public.menu_category WHERE hotel_id = $1',
        [hotel_id]
      );
      const existingCats = parseInt(catCheck.rows[0].cnt);

      if (existingCats > 0) {
        console.log(`  ⏭️  [${hotel_id}] "${name}" (/${slug})  →  SKIP (already has ${existingCats} categories)`);
        skippedCount++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  🟡 [${hotel_id}] "${name}" (/${slug})  →  WOULD SEED (empty menu)`);
        seededCount++;
        continue;
      }

      // Run seed
      try {
        const result = await seedDefaultMenu(db, hotel_id);
        if (result.seeded) {
          console.log(
            `  ✅ [${hotel_id}] "${name}" (/${slug})  →  SEEDED — ` +
            `${result.categoriesCreated} categories, ${result.itemsCreated} items`
          );
          seededCount++;
        } else {
          // This path shouldn't be reachable given the pre-check above, but handle gracefully
          console.log(`  ⏭️  [${hotel_id}] "${name}"  →  SKIP (seed returned: ${result.reason})`);
          skippedCount++;
        }
      } catch (err) {
        console.error(`  ❌ [${hotel_id}] "${name}"  →  ERROR: ${err.message}`);
        errorCount++;
      }
    }

    // ── 3. Summary ─────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Summary');
    console.log(`  Hotels processed : ${allHotels.length}`);
    console.log(`  ${DRY_RUN ? 'Would seed' : 'Seeded'}      : ${seededCount}`);
    console.log(`  Skipped          : ${skippedCount} (already had menu)`);
    console.log(`  Errors           : ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (errorCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('\n❌ Fatal error during migration:', err.message);
    process.exit(1);
  }
}

main();
