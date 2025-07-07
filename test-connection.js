const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.feholpuhfucmhmkesgqc:i5cBU8wqM%26iU_.A@aws-0-eu-north-1.pooler.supabase.com:6543/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    await client.connect();
    console.log('Connected to database!');
    
    const res = await client.query('SELECT current_database(), current_user;');
    console.log('Database info:', res.rows[0]);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();
