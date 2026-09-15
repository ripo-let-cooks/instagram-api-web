# Instagram API Web Integration (InstaBridge) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, responsive, and robust web application integrated with Instagram API (Node.js + Express + SQLite + Pure HTML5/Vanilla CSS with `/design-taste-frontend` standards) featuring authentication, feed posts, stories, two-way comment synchronization, live media preview, and an interactive simulator drawer for seamless academic grading.

**Architecture:** A modular client-server architecture with an Express REST API backend and persistent SQLite database. A Dual-Engine Instagram Service handles real Meta Graph API calls when credentials exist, and gracefully falls back to an interactive mock engine. The frontend is built on native HTML5/Vanilla CSS with modern typography, tactile micro-interactions, responsive design, and an interactive simulator panel to demonstrate real-time two-way synchronization.

**Tech Stack:** Node.js, Express.js, SQLite (`better-sqlite3`), Multer (file uploads), CORS, Vanilla HTML5, Modern CSS (Design tokens, CSS variables, Dark/Light theme), Vanilla JavaScript (ES6+ fetch, polling sync).

**Spec:** `docs/superpowers/specs/2026-09-15-instagram-api-web-design.md`

## Global Constraints

- **Design Standard**: Strictly adhere to `/design-taste-frontend` (No generic AI-purple gradient slop; clean Plus Jakarta Sans + JetBrains Mono typography; WCAG AA contrast >= 4.5:1; single-line CTAs; tactile button states).
- **Backend & Database**: Node.js + Express + SQLite (`better-sqlite3`). All data must persist in `database.sqlite` and survive server restarts.
- **Frontend Purity**: Pure HTML5, Vanilla CSS, and Vanilla JavaScript without React/Vue frameworks.
- **Two-Way Sync**: Comments from Web must push to the Instagram engine with `source: 'WEB'`, and comments from Instagram / Webhook / Simulator must appear on Web with `source: 'INSTAGRAM'`.
- **Demo Reliability**: 100% offline-capable via Simulator Panel so university presentation never fails due to Meta token expiry.

---

### Task 1: Project Scaffolding & Dependencies Setup

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create directory structure: `public/`, `src/services/`, `src/routes/`, `uploads/`, `tests/`

**Interfaces:**
- Produces: Project package configuration with script `npm start` and `npm test`, plus initial directory layout.

- [ ] **Step 1: Write `package.json` with dependencies and scripts**
```json
{
  "name": "instagram-api-web",
  "version": "1.0.0",
  "description": "Instagram API Web Integration with Two-Way Synchronization",
  "main": "src/server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test tests/*.test.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "multer": "^1.4.5-lts.1"
  }
}
```

- [ ] **Step 2: Create `.gitignore` and `.env.example`**
Include `node_modules/`, `database.sqlite`, `uploads/*` (except `.gitkeep`).
Provide template `.env.example` with `PORT=3000`, `INSTAGRAM_APP_ID=`, `INSTAGRAM_APP_SECRET=`, `INSTAGRAM_ACCESS_TOKEN=`, `WEBHOOK_VERIFY_TOKEN=instabridge_secret_2026`.

- [ ] **Step 3: Run `npm install` and verify package installation**
Run command: `npm install`

- [ ] **Step 4: Commit**
```bash
git add package.json .gitignore .env.example
git commit -m "chore: scaffold project structure and dependencies"
```

---

### Task 2: Database Initialization & SQLite Data Layer

**Files:**
- Create: `src/db.js`
- Test: `tests/db.test.js`

**Interfaces:**
- Produces: Database connection `db` and helper functions:
  - `initDb(dbPath)`: Creates tables `users`, `posts`, `stories`, `comments`, `activity_logs` and seeds default demo user `@arief_developer`.
  - `getUser(id)` / `saveUser(user)`
  - `getPosts()` / `createPost(post)` / `likePost(id)`
  - `getStories()` / `createStory(story)`
  - `getComments(postId)` / `addComment(comment)`
  - `logActivity(eventType, description, payload)` / `getLogs(limit)`

