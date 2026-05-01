// ── Burchell Family Comment Server ───────────────────────────
// Simple Express + Firestore backend that:
//   • Serves all static site files (HTML, CSS, JS, images)
//   • Provides a /api/comments REST endpoint for the comment section
//
// Credentials: set the FIREBASE_SERVICE_ACCOUNT environment variable to the
// full JSON content of your Firebase service account key file.
// ─────────────────────────────────────────────────────────────

'use strict';

const express = require('express');
const admin   = require('firebase-admin');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Firebase Admin setup ──────────────────────────────────────
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch (err) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT is not valid JSON:', err.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db         = admin.firestore();
const COLLECTION = 'burchell_comments';

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
app.get('/api/comments', async (req, res) => {
  try {
    const snap = await db.collection(COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id:        doc.id,
        name:      d.name,
        text:      d.text,
        timestamp: d.timestamp && typeof d.timestamp.toDate === 'function'
          ? d.timestamp.toDate().toISOString()
          : String(d.timestamp)
      };
    });
    res.json(rows);
  } catch (err) {
    console.error('GET /api/comments error:', err);
    res.status(500).json({ error: 'Could not load comments.' });
  }
});

// ── API: POST /api/comments ───────────────────────────────────
app.post('/api/comments', async (req, res) => {
  const { name, text } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required.' });
  }
  if (!text || typeof text !== 'string' || text.trim().length < 3) {
    return res.status(400).json({ error: 'text must be at least 3 characters.' });
  }

  const safeName = name.trim().slice(0, 80);
  const safeText = text.trim().slice(0, 1200);

  try {
    const docRef = await db.collection(COLLECTION).add({
      name:      safeName,
      text:      safeText,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    const now = new Date().toISOString();
    res.status(201).json({ id: docRef.id, name: safeName, text: safeText, timestamp: now });
  } catch (err) {
    console.error('POST /api/comments error:', err);
    res.status(500).json({ error: 'Could not save comment.' });
  }
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Burchell Family server running on port ${PORT}`);
});
