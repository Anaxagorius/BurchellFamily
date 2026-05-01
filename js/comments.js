// ── Burchell Family Comments ─────────────────────────────────
// Backend priority (auto-detected at startup):
//   1. Local API  — /api/comments  (available when running server.js)
//   2. Firebase   — Firestore REST API (fill in FIREBASE_CONFIG below)
//   3. localStorage — browser-only fallback (comments not shared)
//
// To use Firebase instead of the local server, fill in FIREBASE_CONFIG and
// follow the Firebase Setup section in the README.
// ─────────────────────────────────────────────────────────────

const FIREBASE_CONFIG = {
  apiKey:    'AIzaSyASUCd4nAOvD5HBhCdWdH9d3rKWR6QFYYM',
  projectId: 'burchellfamilydb'
};

// ── Local API (server.js + SQLite) ────────────────────────────
const LOCAL_API_URL = '/api/comments';
const BACKEND_CACHE_KEY = 'bfam_backend';

async function localApiAvailable() {
  try {
    const cached = sessionStorage.getItem(BACKEND_CACHE_KEY);
    if (cached) return cached === 'api';
  } catch { /* ignore */ }
  try {
    const resp = await fetch(LOCAL_API_URL, { method: 'HEAD' });
    const available = resp.ok;
    try { sessionStorage.setItem(BACKEND_CACHE_KEY, available ? 'api' : 'other'); } catch { /* ignore */ }
    return available;
  } catch {
    try { sessionStorage.setItem(BACKEND_CACHE_KEY, 'other'); } catch { /* ignore */ }
    return false;
  }
}

async function fetchCommentsLocal() {
  const resp = await fetch(LOCAL_API_URL);
  if (!resp.ok) throw new Error('Local API fetch failed: ' + resp.status);
  const rows = await resp.json();
  return rows.map(r => ({
    id:        String(r.id),
    name:      r.name,
    text:      r.text,
    timestamp: new Date(r.timestamp)
  }));
}

async function postCommentLocal(name, text) {
  const resp = await fetch(LOCAL_API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, text })
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || 'Local API write failed: ' + resp.status);
  }
}

// ── Profanity filter ──────────────────────────────────────────
// Add or remove words as needed for your family.
const PROFANITY_WORDS = [
  'fuck', 'fucker', 'fucked', 'fucking', 'fuckhead', 'motherfucker',
  'shit', 'shite', 'shithead', 'bullshit', 'dipshit', 'horseshit',
  'bitch', 'bitches', 'bitching',
  'cunt', 'cunts',
  'cock', 'cocks', 'cockhead',
  'dick', 'dicks', 'dickhead',
  'pussy', 'pussies',
  'asshole', 'assholes', 'arsehole', 'arseholes',
  'bastard', 'bastards',
  'whore', 'whores',
  'slut', 'sluts',
  'piss', 'pissed', 'pisser',
  'twat', 'twats',
  'wank', 'wanker', 'wankers', 'wanking',
  'bollocks',
  'douchebag', 'douchebags',
  'jackass', 'jackasses',
  'goddamn', 'goddamned'
];

function filterProfanity(text) {
  let filtered = text;
  PROFANITY_WORDS.forEach(word => {
    const re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    filtered = filtered.replace(re, match => '*'.repeat(match.length));
  });
  return filtered;
}

// ── Helpers ───────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  const now  = Date.now();
  const diff = now - date.getTime();
  const min  = 60 * 1000;
  const hr   = 60 * min;
  const day  = 24 * hr;
  if (diff < min)     return 'just now';
  if (diff < hr)      return Math.floor(diff / min) + ' min ago';
  if (diff < day)     return Math.floor(diff / hr) + ' hr ago';
  if (diff < 7 * day) return Math.floor(diff / day) + ' day' + (Math.floor(diff / day) === 1 ? '' : 's') + ' ago';
  return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Rate limiter (max 3 posts per 10 min per device) ─────────
const RATE_KEY    = 'bfam_rate';
const RATE_MAX    = 3;
const RATE_WINDOW = 10 * 60 * 1000;

function isRateLimited() {
  try {
    const ts = JSON.parse(localStorage.getItem(RATE_KEY) || '[]');
    return ts.filter(t => Date.now() - t < RATE_WINDOW).length >= RATE_MAX;
  } catch { return false; }
}

function recordSubmission() {
  try {
    const ts = JSON.parse(localStorage.getItem(RATE_KEY) || '[]');
    const recent = ts.filter(t => Date.now() - t < RATE_WINDOW);
    recent.push(Date.now());
    localStorage.setItem(RATE_KEY, JSON.stringify(recent));
  } catch { /* ignore */ }
}

// ── LocalStorage fallback ─────────────────────────────────────
const LOCAL_KEY = 'bfam_comments';

function getLocalComments() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}

