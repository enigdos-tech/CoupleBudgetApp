# CouplesBudget 💑

> A fun, funky couple budgeting app for Canadians — track income, expenses, loans, bank accounts & financial milestones.

## ✨ Features

- Dashboard with live net worth, savings rate & projections
- Per-user login with PIN auth (data stays local — no backend)
- Onboarding wizard: add bank accounts on first login
- Income, Expenses, Loans, Accounts & Check-Ins tabs
- 7-year projection chart + scenario simulator
- Personalised advice engine

---

## 🚀 Deploy to GitHub Pages

1. Push this folder to a GitHub repo
2. Go to **Settings → Pages → Source → Deploy from `main` branch (root)**
3. Your app is live at `https://YOUR-USERNAME.github.io/REPO-NAME/`

**No build step needed — pure HTML/CSS/JS.**

---

## 🟢 Deploy to Replit

1. Go to [replit.com](https://replit.com) → **+ Create Repl**
2. Choose **Import from GitHub** and paste your repo URL  
   _or_ **Upload Files** and drag in the 4 files (`index.html`, `style.css`, `app.js`, `.replit`)
3. Click **Run** — Replit will serve the app via the built-in preview

---

## 📁 File Structure

```
CouplesBudgetApp/
├── index.html   # UI structure + overlays
├── style.css    # Theme + login/onboarding styles
├── app.js       # All logic (auth, modules, charts)
├── .replit      # Replit run config
└── README.md    # This file
```

---

## 🔒 Privacy Note

All data is stored **only in your browser's localStorage**. Nothing is ever sent to a server. Clearing browser data will erase it.
