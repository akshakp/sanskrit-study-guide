# 🙏 Sanskrit Study Guide

A beautiful, searchable study guide for learning Sanskrit — built from Markdown and hosted on GitHub Pages.

## 🔍 Search Features

### Global Site Search (All Pages)

- Press `Ctrl+K` (or `Cmd+K` on Mac) from any page
- Searches across **all content**: Sanskrit words, English meanings, Gujarati translations, grammar rules, verb conjugations
- Results appear instantly with highlighted matches
- Works on mobile too — tap the search icon in the header

### Vocabulary Page — Dedicated Filter

The **Vocabulary** page has a built-in live filter:

- **Type in the search box** to filter across Sanskrit, English, and Gujarati simultaneously
- **Click filter buttons** to narrow by:
  - `All` — Show everything
  - `Sanskrit` — Search only Sanskrit words
  - `English` — Search only English meanings
  - `Gujarati` — Search only Gujarati translations
  - `Masculine ♂` / `Feminine ♀` / `Neuter ⚲` — Filter by grammatical gender
- The result counter shows "Showing X of Y entries" in real time

---

## 📂 What's Inside

| File                               | Purpose                              |
| ---------------------------------- | ------------------------------------ |
| `mkdocs.yml`                       | Website theme & settings (UI config) |
| `docs/`                            | All your **content** lives here      |
| `docs/javascripts/vocab-search.js` | Vocabulary filter logic              |
| `docs/stylesheets/main.css`        | UI styling                           |
| `.github/workflows/deploy.yml`     | Auto-publish to GitHub Pages         |

## 🚀 How to Publish Your Website (Step by Step)

### Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** button → **New repository**
3. Name it: `sanskrit-study-guide`
4. Make it **Public**
5. Click **Create repository**

### Step 2: Upload These Files

**Option A — Easy (Upload ZIP):**

1. Download this folder as a ZIP file
2. On your new GitHub repo page, click **"uploading an existing file"**
3. Drag and drop all files/folders
4. Click **Commit changes**

**Option B — Using Git (if you have it installed):**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sanskrit-study-guide.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. In your GitHub repo, click **Settings** (top right)
2. On the left sidebar, click **Pages**
3. Under **Build and deployment** → **Source**, select **GitHub Actions**
4. That's it! The workflow will run automatically

### Step 4: View Your Site

- After a few minutes, visit: `https://YOUR_USERNAME.github.io/sanskrit-study-guide`
- Every time you edit a file in `docs/` and push to GitHub, your site updates automatically!

---

## ✏️ How to Edit Content (No Coding Needed!)

All your content is in the **`docs/`** folder as simple `.md` (Markdown) files.

### To edit a page:

1. Open any file in `docs/` (like `vocabulary.md`)
2. Edit the text using the simple format below
3. Save and push to GitHub — your site updates automatically!

### Basic Markdown Formatting

```markdown
# Big Heading

## Smaller Heading

This is regular text.

| Column 1 | Column 2 |
| -------- | -------- |
| Data 1   | Data 2   |

**Bold text** and _italic text_

> This is a note box
```

### File Structure

```
docs/
├── index.md              ← Homepage
├── alphabets.md          ← Vowels, consonants, pronunciation
├── grammar-fundamentals.md ← Gender, number, person, pronouns
├── nouns.md              ← Cases (vibhakti), Ṇatva rule
├── verbs.md              ← Tenses, conjugation, sandhi rules
├── conversation.md       ← Dialogues & common phrases
├── vocabulary.md         ← Words organized by category (with live filter)
└── dhatu.md              ← Verb root reference tables
```

### Adding a New Page

1. Create a new `.md` file in `docs/` (e.g., `my-notes.md`)
2. Add this to the bottom of `mkdocs.yml` under `nav:`:

```yaml
nav:
  - Home: index.md
  - My Notes: my-notes.md   ← Add this line
```

3. Push to GitHub — done!

---

## 🎨 Customization (Optional)

### Change Colors

Open `mkdocs.yml` and edit:

```yaml
palette:
  primary: deep purple    ← Change this
  accent: amber           ← Change this
```

Available colors: `red`, `pink`, `purple`, `deep purple`, `indigo`, `blue`, `light blue`, `cyan`, `teal`, `green`, `light green`, `lime`, `yellow`, `amber`, `orange`, `deep orange`, `brown`, `grey`, `blue grey`, `black`, `white`

### Change Site Name

Open `mkdocs.yml`:

```yaml
site_name: My Sanskrit Notes
```

---

## 🆘 Need Help?

- **Site not showing?** Make sure GitHub Pages is set to "GitHub Actions" in Settings → Pages
- **Changes not appearing?** Check the **Actions** tab in your repo for any errors
- **Search not working?** The search index builds automatically on deploy — wait 2-3 minutes after first publish
- **Want to edit online?** You can edit `.md` files directly on GitHub — just click the pencil icon on any file!

---

Happy Learning! 📖✨

---

## 🚀 QUICK START (Fix 404 Errors)

If you followed the README and got a **404**, do these steps **in order**:

### Step 0: Update your `site_url`

Open `mkdocs.yml` and replace `yourusername` with your actual GitHub username:

```yaml
site_url: https://johndoe.github.io/sanskrit-study-guide
```

Commit this change.

### Step 1: Enable GitHub Actions (CRITICAL!)

1. Go to your repo → **Settings** → **Pages**
2. Under **Build and deployment** → **Source**
3. Select **"GitHub Actions"** (NOT "Deploy from a branch")
4. Click **Save**

> ⚠️ This is the #1 cause of 404 errors. The default is "Deploy from a branch" — you MUST change it.

### Step 2: Trigger a Build

Make any small edit to any file (even adding a space to README.md) and commit it. This triggers the workflow.

### Step 3: Check Actions Tab

1. Go to **Actions** tab in your repo
2. Look for "Deploy to GitHub Pages" workflow
3. Wait for the green checkmark ✅ (takes 3-5 minutes)
4. Refresh your site URL

### Step 4: Correct URL Format

```
https://YOUR_USERNAME.github.io/sanskrit-study-guide/
```

Make sure:

- You replaced `YOUR_USERNAME` with your actual username
- Your repo is named `sanskrit-study-guide`
- You include the trailing slash `/`

---

## 🔧 Common 404 Causes

| Cause                                 | Fix                                                         |
| ------------------------------------- | ----------------------------------------------------------- |
| Pages source = "Deploy from a branch" | Change to **"GitHub Actions"** in Settings → Pages          |
| Workflow permissions denied           | Settings → Actions → General → "Read and write permissions" |
| `mkdocs.yml` in wrong location        | Must be in repo root, not in a subfolder                    |
| Files uploaded inside nested folder   | Move all files to repo root                                 |
| Repo name doesn't match URL           | Rename repo OR update URL                                   |
| Actions workflow never ran            | Make a commit to trigger it                                 |

For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
