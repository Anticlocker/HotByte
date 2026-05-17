const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME || "hotbyte",
    password: process.env.DB_PASSWORD || "12345",
    port: parseInt(process.env.DB_PORT) || 5432
});

const updates = {
    'Butter Naan': 'https://images.pexels.com/photos/9510204/pexels-photo-9510204.jpeg?auto=compress&cs=tinysrgb&w=500',
    'Jeera Rice': 'https://images.pexels.com/photos/12737650/pexels-photo-12737650.jpeg?auto=compress&cs=tinysrgb&w=500',
    'Ras Malai': 'https://images.pexels.com/photos/10103760/pexels-photo-10103760.jpeg?auto=compress&cs=tinysrgb&w=500',
    'Mineral Water': 'https://images.pexels.com/photos/416528/pexels-photo-416528.jpeg?auto=compress&cs=tinysrgb&w=500'
};

async function fixImages() {
    try {
        console.log("Fixing 4 broken image URLs with verified high-performance Pexels versions...");
        for (const [itemName, imageUrl] of Object.entries(updates)) {
            const query = `
                UPDATE public.menu_items 
                SET image_url = $1 
                WHERE item_name = $2;
            `;
            await pool.query(query, [imageUrl, itemName]);
            console.log(`✅ Fixed image URL for "${itemName}"`);
        }
        console.log("Database update complete.");
    } catch (err) {
        console.error("Database connection error:", err);
    } finally {
        await pool.end();
    }
}

fixImages();
