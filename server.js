// ── Burchell Family Comment Server ───────────────────────────
// Simple Express + SQLite backend that:
//   • Serves all static site files (HTML, CSS, JS, images)
//   • Provides a /api/comments REST endpoint for the comment section
//
// Data is stored in data/comments.db (SQLite).
// On Render free tier the filesystem is ephemeral — add a Render Disk
// mounted at /data to make comments persistent across deploys.
// ─────────────────────────────────────────────────────────────

'use strict';

const express  = require('express');
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Database setup ────────────────────────────────────────────
// Use DATA_DIR env var so a Render Disk can be mounted there.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'comments.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL CHECK(length(name) > 0 AND length(name) <= 80),
    text      TEXT    NOT NULL CHECK(length(text) > 0 AND length(text) <= 1200),
    timestamp TEXT    NOT NULL
  )
`);

// Prepared statements
const stmtSelect = db.prepare(
  'SELECT id, name, text, timestamp FROM comments ORDER BY id DESC LIMIT 100'
);
const stmtInsert = db.prepare(
  'INSERT INTO comments (name, text, timestamp) VALUES (?, ?, ?)'
);

// ── Middleware ────────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }));

// Block access to server-side and configuration files
app.use((req, res, next) => {
  const blocked = /^\/(?:server\.js|package(?:-lock)?\.json|\.env.*|\.gitignore|data(?:\/|$))/i;
  if (blocked.test(req.path)) return res.status(403).end();
  next();
});

// Serve static website files
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html']
}));

// ── API: GET /api/comments ────────────────────────────────────
app.get('/api/comments', (req, res) => {
  try {
    const rows = stmtSelect.all();
    res.json(rows);
  } catch (err) {
    console.error('GET /api/comments error:', err);
    res.status(500).json({ error: 'Could not load comments.' });
  }
});

// ── API: POST /api/comments ───────────────────────────────────
app.post('/api/comments', (req, res) => {
  const { name, text } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required.' });
  }
  if (!text || typeof text !== 'string' || text.trim().length < 3) {
    return res.status(400).json({ error: 'text must be at least 3 characters.' });
  }

  const safeName = name.trim().slice(0, 80);
  const safeText = text.trim().slice(0, 1200);
  const timestamp = new Date().toISOString();

  try {
    const info = stmtInsert.run(safeName, safeText, timestamp);
    res.status(201).json({ id: info.lastInsertRowid, name: safeName, text: safeText, timestamp });
  } catch (err) {
    console.error('POST /api/comments error:', err);
    res.status(500).json({ error: 'Could not save comment.' });
  }
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Burchell Family server running on port ${PORT}`);
});