function saveLocalComment(c) {
  const list = getLocalComments();
  list.push(c);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

// ── Firestore REST helpers ────────────────────────────────────
function firestoreBase() {
  return 'https://firestore.googleapis.com/v1/projects/' +
         FIREBASE_CONFIG.projectId +
         '/databases/(default)/documents';
}

function firestoreUrl(path) {
  return firestoreBase() + path + '?key=' + encodeURIComponent(FIREBASE_CONFIG.apiKey);
}

// Convert a Firestore REST document to a plain comment object
function parseDoc(doc) {
  const f = doc.fields || {};
  const tsVal = f.timestamp && (f.timestamp.timestampValue || f.timestamp.stringValue);
  return {
    id:        doc.name ? doc.name.split('/').pop() : String(Date.now()),
    name:      f.name ? (f.name.stringValue || '') : 'Anonymous',
    text:      f.text ? (f.text.stringValue || '')  : '',
    timestamp: tsVal ? new Date(tsVal) : new Date()
  };
}

async function fetchComments() {
  // Use runQuery to get ordered results without needing a composite index
  const url  = firestoreUrl(':runQuery');
  const body = {
    structuredQuery: {
      from:    [{ collectionId: 'burchell_comments' }],
      orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }],
      limit:   100
    }
  };
  const resp = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  });
  if (!resp.ok) throw new Error('Firestore query failed: ' + resp.status);
  const results = await resp.json();
  return results
    .filter(r => r.document)
    .map(r => parseDoc(r.document));
}

async function postComment(name, text) {
  const url  = firestoreUrl('/burchell_comments');
  const body = {
    fields: {
      name:      { stringValue: name },
      text:      { stringValue: text },
      timestamp: { timestampValue: new Date().toISOString() }
    }
  };
  const resp = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  });
  if (!resp.ok) throw new Error('Firestore write failed: ' + resp.status);
}

// ── CommentManager ────────────────────────────────────────────
class CommentManager {
  constructor(section) {
    this.section    = section;
    this.listEl     = section.querySelector('#comments-list');
    this.formEl     = section.querySelector('#comment-form');
    this.statusEl   = section.querySelector('#comment-status');
    this.warningEl  = section.querySelector('#comment-db-warning');

    // backend: 'api' | 'firebase' | 'local' — resolved after detection
    this.backend = null;
    this._init();
  }

  async _init() {
    if (await localApiAvailable()) {
      this.backend = 'api';
    } else if (FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY' &&
               FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.projectId !== 'YOUR_PROJECT_ID') {
      this.backend = 'firebase';
    } else {
      this.backend = 'local';
    }

    if (this.warningEl) this.warningEl.hidden = (this.backend !== 'local');
    this._loadComments();
    this._setupForm();
  }

  async _loadComments() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '<p class="comments-loading">Loading comments…</p>';
    try {
      let comments;
      if (this.backend === 'api') {
        comments = await fetchCommentsLocal();
      } else if (this.backend === 'firebase') {
        comments = await fetchComments();
      } else {
        comments = getLocalComments()
          .slice()
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      this._render(comments);
    } catch (err) {
      console.error('Error loading comments:', err);
      this.listEl.innerHTML = '<p class="comments-error">Could not load comments. Please try refreshing the page.</p>';
    }
  }

  _render(comments) {
    if (!this.listEl) return;
    if (!comments.length) {
      this.listEl.innerHTML = '<p class="comments-empty">No comments yet — be the first to leave a note for the family! 🍁</p>';
      return;
    }
    this.listEl.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(c.name)}</span>
          <span class="comment-date">${formatDate(c.timestamp instanceof Date ? c.timestamp : new Date(c.timestamp))}</span>
        </div>
        <p class="comment-text">${escapeHtml(c.text).replace(/\n/g, '<br>')}</p>
      </div>
    `).join('');
  }

  _setStatus(msg, isError) {
    if (!this.statusEl) return;
    this.statusEl.textContent = msg;
    this.statusEl.className = 'comment-status ' + (isError ? 'comment-status-error' : 'comment-status-ok');
  }

  _setupForm() {
    if (!this.formEl) return;
    this.formEl.addEventListener('submit', async e => {
      e.preventDefault();

      // Honeypot check — bots fill this hidden field
      const hp = this.formEl.querySelector('#comment-hp');
      if (hp && hp.value) return;

      const nameEl   = this.formEl.querySelector('#comment-name');
      const textEl   = this.formEl.querySelector('#comment-text');
      const submitEl = this.formEl.querySelector('[type="submit"]');

      const rawName = (nameEl.value || '').trim();
      const rawText = (textEl.value || '').trim();

      if (!rawName) { this._setStatus('Please enter your name.', true); nameEl.focus(); return; }
      if (!rawText) { this._setStatus('Please enter a comment.', true); textEl.focus(); return; }
      if (rawText.length < 3) { this._setStatus('Comment is too short.', true); return; }

      if (isRateLimited()) {
        this._setStatus("You've been posting quite a bit! Please wait a few minutes before posting again. 😄", true);
        return;
      }

      const name = filterProfanity(rawName.slice(0, 80));
      const text = filterProfanity(rawText.slice(0, 1200));

      submitEl.disabled    = true;
      submitEl.textContent = 'Posting…';
      this._setStatus('');

      try {
        if (this.backend === 'api') {
          await postCommentLocal(name, text);
        } else if (this.backend === 'firebase') {
          await postComment(name, text);
        } else {
          saveLocalComment({ id: String(Date.now()), name, text, timestamp: new Date().toISOString() });
        }
        recordSubmission();
        nameEl.value = '';
        textEl.value = '';
        this._setStatus('Thank you for your comment! 🍁');
        await this._loadComments();
        this.listEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (err) {
        console.error('Error posting comment:', err);
        this._setStatus('Sorry, something went wrong. Please try again.', true);
      } finally {
        submitEl.disabled    = false;
        submitEl.textContent = 'Post Comment';
      }
    });
  }
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('comments');
  if (section) new CommentManager(section);
});

