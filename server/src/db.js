import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Allow override via env var (Render persistent disk) or default to local path
const DB_PATH = process.env.DB_PATH || join(__dirname, "..", "data", "collector.db");

let db;

/**
 * Initialises the database: creates the data directory, opens the file,
 * runs the schema migration, and seeds the two fixed users.
 */
export function initDb() {
  if (db) return db;

  // Ensure the data directory exists
  const dataDir = dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations();
  seedUsers();

  return db;
}

/**
 * Returns the existing database instance.
 */
export function getDb() {
  if (!db) throw new Error("Database not initialised. Call initDb() first.");
  return db;
}

// ── migrations ───────────────────────────────────────────────────────────────

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS channels (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      url         TEXT    NOT NULL UNIQUE,
      added_by    INTEGER NOT NULL,
      added_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      status      TEXT    NOT NULL DEFAULT 'pending scrape'
        CHECK (status IN ('collected', 'pending scrape')),
      FOREIGN KEY (added_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_channels_url   ON channels(url);
    CREATE INDEX IF NOT EXISTS idx_channels_added  ON channels(added_at);
  `);
}

// ── seeds ────────────────────────────────────────────────────────────────────

const SEED_USERS = [
  { email: "kumsaaabdii@gmail.com", password: "1qaz, xsw2'" },
  { email: "oliftadele@gmail.com",  password: "1qaz, xsw2'" },
];

function seedUsers() {
  const count = db.prepare("SELECT COUNT(*) AS cnt FROM users").get();

  if (count.cnt === 0) {
    const insert = db.prepare(
      "INSERT INTO users (email, password) VALUES (@email, @password)"
    );

    const tx = db.transaction(() => {
      for (const u of SEED_USERS) {
        const hash = bcrypt.hashSync(u.password, 10);
        insert.run({ email: u.email, password: hash });
      }
    });

    tx();
    console.log(`✓ Seeded ${SEED_USERS.length} users`);
  }
}

// Run directly for manual seeding
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initDb();
  console.log("✓ Database ready at", DB_PATH);
  process.exit(0);
}
