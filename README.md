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
server.js         – Node.js/Express server (serves static files + comments API via Firestore)
package.json      – Node.js dependencies
```

## Comment Section

Family members can leave comments on the home page. Comments include a built-in profanity filter and a rate limiter (max 3 posts per 10 minutes per device).

The comment backend is chosen automatically (in priority order):

| Priority | Backend | When active |
|---|---|---|
| 1 | **Local API** (`/api/comments`) | Running `server.js` (Render Web Service) |
| 2 | **Firebase Firestore** (client-side REST) | `server.js` not reachable but `FIREBASE_CONFIG` is set in `js/comments.js` |
| 3 | **localStorage** | Browser-only fallback — comments not shared |

### Running the server locally

```bash
npm install
FIREBASE_SERVICE_ACCOUNT='<paste service account JSON here>' npm start
```

Then open [http://localhost:3000](http://localhost:3000). Comments are stored in Firestore.

### Firebase setup

The server uses Firebase Firestore as its database. You need a Firebase service account to run it.

#### 1 — Create the Firebase project (if you haven't already)

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com) and sign in.
2. Click **Add project**, give it a name (e.g. `BurchellFamilyDB`), and follow the prompts.
3. In the left sidebar, click **Firestore Database → Create database**.
   - Choose **Start in production mode** → pick a region → click **Enable**.

#### 2 — Get a service account key

1. Go to **Project Settings** (gear icon) → **Service accounts** tab.
2. Click **Generate new private key** → **Generate key**.
3. Save the downloaded JSON file securely — this is your service account key.

#### 3 — Set Firestore security rules

In the Firebase console go to **Firestore Database → Rules** and publish:

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

#### 4 — Set the environment variable

Set the `FIREBASE_SERVICE_ACCOUNT` environment variable to the **full JSON content** of the service account key file.

On Render: Dashboard → Web Service → **Environment** → **Add Environment Variable**
Key: `FIREBASE_SERVICE_ACCOUNT`
Value: *(paste the entire JSON)*

> **Never commit the service account key to git.**

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

5. Add the `FIREBASE_SERVICE_ACCOUNT` environment variable (see *Firebase setup* above).

6. Click **Create Web Service**.

Render will deploy the site and provide a URL like `https://burchell-family.onrender.com`. Every push to the configured branch will automatically trigger a new deployment.

### Custom Domain (Optional)

1. In your Render dashboard, open the web service and go to **Settings → Custom Domains**.
2. Click **Add Custom Domain** and enter your domain name.
3. Follow the instructions to add the required DNS records with your domain registrar.
