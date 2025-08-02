import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if we're using Neon (contains neon.tech) or local PostgreSQL
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('neon.dev');

let pool: NeonPool | PgPool;
let db: ReturnType<typeof neonDrizzle> | ReturnType<typeof pgDrizzle>;

if (isNeonDatabase) {
  // Use Neon serverless for cloud database
  console.log('🌐 Using Neon serverless database');
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = neonDrizzle(pool as NeonPool, { schema });
} else {
  // Use standard PostgreSQL for local database
  console.log('🐘 Using local PostgreSQL database');
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  db = pgDrizzle(pool as PgPool, { schema });
}

export { pool, db };