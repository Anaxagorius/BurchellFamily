// ── Burchell Family Server ────────────────────────────────────
// Simple Express server that serves all static site files.
// ─────────────────────────────────────────────────────────────

'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Visitor counter ───────────────────────────────────────────
const VISITS_FILE = path.join(__dirname, 'visits.json');

function loadVisits() {
  try {
    return JSON.parse(fs.readFileSync(VISITS_FILE, 'utf8')).count || 0;
  } catch {
    return 0;
  }
}

let visitorCount = loadVisits();
let saveTimer    = null;

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const snapshot = visitorCount;
    fs.writeFile(VISITS_FILE, JSON.stringify({ count: snapshot }), () => { /* ignore errors */ });
  }, 2000);
}

app.get('/api/visits', (req, res) => {
  visitorCount += 1;
  scheduleSave();
  res.json({ count: visitorCount });
});

// Block access to server-side and configuration files
app.use((req, res, next) => {
  const blocked = /^\/(?:server\.js|package(?:-lock)?\.json|\.env.*|\.gitignore|visits\.json)/i;
  if (blocked.test(req.path)) return res.status(403).end();
  next();
});

// Serve static website files
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html']
}));

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Burchell Family server running on port ${PORT}`);
});
