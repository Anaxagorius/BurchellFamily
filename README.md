# Burchell Family of Glace Bay

A personal heritage website tracing the Burchell family of Glace Bay, Nova Scotia — following Irish and French Acadian roots from 1720 France to Cape Breton.

## Project Structure

This is a static HTML/CSS/JS website with no build step required.

```
index.html        – Home page
stories.html      – Family stories
family-tree.html  – Interactive family tree
timeline.html     – Historical timeline
gallery.html      – Gallery & video
sources.html      – Research & sources
css/              – Stylesheets
js/               – JavaScript files
images/           – Image assets
```

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
