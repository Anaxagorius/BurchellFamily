# Burchell Family of Glace Bay

A personal heritage website tracing the Burchell family of Glace Bay, Nova Scotia — following Irish and French Acadian roots from 1720 France to Cape Breton.

## Project Structure

```
index.html        – Home page (includes comment section)
stories.html      – Family stories
family-tree.html  – Interactive family tree
timeline.html     – Historical timeline
gallery.html      – Gallery & video
sources.html      – Research & sources
css/              – Stylesheets
js/               – JavaScript files
  main.js         – Navigation, gallery, counters
  comments.js     – Comment section + profanity filter + backend detection
images/           – Image assets
server.js         – Node.js/Express server (serves static files + comments API)
package.json      – Node.js dependencies
data/             – SQLite database directory (created automatically; git-ignored)
```

## Comment Section

Family members can leave comments on the home page. Comments include a built-in profanity filter and a rate limiter (max 3 posts per 10 minutes per device).

The comment backend is chosen automatically (in priority order):

| Priority | Backend | When active |
|---|---|---|
| 1 | **Local API** (`/api/comments`) | Running `server.js` (Render Web Service) |
| 2 | **Firebase Firestore** | `FIREBASE_CONFIG` filled in `js/comments.js` |
| 3 | **localStorage** | Browser-only fallback — comments not shared |

### Running the server locally

```bash
npm install
npm start          # or: node server.js
```

Then open [http://localhost:3000](http://localhost:3000). Comments are stored in `data/comments.db`.

### Persistent storage on Render (recommended)

Render's free Web Service tier has an **ephemeral filesystem** — the SQLite file is wiped on each deploy. To keep comments permanently:

1. In the Render dashboard, open your Web Service → **Disks → Add Disk**.
2. Set the **Mount Path** to `/data` and choose a size (1 GB is plenty).
3. Add an environment variable: `DATA_DIR` = `/data`

The server reads `DATA_DIR` automatically and the SQLite database will survive deploys.

### Firebase setup (alternative)

If you prefer Firebase Firestore instead of the local SQLite database:

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com) and sign in with a Google account.
2. Click **Add project**, give it a name (e.g. `burchell-family`), and follow the prompts.
3. In the left sidebar, click **Firestore Database → Create database**.
   - Choose **Start in production mode** → pick a region close to you (e.g. `us-east1`) → click **Enable**.
4. Go to **Project Settings** (gear icon) → **General** → scroll to **Your apps** → click the **`</>`** (Web) icon.
   - Register the app (any nickname), click **Register app**.
   - Copy the `firebaseConfig` object shown on screen.
5. Open `js/comments.js` in this repo and replace the placeholder `FIREBASE_CONFIG` at the top with your values:
   ```js
   const FIREBASE_CONFIG = {
     apiKey:    "AIzaSy...",      // Web API Key from Project Settings
     projectId: "your-project"   // Project ID from Project Settings
   };
   ```
6. In the Firebase console, go to **Firestore Database → Rules** and replace the default rules with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /burchell_comments/{doc} {
         allow read: if true;
         allow create: if request.resource.data.name is string
                       && request.resource.data.name.size() > 0
                       && request.resource.data.name.size() <= 80
                       && request.resource.data.text is string
                       && request.resource.data.text.size() > 0
                       && request.resource.data.text.size() <= 1200;
       }
     }
   }
   ```
   Click **Publish**.
7. Commit and push `js/comments.js` — the server will auto-deploy and Firebase will be used when the `/api/comments` endpoint is unavailable.

> **Firebase free tier** (Spark plan) is more than enough for a family website: 1 GB storage, 50,000 reads/day, 20,000 writes/day — all free, no credit card needed.

## Deploying on Render

[Render](https://render.com) can host this site for free as a **Web Service** (Node.js). This serves both the static pages and the `/api/comments` database endpoint.

> **If you previously deployed as a Static Site**, delete that service and create a new **Web Service** instead — the configuration is different.

### Steps

1. **Push your code to GitHub** (or GitLab) if you haven't already.

2. **Log in to Render** at [https://render.com](https://render.com) and click **New → Web Service**.

3. **Connect your repository** — select the `BurchellFamily` repo from the list.

4. **Configure the service** with the following settings:

   | Setting | Value |
   |---|---|
   | **Name** | `burchell-family` (or any name you like) |
   | **Branch** | `main` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |

5. Click **Create Web Service**.

Render will deploy the site and provide a URL like `https://burchell-family.onrender.com`. Every push to the configured branch will automatically trigger a new deployment.

> **Note on free-tier storage:** The SQLite database (`data/comments.db`) is stored on the server's local disk. On Render's free tier this disk is ephemeral — comments will be lost when the service restarts or redeploys. See *Persistent storage on Render* above to add a Render Disk and keep comments permanently.

### Custom Domain (Optional)

1. In your Render dashboard, open the web service and go to **Settings → Custom Domains**.
2. Click **Add Custom Domain** and enter your domain name.
3. Follow the instructions to add the required DNS records with your domain registrar.
