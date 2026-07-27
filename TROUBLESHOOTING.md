# 🛠️ Troubleshooting 404 Error

If you see a **404** when visiting `https://YOUR_USERNAME.github.io/sanskrit-study-guide`, work through this checklist in order.

---

## ✅ Step 1: Check Your Repository Name

Your repository **must** be named exactly `sanskrit-study-guide` for the URL to work.

**If your repo has a different name**, your URL is different too:

| Repository Name | Your URL |
|-----------------|----------|
| `sanskrit-study-guide` | `https://yourusername.github.io/sanskrit-study-guide` |
| `sanskrit` | `https://yourusername.github.io/sanskrit` |
| `my-sanskrit-notes` | `https://yourusername.github.io/my-sanskrit-notes` |

> **Fix:** Either rename your repo to `sanskrit-study-guide`, OR update `mkdocs.yml` and use the correct URL.

---

## ✅ Step 2: Update `site_url` in `mkdocs.yml`

Open `mkdocs.yml` in your repo and change this line:

```yaml
# ❌ WRONG (placeholder)
site_url: https://yourusername.github.io/sanskrit-study-guide

# ✅ CORRECT (replace with your actual GitHub username)
site_url: https://john Doe.github.io/sanskrit-study-guide
```

**Commit the change.** This will trigger a new build.

---

## ✅ Step 3: Check GitHub Pages Source (MOST COMMON CAUSE!)

This is the #1 reason for 404 errors.

1. Go to your repo on GitHub
2. Click **Settings** tab (top of page)
3. In the left sidebar, click **Pages**
4. Under **Build and deployment** → **Source**, make sure it says:

   **"GitHub Actions"** ✅

   NOT "Deploy from a branch" ❌

   ![If you see "Deploy from a branch", click the dropdown and change it to "GitHub Actions"]

> **Important:** The default is "Deploy from a branch" — you MUST change it.

---

## ✅ Step 4: Check if the Workflow Ran

1. In your repo, click the **Actions** tab (next to Pull requests)
2. You should see a workflow run named **"Deploy to GitHub Pages"**
3. Click on the most recent run

### What you should see:
- ✅ Green checkmark = Success! Wait 1-2 more minutes and refresh your site.
- ❌ Red X = Failed. Click on it to see the error message.

### Common workflow failures:

| Error | Fix |
|-------|-----|
| `mkdocs.yml not found` | Make sure `mkdocs.yml` is in the ROOT of your repo, not inside a folder |
| `docs/ directory not found` | Make sure the `docs/` folder is in the root |
| `Permission denied` | Go to Settings → Actions → General → "Workflow permissions" → Select **"Read and write permissions"** → Save |

---

## ✅ Step 5: Check the `docs/` Folder Location

Your repo structure should look exactly like this:

```
sanskrit-study-guide/           ← Root of repo
├── mkdocs.yml                  ← Must be here
├── README.md                   ← Must be here
├── docs/                       ← Must be here (not inside another folder!)
│   ├── index.md
│   ├── alphabets.md
│   ├── vocabulary.md
│   └── ...
└── .github/
    └── workflows/
        └── deploy.yml
```

> **Common mistake:** Uploading a ZIP and ending up with `sanskrit-study-guide/sanskrit-study-guide/` (nested folders). The inner folder contents need to be moved to the root.

---

## ✅ Step 6: Wait for the First Build

The very first build takes **3-5 minutes**. After the Actions workflow shows a green checkmark, wait another 1-2 minutes for GitHub's CDN to propagate.

**Check progress:**
1. Actions tab → Click the latest run
2. You should see two jobs: **build** and **deploy**
3. Both should be green ✅
4. Then visit your URL

---

## ✅ Step 7: Try the Direct URL Format

Sometimes the URL needs the trailing slash:

```
https://yourusername.github.io/sanskrit-study-guide/
```

(NOT `.../sanskrit-study-guide` without the trailing slash)

---

## 🆘 Still Not Working?

### Quick Fix: Manual Deploy from Branch

If GitHub Actions keeps failing, here's a simpler alternative:

1. Go to **Settings → Pages**
2. Change **Source** to **"Deploy from a branch"**
3. Select **Branch: `gh-pages`** and **Folder: `/ (root)`**
4. But first, you need to create the `gh-pages` branch...

Actually, the easiest fix is to install MkDocs locally and build manually:

### Option B: Build Locally & Upload

If you have Python installed on your computer:

```bash
# 1. Install dependencies
pip install mkdocs-material

# 2. Go to your project folder
cd sanskrit-study-guide

# 3. Build the site
mkdocs build

# 4. This creates a `site/` folder with your website
# Upload the contents of `site/` to GitHub Pages manually
```

### Option C: Use the Simpler "Deploy from Branch" Method

1. Delete the `.github/workflows/deploy.yml` file
2. Go to **Settings → Pages**
3. Change source to **"Deploy from a branch"**
4. Select **main** branch and **/ (root)** folder
5. This serves files directly from your repo (no build step needed)

> ⚠️ Note: This won't give you the Material theme styling or search. It only works if you pre-build the site.

---

## 📋 Quick Checklist

- [ ] Repo is named `sanskrit-study-guide` (or URL matches repo name)
- [ ] `mkdocs.yml` is in the root (not in a subfolder)
- [ ] `docs/` folder is in the root
- [ ] GitHub Pages source is set to **"GitHub Actions"**
- [ ] Actions workflow shows green checkmark ✅
- [ ] Waited at least 5 minutes after the green checkmark
- [ ] Using correct URL: `https://YOUR_USERNAME.github.io/sanskrit-study-guide/`
- [ ] `site_url` in `mkdocs.yml` matches your actual username

---

## 🎯 Most Likely Fix (Try This First!)

If you just created the repo and uploaded files:

1. Go to **Settings → Pages**
2. Change source from "Deploy from a branch" → **"GitHub Actions"**
3. Go to **Actions** tab
4. If no workflow is running, make a small edit to any file (like adding a space to README.md) and commit
5. Wait 3-5 minutes
6. Refresh your site URL

This fixes 90% of 404 errors!