- [ ] **Step 1: Write failing test for database layer (`tests/db.test.js`)**
Verify table schema creation, default user seeding, post insertion, and two-way comment insertion with `source` field.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test` -> FAIL ("Cannot find module '../src/db'")

- [ ] **Step 3: Implement `src/db.js`**
Write complete SQLite initialization using `better-sqlite3` with prepared statements, foreign keys enabled, and seed data.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test` -> PASS

- [ ] **Step 5: Commit**
```bash
git add src/db.js tests/db.test.js
git commit -m "feat(db): implement sqlite persistence layer with schema and helpers"
```

---

### Task 3: Dual-Engine Instagram Service

**Files:**
- Create: `src/services/instagramService.js`
- Test: `tests/instagramService.test.js`

**Interfaces:**
- Produces:
  - `isRealMetaConnected()`: boolean
  - `getProfile()`: returns active profile info
  - `publishPost({ caption, mediaUrl, mediaType })`: returns post object with IG Media ID
  - `publishStory({ mediaUrl, caption })`: returns story object
  - `sendCommentToInstagram(postId, commentText, author)`: pushes comment to Meta API or simulator
  - `processWebhookEvent(payload)`: processes incoming webhook data and persists to SQLite

- [ ] **Step 1: Write failing test for `instagramService` (`tests/instagramService.test.js`)**
Test mock engine fallback, post publishing format, comment publishing, and incoming webhook event processing.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test` -> FAIL

- [ ] **Step 3: Implement `src/services/instagramService.js`**
Handle both real Meta Graph API calls (via fetch) and robust realistic mock engine with simulated delay and ID generators.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test` -> PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/instagramService.js tests/instagramService.test.js
git commit -m "feat(service): implement dual-engine instagram service with webhook processing"
```

---

### Task 4: REST API Routes & Express Server

**Files:**
- Create: `src/routes/auth.js`
- Create: `src/routes/posts.js`
- Create: `src/routes/stories.js`
- Create: `src/routes/comments.js`
- Create: `src/routes/webhook.js`
- Create: `src/routes/simulator.js`
- Create: `src/server.js`
- Test: `tests/api.test.js`

**Interfaces:**
- Produces:
  - Full Express app listening on `PORT` (default 3000)
  - Endpoints:
    - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
    - `GET /api/posts`, `POST /api/posts` (multer file upload), `POST /api/posts/:id/like`
    - `GET /api/stories`, `POST /api/stories` (multer file upload)
    - `GET /api/posts/:id/comments`, `POST /api/posts/:id/comments`
    - `GET /api/webhook` (hub challenge), `POST /api/webhook`
    - `POST /api/simulator/trigger`, `GET /api/logs`
  - Static file serving: `public/` and `uploads/`

- [ ] **Step 1: Write failing integration test for API endpoints (`tests/api.test.js`)**
Test login, feed retrieval, post creation, comment submission (Web -> IG), and simulator trigger (IG -> Web).

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test` -> FAIL

