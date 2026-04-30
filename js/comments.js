// ── Burchell Family Comments ─────────────────────────────────
// Uses Firebase Firestore REST API when configured; falls back to localStorage.
// No external SDK needed — all requests use the browser's built-in fetch().
//
// ONE-TIME SETUP (see README for full details):
//   1. Create a free Firebase project at https://console.firebase.google.com
//   2. Enable Firestore Database (start in "production" mode)
//   3. Copy your Project ID and Web API Key below
//   4. Publish the Firestore security rules shown in README
// ─────────────────────────────────────────────────────────────

const FIREBASE_CONFIG = {
  apiKey:    'YOUR_API_KEY',
  projectId: 'YOUR_PROJECT_ID'
};

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
    this.useRemote  = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY' &&
                         FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.projectId !== 'YOUR_PROJECT_ID');

    if (this.warningEl) this.warningEl.hidden = this.useRemote;
    this._loadComments();
    this._setupForm();
  }

  async _loadComments() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '<p class="comments-loading">Loading comments…</p>';
    try {
      let comments;
      if (this.useRemote) {
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
        if (this.useRemote) {
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


// ── Profanity filter ──────────────────────────────────────────
// Add or remove words from this list as needed for your family.
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
    // Match the word with word boundaries; case-insensitive
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

function formatDate(ts) {
  const date = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(date)) return '';
  const now = Date.now();
  const diff = now - date.getTime();
  const min  = 60 * 1000;
  const hr   = 60 * min;
  const day  = 24 * hr;

  if (diff < min)       return 'just now';
  if (diff < hr)        return Math.floor(diff / min) + ' minute' + (Math.floor(diff / min) === 1 ? '' : 's') + ' ago';
  if (diff < day)       return Math.floor(diff / hr)  + ' hour'   + (Math.floor(diff / hr)  === 1 ? '' : 's') + ' ago';
  if (diff < 7 * day)   return Math.floor(diff / day) + ' day'    + (Math.floor(diff / day) === 1 ? '' : 's') + ' ago';

  return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Simple rate-limit: max 3 comments per 10 minutes (per device) ─
const RATE_LIMIT_KEY   = 'bfam_rate_limit';
const RATE_LIMIT_MAX   = 3;
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes

function isRateLimited() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const timestamps = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    return recent.length >= RATE_LIMIT_MAX;
  } catch { return false; }
}

function recordSubmission() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const timestamps = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    recent.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
  } catch { /* ignore */ }
}

// ── Local storage fallback ────────────────────────────────────
const LOCAL_KEY = 'bfam_comments';

function getLocalComments() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}

function saveLocalComment(comment) {
  const comments = getLocalComments();
  comments.push(comment);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(comments));
}

// ── Main CommentManager ───────────────────────────────────────
class CommentManager {
  constructor(container) {
    this.container   = container;
    this.listEl      = container.querySelector('#comments-list');
    this.formEl      = container.querySelector('#comment-form');
    this.statusEl    = container.querySelector('#comment-status');
    this.warningEl   = container.querySelector('#comment-db-warning');
    this.db          = null;
    this.useFirebase = false;

    this._init();
  }

  async _init() {
    // Check whether Firebase is properly configured
    const cfg = FIREBASE_CONFIG;
    const configured = cfg.apiKey && cfg.apiKey !== 'YOUR_API_KEY' && cfg.projectId;

    if (configured && typeof firebase !== 'undefined') {
      try {
        if (!firebase.apps.length) firebase.initializeApp(cfg);
        this.db          = firebase.firestore();
        this.useFirebase = true;
        if (this.warningEl) this.warningEl.hidden = true;
      } catch (err) {
        console.warn('Firebase init failed, falling back to localStorage:', err);
      }
    }

    if (!this.useFirebase && this.warningEl) {
      this.warningEl.hidden = false;
    }

    await this._loadComments();
    this._setupForm();
  }

  async _loadComments() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '<p class="comments-loading">Loading comments…</p>';

    try {
      let comments = [];

      if (this.useFirebase) {
        const snapshot = await this.db
          .collection('burchell_comments')
          .orderBy('timestamp', 'desc')
          .limit(100)
          .get();
        snapshot.forEach(doc => {
          const d = doc.data();
          comments.push({
            id:        doc.id,
            name:      d.name || 'Anonymous',
            text:      d.text || '',
            timestamp: d.timestamp ? d.timestamp.toDate() : new Date()
          });
        });
      } else {
        comments = getLocalComments()
          .slice()
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }

      this._renderComments(comments);
    } catch (err) {
      console.error('Error loading comments:', err);
      this.listEl.innerHTML = '<p class="comments-error">Could not load comments. Please try refreshing the page.</p>';
    }
  }

  _renderComments(comments) {
    if (!this.listEl) return;

    if (comments.length === 0) {
      this.listEl.innerHTML = '<p class="comments-empty">No comments yet — be the first to leave a note for the family!</p>';
      return;
    }

    this.listEl.innerHTML = comments.map(c => `
      <div class="comment-item" id="comment-${escapeHtml(String(c.id))}">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(c.name)}</span>
          <span class="comment-date">${formatDate(c.timestamp)}</span>
        </div>
        <p class="comment-text">${escapeHtml(c.text).replace(/\n/g, '<br>')}</p>
      </div>
    `).join('');
  }

  _setStatus(msg, isError = false) {
    if (!this.statusEl) return;
    this.statusEl.textContent = msg;
    this.statusEl.className   = 'comment-status ' + (isError ? 'comment-status-error' : 'comment-status-ok');
  }

  _setupForm() {
    if (!this.formEl) return;

    this.formEl.addEventListener('submit', async e => {
      e.preventDefault();

      // Honeypot — bots fill this hidden field
      const honey = this.formEl.querySelector('#comment-hp');
      if (honey && honey.value) return;

      const nameInput = this.formEl.querySelector('#comment-name');
      const textInput = this.formEl.querySelector('#comment-text');
      const submitBtn = this.formEl.querySelector('[type="submit"]');

      const rawName = (nameInput.value || '').trim();
      const rawText = (textInput.value || '').trim();

      if (!rawName) { this._setStatus('Please enter your name.', true); nameInput.focus(); return; }
      if (!rawText) { this._setStatus('Please enter a comment.', true); textInput.focus(); return; }
      if (rawText.length < 3) { this._setStatus('Comment is too short.', true); return; }

      if (isRateLimited()) {
        this._setStatus('You\'ve been posting quite a bit! Please wait a few minutes before posting again. 😄', true);
        return;
      }

      const name = filterProfanity(rawName.slice(0, 80));
      const text = filterProfanity(rawText.slice(0, 1200));

      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting…';
      this._setStatus('');

      try {
        const comment = {
          name,
          text,
          timestamp: new Date()
        };

        if (this.useFirebase) {
          await this.db.collection('burchell_comments').add({
            name,
            text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          comment.id = Date.now().toString();
          saveLocalComment(comment);
        }

        recordSubmission();
        nameInput.value = '';
        textInput.value = '';
        this._setStatus('Thank you for your comment! 🍁');
        await this._loadComments();
        // Scroll the new comment into view
        this.listEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (err) {
        console.error('Error posting comment:', err);
        this._setStatus('Sorry, something went wrong. Please try again.', true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Comment';
      }
    });
  }
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('comments');
  if (section) new CommentManager(section);
});
