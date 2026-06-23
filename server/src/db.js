import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

let client;

export function createDbClient() {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL || "file:./data/collector.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  client = createClient({ url, authToken });
  return client;
}

export function getDb() {
  if (!client) throw new Error("Database not initialised. Call initDb() first.");
  return client;
}

export async function initDb() {
  const db = createDbClient();
  await runMigrations(db);
  await seedUsers(db);
  return db;
}

// ── migrations ───────────────────────────────────────────────────────────────
async function runMigrations(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS channels (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      url         TEXT    NOT NULL UNIQUE,
      added_by    INTEGER NOT NULL,
      added_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      status      TEXT    NOT NULL DEFAULT 'pending scrape'
        CHECK (status IN ('collected', 'pending scrape'))
    )
  `);

  await db.execute("CREATE INDEX IF NOT EXISTS idx_channels_url ON channels(url)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_channels_added ON channels(added_at)");
}

// ── seeds ────────────────────────────────────────────────────────────────────
const SEED_USERS = [
  { email: "kumsaaabdii@gmail.com", password: process.env.USER1_PASSWORD },
  { email: "oliftadele@gmail.com",  password: process.env.USER2_PASSWORD },
];

async function seedUsers(db) {
  // Only seeds once — if users already exist, skip entirely
  const result = await db.execute("SELECT COUNT(*) AS cnt FROM users");
  if (result.rows[0].cnt > 0) return;

  if (!process.env.USER1_PASSWORD || !process.env.USER2_PASSWORD) {
    console.error("✗ USER1_PASSWORD or USER2_PASSWORD env vars are missing. Skipping seed.");
    return;
  }

  const insert = "INSERT INTO users (email, password) VALUES (?, ?)";
  for (const u of SEED_USERS) {
    const hash = bcrypt.hashSync(u.password, 10);
    await db.execute({ sql: insert, args: [u.email, hash] });
  }

  console.log(`✓ Seeded ${SEED_USERS.length} users`);
}
