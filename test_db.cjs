const { Client } = require('pg');

async function testConnection() {
  const connectionString = 'postgres://postgres.csptdvmhmpzglwomvqod:UimA7gJpMjzgJFd8@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('Connected successfully:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection error', err.stack);
    
    // Fallback test to alternative port 5432
    console.log("Trying fallback port 5432...");
    const client2 = new Client({ connectionString: connectionString.replace('6543', '5432') });
    try {
      await client2.connect();
      console.log('Connected via 5432!');
      await client2.end();
    } catch (err2) {
      console.error('Fallback connection error', err2.stack);
    }
  }
}

testConnection();
