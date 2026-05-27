# Project Dashboard — Project Notes

## What this is

A React web application for tracking customer deployments. Built for a project management team to monitor milestone dates, team tasks, project updates and blockers across multiple customers. Used as a shared read reference for management staff.

**Live URL:** `https://YOUR_GITHUB_USERNAME.github.io/project-dashboard/`
**Repo:** `https://github.com/YOUR_GITHUB_USERNAME/project-dashboard`

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast dev, simple build, no backend needed |
| Charts | Recharts v2 | Lightweight, works with React out of the box |
| Auth | Google OAuth 2.0 (GIS) | Team already on Gmail, no new accounts |
| Database | Google Sheets API v4 | Free, auditable, fallback if app is down |
| Hosting | GitHub Pages | Free, deploys with one command |

---

## Repo structure

```
project-dashboard/
├── index.html                        # Entry point, Google Fonts loaded here
├── vite.config.js                    # Base path set to /project-dashboard/
├── .env.example                      # Template — copy to .env.local
├── .env.local                        # NOT committed — holds secrets
├── package.json
└── src/
    ├── main.jsx                      # React root
    ├── App.jsx                       # Top-level routing, auth state, save handlers
    ├── App.css                       # Layout, topbar, sign-in screen
    ├── index.css                     # Global CSS variables, base styles, dark theme
    ├── lib/
    │   ├── constants.js              # Milestone definitions, helpers, sheet column layouts
    │   └── sheets.js                 # All Google Sheets API calls
    ├── hooks/
    │   ├── useGoogleAuth.js          # Google OAuth token management
    │   └── useData.js                # All data state + CRUD operations
    ├── components/
    │   ├── UI.jsx                    # Shared primitives: Avatar, Badge, Modal, Tabs, etc.
    │   └── CustomerModal.jsx         # Add/edit customer form with milestone dates
    └── views/
        ├── DashboardView.jsx         # Landing page: stats, charts, portfolio table
        └── ProjectView.jsx           # Per-customer: milestones, tasks, updates, blockers
```

---

## Environment variables

Stored in `.env.local` (never committed to git):

```
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
VITE_GOOGLE_SHEET_ID=xxxx
```

- **Client ID** — from Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client
- **Sheet ID** — from the Google Sheet URL: `spreadsheets/d/SHEET_ID/edit`

---

## Google Cloud setup (already done)

- **Project:** Project Dashboard
- **API enabled:** Google Sheets API
- **OAuth consent:** External, published (no test user restrictions)
- **OAuth client:** Web application, named "Project Dashboard Web"
- **Authorised origins:**
  - `http://localhost:5173`
  - `https://YOUR_GITHUB_USERNAME.github.io`

> If you add a new team member who gets an "access blocked" error, go to Google Cloud Console → Auth Platform → Add test users (only needed if consent screen is back in Testing mode).

---

## Google Sheet structure

Four tabs, auto-created on first load if missing:

### Customers tab
Columns: `id`, `name`, `owner`, `type`, `notes`, then one column per milestone date key, then one `_done` column per milestone (stores `"true"` or blank), then `customMilestones` (JSON string)

### Tasks tab
Columns: `id`, `customerId`, `title`, `owner`, `status`, `createdAt`

### Updates tab
Columns: `id`, `customerId`, `text`, `author`, `createdAt`

### Blockers tab
Columns: `id`, `customerId`, `title`, `type`, `detail`, `raisedAt`, `resolvedAt`

---

## Data model

### Customer object (in-memory)
```js
{
  id: '1234567890',           // timestamp string
  name: 'Acme Corp',
  owner: 'Nick Marshall',
  type: 'poc',                // 'poc' | 'termed'
  notes: 'Free text context',
  dates: {
    demo: '2025-06-01',
    agreement: '',
    handover: '2025-06-15',
    // ... one key per MILESTONE
    custom_1234: '2025-07-01' // custom milestone dates stored here too
  },
  completions: {
    demo_done: true,          // global milestones use key_done
    custom_1234: true         // custom milestones use key directly
  },
  customMilestones: [
    { key: 'custom_1234', label: 'Security review sign-off' }
  ]
}
```

### Task object
```js
{ id, customerId, title, owner, status, createdAt }
// status: 'To Do' | 'In Progress' | 'Done'
```

### Update object
```js
{ id, customerId, text, author, createdAt }
```

### Blocker object
```js
{ id, customerId, title, type, detail, raisedAt, resolvedAt }
// type: 'Internal' | 'Waiting on Customer'
// resolvedAt: '' if open, ISO timestamp if resolved
```

---

## Global milestones

Defined in `src/lib/constants.js` as the `MILESTONES` array. Each has a `key`, `label`, and `types` array controlling which deployment types show it.

