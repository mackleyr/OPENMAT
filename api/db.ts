// @ts-nocheck
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const useSsl =
  process.env.DATABASE_SSL === "true" || connectionString.includes("supabase.co");
const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);

export default pool;
