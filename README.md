# Burchell Family of Glace Bay

A personal heritage website tracing the Burchell family of Glace Bay, Nova Scotia — following Irish and French Acadian roots from 1720 France to Cape Breton.

## Project Structure

```
index.html        – Home page
stories.html      – Family stories
family-tree.html  – Interactive family tree
timeline.html     – Historical timeline
gallery.html      – Gallery & video
sources.html      – Research & sources
css/              – Stylesheets
js/               – JavaScript files
  main.js         – Navigation, gallery, counters
images/           – Image assets
server.js         – Node.js/Express server (serves static files)
package.json      – Node.js dependencies
```

## Contact

Family members can reach Thomas directly at [tbburchell@gmail.com](mailto:tbburchell@gmail.com) to share photos, videos, stories, or memories.

## Running the server locally

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

## Deploying on Render

[Render](https://render.com) can host this site for free as a **Web Service** (Node.js).

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

### Custom Domain (Optional)

1. In your Render dashboard, open the web service and go to **Settings → Custom Domains**.
2. Click **Add Custom Domain** and enter your domain name.
3. Follow the instructions to add the required DNS records with your domain registrar.