| Key | Label | POC | Termed |
|---|---|---|---|
| `demo` | Demonstration performed | ✓ | ✓ |
| `agreement` | Agreement signed | | ✓ |
| `handover` | Handover — sales to implementation | ✓ | ✓ |
| `roadmap_disc` | Model office / roadmap discussion | ✓ | ✓ |
| `roadmap_doc` | Roadmap document completed & sent | ✓ | ✓ |
| `go_live` | Expected go live | ✓ | ✓ |
| `api_workshop` | API workshop | ✓ | ✓ |
| `training` | Training | ✓ | ✓ |
| `mo_conclusion` | Model office conclusion | ✓ | |

**To add a global milestone** (applies to all customers of a given type), edit the `MILESTONES` array in `src/lib/constants.js` and also add the key to `MS_DATE_KEYS` will update automatically. Then redeploy.

**To add a per-customer milestone**, use the "+ Add milestone" button in the Milestones tab of any project. These are stored as JSON in the `customMilestones` column of the Customers sheet.

---

## Milestone status logic

Defined in `statusMeta(dateStr, completed)` in `constants.js`:

| State | Condition | Colour |
|---|---|---|
| Complete | `completed === true` | Green |
| Overdue | Date is in the past | Red |
| Today / Tomorrow / In Nd | Date within 14 days | Amber |
| On track | Date > 14 days away | Green |
| Not set | No date | Grey |

---

## Key files to touch for common changes

| What you want to change | File |
|---|---|
| Add / rename / remove a global milestone | `src/lib/constants.js` → `MILESTONES` array |
| Change colours, fonts, spacing | `src/index.css` → CSS variables at top |
| Change fonts | `index.html` (Google Fonts link) + `src/index.css` variables |
| Add a new field to the customer form | `src/components/CustomerModal.jsx` + `src/lib/constants.js` (CUST_COLS) + `src/lib/sheets.js` (rowToCustomer / customerToRow) |
| Change dashboard charts | `src/views/DashboardView.jsx` |
| Change what shows on the project detail page | `src/views/ProjectView.jsx` |
| Change task statuses | `src/lib/constants.js` → `TASK_STATUSES` |
| Change blocker types | `src/lib/constants.js` → `BLOCKER_TYPES` |

---

## Local development

```powershell
cd project-dashboard
cp .env.example .env.local     # first time only
# fill in VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_SHEET_ID

npm install                    # first time only
npm run dev                    # starts at http://localhost:5173/project-dashboard/
```

> **Windows / OneDrive issue:** If you get an `EPERM rmdir` error on `npm run dev`, run:
> `Remove-Item -Recurse -Force node_modules\.vite` then retry.
> OneDrive tries to sync `node_modules` — consider pausing sync or excluding the folder.

---

## Deploying

```powershell
git add .
git commit -m "describe what changed"
git push            # saves source to GitHub
npm run deploy      # builds + pushes dist to gh-pages branch
```

`npm run deploy` does NOT push source code — always `git push` first so your source is backed up.

GitHub Pages takes 2–3 minutes to go live after first deploy.

---

## Auth behaviour

- Google OAuth 2.0 implicit flow (no backend, no refresh tokens)
- Tokens expire after ~1 hour — user will need to sign in again
- Only Google accounts that have been shared on the Sheet can read/write data
- The app itself is public (GitHub Pages) — auth is enforced by Google at the API level

---

## Version history

| Version | What changed |
|---|---|
| v1 | Initial build — localStorage only, single file React artifact |
| v2 | Full rebuild — Google Sheets backend, four-tab data model (Customers, Tasks, Updates, Blockers), dashboard with charts, project detail view |
| v3 | Milestone completion ticks, inline date editing on milestone cards, custom per-customer milestones, progress bar on milestones tab |

---

## Known limitations / future ideas

- Auth tokens expire after ~1hr, no silent refresh (would need a backend or service worker)
- No user identity on updates — "You" is hardcoded; consider prompting for name on first sign-in and storing in localStorage
- Deleting a customer orphans their Tasks/Updates/Blockers rows in the Sheet (they're hidden in the UI but remain in the sheet) — a cleanup function would be nice
- No sorting or search on the portfolio table yet
- Mobile layout not optimised — usable but not great on small screens
- Recharts v2 is deprecated — upgrade to v3 when ready (minor API changes, migration guide at recharts.org)

---

## How to brief Claude on this project

When starting a new conversation, upload this file and say something like:

> "This is my Project Dashboard app. I want to [describe change]. The relevant files are [list files if you know them]."

For UI tweaks (colours, fonts, spacing) you can usually just edit `index.css` or the relevant component yourself — it's faster than asking Claude to regenerate files.

For structural changes (new data fields, new tabs, new sheet columns), upload the specific files that need changing alongside this notes file so Claude has full context without needing to ask.
