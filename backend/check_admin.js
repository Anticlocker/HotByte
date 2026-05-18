const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hotbyte',
  password: '12345',
  port: 5432,
});

pool.query('SELECT * FROM admins', (err, res) => {
  if (err) {
    console.error(err);
  } else {
    console.log(res.rows);
  }
  pool.end();
});
