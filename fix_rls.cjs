const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  
  await client.query('ALTER TABLE "public"."users" DISABLE ROW LEVEL SECURITY;');
  await client.query('ALTER TABLE "public"."slips" DISABLE ROW LEVEL SECURITY;');
  
  console.log('RLS disabled.');
  await client.end();
}
run().catch(console.error);
