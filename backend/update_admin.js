const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hotbyte',
  password: '12345',
  port: 5432,
});

pool.query("UPDATE admins SET password = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' WHERE username = 'ravi'", (err, res) => {
  if (err) console.error(err);
  else console.log("Updated password to admin123");
  pool.end();
});