- [ ] **Step 3: Implement route handlers and `src/server.js`**
Wire up multer for file upload with 5MB limit and image/video mime check. Wire up all routers and static middleware.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test` -> PASS

- [ ] **Step 5: Commit**
```bash
git add src/routes/ src/server.js tests/api.test.js
git commit -m "feat(api): implement express rest api routes and server"
```

---

### Task 5: Frontend Design System & Responsive Styles (`/design-taste-frontend`)

**Files:**
- Create: `public/style.css`

**Interfaces:**
- Produces: Complete vanilla CSS design system adhering to `/design-taste-frontend`:
  - CSS custom properties: `--bg-base`, `--surface-card`, `--surface-elevated`, `--text-primary`, `--text-secondary`, `--border-subtle`, `--accent-ig-gradient`, `--status-connected`, `--status-demo`.
  - Clean typography: `Plus Jakarta Sans` for UI, `JetBrains Mono` for code/logs.
  - Dark mode default with seamless Light mode toggle.
  - Tactile button states (`:active { transform: scale(0.98); }`).
  - Skeleton shimmering animation.
  - Responsive layout for desktop and mobile screens.

- [ ] **Step 1: Create `public/style.css` with core design tokens and reset**
Implement color themes, typography, layout container (`max-w-[800px]`), and CSS grid/flex utilities.

- [ ] **Step 2: Add component styles**
Header, Story circle avatar rings, Create Post card with Live Media Preview box, Feed post cards, Two-Way Comment pills, Floating Simulator Drawer, and Activity Log terminal.

- [ ] **Step 3: Add micro-animations and accessibility states**
WCAG AA contrast compliant colors, focus rings, hover transitions, and skeleton loaders.

- [ ] **Step 4: Commit**
```bash
git add public/style.css
git commit -m "feat(ui): implement vanilla css design system following design-taste-frontend"
```

---

### Task 6: Frontend HTML5 Semantic Markup

**Files:**
- Create: `public/index.html`

**Interfaces:**
- Produces: Semantic HTML5 structure for the single-page application:
  - Header with Logo, Connection Status Pill, Theme Toggle button, and User Profile Pill.
  - Stories rail with "+ Story" trigger button and dynamic story bubbles container.
  - Create Post Form: caption textarea with character counter, file drop input, **Live Image Preview Container**, and "Posting ke Feed & IG" button.
  - Feed container: dynamic feed list with like button, comment thread, and inline comment input.
  - Floating Simulator Drawer: trigger buttons for lecturer demo and terminal log container.
  - Story Viewer Modal: full-screen viewer with timer bar.

- [ ] **Step 1: Write `public/index.html`**
Include Google Fonts preconnect, structured semantic tags (`<header>`, `<main>`, `<section>`, `<article>`, `<aside>`), accessible labels, and modal templates.

- [ ] **Step 2: Commit**
```bash
git add public/index.html
git commit -m "feat(ui): implement semantic html5 markup and modal structures"
```

---

### Task 7: Frontend Application Logic & Two-Way Realtime Sync

**Files:**
- Create: `public/app.js`

**Interfaces:**
- Produces: Client-side JavaScript controller:
  - Session management: check login state on load, demo login, logout.
  - Media Upload Preview: FileReader live preview with remove button and file size check.
  - Feed & Story loader: fetch posts, render post cards with `[🌐 Web]` vs `[📸 Instagram]` badges.
  - Direction 1 Sync: Post comment from web -> instant optimistic render -> send to API.
  - Direction 2 Sync: Smart polling (every 3 seconds) to detect incoming comments and posts from IG.
  - Simulator Drawer: trigger simulation events (e.g. comment from `@dosen_tester`) with toast feedback.
  - Terminal log streaming: render latest API activities in real-time.
  - Dark/Light mode switcher with localStorage persistence.

- [ ] **Step 1: Implement `public/app.js`**
Write clean, modular Vanilla JS without frameworks.

- [ ] **Step 2: Verify frontend-backend integration via browser test**
Launch server and verify API communication.

- [ ] **Step 3: Commit**
```bash
git add public/app.js
git commit -m "feat(ui): implement client application logic and two-way sync"
```

---

### Task 8: End-to-End Verification & Demo Polish

**Files:**
- Modify: `README.md` (Quick start guide for the user and lecturer)
- Verify all features in browser.

- [ ] **Step 1: Run complete test suite**
Run: `npm test`
Expected: 100% tests pass.

- [ ] **Step 2: Create comprehensive `README.md`**
Explain how to run (`npm install`, `npm start`), how to switch between Meta API Real and Demo Mode, and step-by-step instructions for demonstrating two-way sync to the lecturer.

- [ ] **Step 3: Test live application in browser subagent / local server**
Verify:
1. Login/logout
2. Media preview on file selection
3. Feed post creation
4. Web comment addition (`[🌐 Web]`)
5. Simulator button click -> incoming IG comment (`[📸 Instagram]`) appears without refresh
6. Story upload & story viewer
7. Database persistence after server restart

- [ ] **Step 4: Final commit**
```bash
git add README.md
git commit -m "docs: add comprehensive readme with lecturer demo guide"
```
