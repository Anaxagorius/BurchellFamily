// ── Burchell Family Server ────────────────────────────────────
// Simple Express server that serves all static site files.
// ─────────────────────────────────────────────────────────────

'use strict';

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Block access to server-side and configuration files
app.use((req, res, next) => {
  const blocked = /^\/(?:server\.js|package(?:-lock)?\.json|\.env.*|\.gitignore)/i;
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
