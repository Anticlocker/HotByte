require('dotenv').config();
const db = require('../routes/database');
const crypto = require('crypto');

const hashPassword = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

async function createSuperAdmin() {
  const username = 'superadmin';
  const password = 'SuperAdmin123';
  const name = 'Super Admin';
  const role = 'super_admin';
  const hashed = hashPassword(password);

  // Check if a super admin already exists
  const existing = await db.query('SELECT admin_id FROM admins WHERE username = $1', [username]);
  if (existing.rows.length === 0) {
    await db.query(
      'INSERT INTO admins (name, username, email, password, role) VALUES ($1, $2, $3, $4, $5)',
      [name, username, null, hashed, role]
    );
    console.log('Super admin created: ', { username, password });
  } else {
    console.log('Super admin already exists');
  }
}

createSuperAdmin()
  .then(() => process.exit())
  .catch((err) => {
    console.error('Error creating super admin:', err);
    process.exit(1);
  });
