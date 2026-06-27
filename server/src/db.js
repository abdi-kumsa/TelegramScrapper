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

  const checkCount = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='channels'");
  const tableExists = checkCount.rows.length > 0;

  if (!tableExists) {
    // New database, create fresh table
    await db.execute(`
      CREATE TABLE channels (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        url         TEXT    NOT NULL UNIQUE,
        added_by    INTEGER NOT NULL,
        added_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        status      TEXT    NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'processing', 'completed')),
        assigned_to INTEGER,
        FOREIGN KEY (added_by) REFERENCES users(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id)
      )
    `);
  } else {
    // Table exists, check if it needs migration
    let hasAssignedTo = false;
    try {
      const tableInfo = await db.execute("PRAGMA table_info(channels)");
      hasAssignedTo = tableInfo.rows.some(r => r.name === 'assigned_to');
    } catch (err) { }

    if (!hasAssignedTo) {
      console.log("Migrating channels table to new schema...");
      await db.execute("ALTER TABLE channels RENAME TO channels_old");
      
      await db.execute(`
        CREATE TABLE channels (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          url         TEXT    NOT NULL UNIQUE,
          added_by    INTEGER NOT NULL,
          added_at    TEXT    NOT NULL DEFAULT (datetime('now')),
          status      TEXT    NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'processing', 'completed')),
          assigned_to INTEGER,
          FOREIGN KEY (added_by) REFERENCES users(id),
          FOREIGN KEY (assigned_to) REFERENCES users(id)
        )
      `);

      await db.execute(`
        INSERT INTO channels (id, url, added_by, added_at, status)
        SELECT id, url, added_by, added_at, 
          CASE WHEN status = 'collected' THEN 'completed' ELSE 'pending' END
        FROM channels_old
      `);

      await db.execute("DROP TABLE channels_old");
      console.log("Migration complete.");
    }
  }

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
