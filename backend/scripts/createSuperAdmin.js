require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../routes/database');
const bcrypt = require('bcrypt');

async function createSuperAdmin() {
  const username = process.env.SUPER_ADMIN_USERNAME || 'Admin';
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@hotbyte.in';
  const phone = process.env.SUPER_ADMIN_PHONE;
  const role = 'super_admin';

  if (!password) {
    console.error('❌ ERROR: SUPER_ADMIN_PASSWORD environment variable is required to bootstrap a super admin.');
    process.exit(1);
  }

  try {
    const hashed = await bcrypt.hash(password, 12);

    // Check if username already exists
    const existing = await db.query('SELECT admin_id FROM public.admins WHERE username = $1', [username]);
    if (existing.rows.length === 0) {
      await db.query(
        'INSERT INTO public.admins (name, username, email, password, role, phone) VALUES ($1, $2, $3, $4, $5, $6)',
        [name, username, email, hashed, role, phone]
      );
      console.log(`✅ Super admin "${username}" created successfully.`);
    } else {
      // If it exists, update the credentials securely
      await db.query(
        'UPDATE public.admins SET password = $1, name = $2, email = $3, phone = $4, role = $5 WHERE username = $6',
        [hashed, name, email, phone, role, username]
      );
      console.log(`✅ Super admin "${username}" credentials updated successfully.`);
    }
  } catch (error) {
    console.error('❌ Failed to bootstrap Super Admin:', error);
    process.exit(1);
  }
}

createSuperAdmin()
  .then(() => {
    // End pool connection cleanly
    db.end(() => {
      process.exit(0);
    });
  })
  .catch((err) => {
    console.error('Error in script execution:', err);
    process.exit(1);
  });
