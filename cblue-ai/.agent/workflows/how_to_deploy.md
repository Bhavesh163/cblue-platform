---
description: How to deploy the Cblue AI website to Vercel
---

# Deploying to Vercel

Since your project is hosted on GitHub and configured with Vite, Vercel is the easiest deployment option.

## 1. Prerequisites
- A [Vercel account](https://vercel.com/signup).
- The project pushed to GitHub (Already done!).

## 2. Connect to Vercel
1.  Log in to your Vercel Dashboard.
2.  Click **"Add New..."** -> **"Project"**.
3.  Select **"Continue with GitHub"**.
4.  Find your repository `cblue-ai` in the list and click **"Import"**.

## 3. Configure Project
Vercel should automatically detect the settings thanks to the `vercel.json` file we added.
- **Framework Preset**: Vite
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `dist` (default)

## 4. Deploy
1.  Click **"Deploy"**.
2.  Wait for the build to complete (approx 1-2 minutes).
3.  Once finished, you will get a live URL (e.g., `cblue-ai.vercel.app`).

## 5. Automatic Updates
Every time you push changes to the `main` branch on GitHub, Vercel will automatically rebuild and verify your deployment.
