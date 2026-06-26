const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const crypto = require("crypto");

async function testQueries() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to DB successfully.");
    
    // Simulate steps of admin login:
    const username = 'test';
    
    // 1. SELECT admin
    const adminRes = await client.query(
      "SELECT admin_id, username, hotel_id, role, password FROM admins WHERE username = $1",
      [username]
    );
    const admin = adminRes.rows[0];
    console.log("Admin found:", admin);

    // 2. Resolve hotel slug
    let hotelSlug = null;
    if (admin.hotel_id) {
      const hotelRes = await client.query("SELECT slug FROM public.hotels WHERE hotel_id = $1", [admin.hotel_id]);
      if (hotelRes.rows.length > 0) {
        hotelSlug = hotelRes.rows[0].slug;
      }
    }
    console.log("Hotel Slug Resolved:", hotelSlug);

    // 3. createAdminSession steps:
    const adminId = admin.admin_id;
    const sessionId = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const userAgent = "Mozilla/5.0";

    console.log("Deleting old sessions for admin:", adminId);
    const delRes = await client.query("DELETE FROM sessions WHERE admin_id = $1", [adminId]);
    console.log("Deleted old sessions count:", delRes.rowCount);

    console.log("Inserting new session...");
    const insRes = await client.query(
      "INSERT INTO sessions (session_id, admin_id, user_agent, expires_at) VALUES ($1, $2, $3, $4)",
      [sessionId, adminId, userAgent, expiresAt]
    );
    console.log("Inserted new session count:", insRes.rowCount);

    console.log("Cleaning up expired sessions...");
    const cleanRes = await client.query("DELETE FROM sessions WHERE expires_at < NOW()");
    console.log("Cleaned expired sessions count:", cleanRes.rowCount);

    console.log("All queries executed successfully without error!");
  } catch (error) {
    console.error("QUERY ERROR:", error);
  } finally {
    await client.end();
  }
}

testQueries();
