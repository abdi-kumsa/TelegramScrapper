import express from "express";
import cors from "cors";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { initDb } from "./db.js";
import { createToken, authMiddleware } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3001;

// ── initialise ───────────────────────────────────────────────────────────────

const app = express();
const db = initDb();

app.use(cors());
app.use(express.json());

// ── serve built frontend (production) ────────────────────────────────────────

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "..", "..", "dist");
  app.use(express.static(distPath));
}

// ── auth routes ──────────────────────────────────────────────────────────────

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.prepare("SELECT id, email, password FROM users WHERE email = ?").get(email.toLowerCase().trim());

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const match = bcrypt.compareSync(password, user.password);
  if (!match) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = createToken(user);

  res.json({
    token,
    user: { id: user.id, email: user.email },
  });
});

// ── channel routes (all require auth) ─────────────────────────────────────────

app.get("/api/channels", authMiddleware, (req, res) => {
  const channels = db.prepare(`
    SELECT c.id, c.url, u.email AS addedBy, c.added_at AS addedAt, c.status
    FROM channels c
    JOIN users u ON u.id = c.added_by
    ORDER BY c.added_at DESC
  `).all();

  res.json({ channels });
});

app.post("/api/channels", authMiddleware, (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required." });
  }

  // Normalise the URL
  let norm = url.trim().toLowerCase();
  if (norm.startsWith("https://")) norm = norm.slice(8);
  if (norm.startsWith("http://"))  norm = norm.slice(7);
  norm = norm.replace(/\/+$/, "");

  // Extract the handle — accept t.me/xxx, @xxx, or bare xxx
  let handle;
  if (norm.startsWith("t.me/")) {
    handle = norm.slice(5);
  } else if (norm.startsWith("@")) {
    handle = norm.slice(1);
  } else if (!norm.includes("/") && !norm.includes(".") && !norm.includes(" ")) {
    handle = norm;
  } else {
    return res.status(400).json({ error: "Invalid Telegram channel URL or handle." });
  }

  // Validate handle: alphanumeric + underscores, at least 3 chars
  if (!handle || handle.length < 3 || !/^[a-zA-Z0-9_]+$/.test(handle)) {
    return res.status(400).json({ error: "Invalid Telegram channel handle. Handles must be at least 3 alphanumeric characters or underscores." });
  }

  norm = "t.me/" + handle;

  // Check for duplicate
  const existing = db.prepare("SELECT id, url, added_by, added_at FROM channels WHERE url = ?").get(norm);
  if (existing) {
    const adder = db.prepare("SELECT email FROM users WHERE id = ?").get(existing.added_by);
    return res.status(409).json({
      error: "duplicate",
      message: `Already in the list — added by ${adder.email} on ${existing.added_at}.`,
    });
  }

  // Insert
  const result = db.prepare(
    "INSERT INTO channels (url, added_by, status) VALUES (?, ?, 'pending scrape')"
  ).run(norm, req.user.id);

  const channel = db.prepare(`
    SELECT c.id, c.url, u.email AS addedBy, c.added_at AS addedAt, c.status
    FROM channels c
    JOIN users u ON u.id = c.added_by
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  // Get total count for milestone check
  const count = db.prepare("SELECT COUNT(*) AS cnt FROM channels").get();

  res.status(201).json({ channel, total: count.cnt });
});

app.delete("/api/channels/:id", authMiddleware, (req, res) => {
  const { id } = req.params;

  const existing = db.prepare("SELECT id, added_by FROM channels WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Channel not found." });
  }

  // Both users can delete any channel
  db.prepare("DELETE FROM channels WHERE id = ?").run(id);

  const count = db.prepare("SELECT COUNT(*) AS cnt FROM channels").get();

  res.json({ deleted: true, total: count.cnt });
});

// ── export routes ────────────────────────────────────────────────────────────

app.get("/api/export/txt", authMiddleware, (req, res) => {
  const channels = db.prepare(`
    SELECT url FROM channels ORDER BY added_at ASC
  `).all();

  const text = channels.map((c) => "https://" + c.url).join("\n");
  const date = new Date().toISOString().slice(0, 10);
  const filename = `channels_${channels.length}_${date}.txt`;

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(text);
});

app.get("/api/export/jsonl", authMiddleware, (req, res) => {
  const channels = db.prepare(`
    SELECT c.url, u.email AS addedBy, c.added_at AS addedAt
    FROM channels c
    JOIN users u ON u.id = c.added_by
    ORDER BY c.added_at ASC
  `).all();

  const lines = channels.map((c) =>
    JSON.stringify({
      url: "https://" + c.url,
      added_by: c.addedBy,
      added_at: new Date(c.addedAt.replace(" ", "T") + "Z").toISOString(),
    })
  ).join("\n");

  const date = new Date().toISOString().slice(0, 10);
  const filename = `channels_${channels.length}_${date}.jsonl`;

  res.setHeader("Content-Type", "application/jsonlines");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(lines);
});

// ── health check ─────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  const count = db.prepare("SELECT COUNT(*) AS cnt FROM channels").get();
  res.json({ ok: true, channels: count.cnt });
});

// ── SPA catch-all (must be after all API routes) ─────────────────────────────

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "..", "..", "dist");
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ── start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const mode = process.env.NODE_ENV || "development";
  console.log(`✓ Server running on http://localhost:${PORT} (${mode})`);
  console.log(`  Login: kumsaaabdii@gmail.com / 1qaz  or  oliftadele@gmail.com / xsw2`);
});
