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

// INITIAL_VISIT_COUNT lets you set a persistent floor in the Render dashboard.
// Update it whenever you want to preserve the accumulated count across redeploys
// or restarts (Render's free tier resets the in-process state on spin-down).
const INITIAL_COUNT = parseInt(process.env.INITIAL_VISIT_COUNT, 10) || 0;

function loadVisits() {
  try {
    const saved = JSON.parse(fs.readFileSync(VISITS_FILE, 'utf8')).count || 0;
    return Math.max(saved, INITIAL_COUNT);
  } catch {
    return INITIAL_COUNT;
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
  res.set('Cache-Control', 'no-store');
  res.json({ count: visitorCount });
});

// Block access to server-side and configuration files
app.use((req, res, next) => {
  const blocked = /^\/(?:server\.js|package(?:-lock)?\.json|\.env.*|\.gitignore|visits\.json|render\.yaml)/i;
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
