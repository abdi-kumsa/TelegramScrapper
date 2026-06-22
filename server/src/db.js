import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

let client;

/**
 * Creates and returns a Turso/libSQL client.
 *
 * In production (TURSO_DATABASE_URL set), connects to the remote Turso database.
 * In development, uses a local SQLite file so no account is required.
 */
export function createDbClient() {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL || "file:./data/collector.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  client = createClient({ url, authToken });

  return client;
}

/**
 * Returns the existing database client.
 */
export function getDb() {
  if (!client) throw new Error("Database not initialised. Call initDb() first.");
  return client;
}

/**
 * Initialises the database: runs the schema migration and seeds the two users.
 */
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

  // Indexes
  await db.execute("CREATE INDEX IF NOT EXISTS idx_channels_url ON channels(url)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_channels_added ON channels(added_at)");
}

// ── seeds ────────────────────────────────────────────────────────────────────

const SEED_USERS = [
  { email: "kumsaaabdii@gmail.com", password: "1qaz, xsw2'" },
  { email: "oliftadele@gmail.com",  password: "1qaz, xsw2'" },
];

async function seedUsers(db) {
  const result = await db.execute("SELECT COUNT(*) AS cnt FROM users");
  if (result.rows[0].cnt > 0) return;

  const insert = "INSERT INTO users (email, password) VALUES (?, ?)";

  await db.transaction(async (tx) => {
    for (const u of SEED_USERS) {
      const hash = bcrypt.hashSync(u.password, 10);
      await tx.execute({ sql: insert, args: [u.email, hash] });
    }
  });

  console.log(`✓ Seeded ${SEED_USERS.length} users`);
}
