const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS "public"."users" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "password_hash" TEXT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS "public"."slips" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
      "income_amount" FLOAT8 NOT NULL,
      "tax_deducted" FLOAT8 NOT NULL,
      "received_date" TIMESTAMPTZ NOT NULL,
      "slip_image_url" TEXT NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL
    );
  `);

  console.log('Tables created.');
  await client.end();
}
run().catch(console.error);
