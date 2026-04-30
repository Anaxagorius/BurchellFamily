# Burchell Family of Glace Bay

A personal heritage website tracing the Burchell family of Glace Bay, Nova Scotia — following Irish and French Acadian roots from 1720 France to Cape Breton.

## Project Structure

This is a static HTML/CSS/JS website with no build step required.

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
  comments.js     – Comment section + profanity filter
images/           – Image assets
```

## Comment Section

Family members can leave comments on the home page. Comments include a built-in profanity filter and a rate limiter (max 3 posts per 10 minutes per device).

**Without a database configured**, comments are stored in each visitor's own browser (localStorage) — good enough to try things out, but visitors won't see each other's comments.

**To share comments across all visitors** (recommended), set up a free Firebase Firestore database — one-time, takes about 10 minutes:

### Firebase Setup (one-time)

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
7. Commit and push `js/comments.js` — Render will auto-deploy and comments will now persist for everyone.

> **Firebase free tier** (Spark plan) is more than enough for a family website: 1 GB storage, 50,000 reads/day, 20,000 writes/day — all free, no credit card needed.

## Deploying on Render

[Render](https://render.com) can host this site for free as a **Static Site**.

### Steps

1. **Push your code to GitHub** (or GitLab) if you haven't already.

2. **Log in to Render** at [https://render.com](https://render.com) and click **New → Static Site**.

3. **Connect your repository** — select the `BurchellFamily` repo from the list.

4. **Configure the service** with the following settings:

   | Setting | Value |
   |---|---|
   | **Name** | `burchell-family` (or any name you like) |
   | **Branch** | `main` |
   | **Build Command** | *(leave blank — no build step needed)* |
   | **Publish Directory** | `.` (the repository root) |

5. Click **Create Static Site**.

Render will deploy the site and provide a URL like `https://burchell-family.onrender.com`. Every push to the configured branch will automatically trigger a new deployment.

### Custom Domain (Optional)

1. In your Render dashboard, open the static site and go to **Settings → Custom Domains**.
2. Click **Add Custom Domain** and enter your domain name.
3. Follow the instructions to add the required DNS records with your domain registrar.
