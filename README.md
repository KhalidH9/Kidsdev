# Kids ABA — Development / Netlify Preview

This is the **development copy** of the Kids ABA platform, configured for deployment on Netlify.  
The production source lives at `Kids/` — do not edit it here.

## Architecture on Netlify

| Layer | Where |
|-------|-------|
| React SPA (client) | Netlify static hosting (`client/dist/`) |
| NestJS API (server) | Netlify Function (`netlify/functions/api.js`) |
| Database / Auth | Supabase (shared with production) |

All `/api/*` requests are rewritten to the Netlify Function by `netlify.toml`.  
The Vite client is built with `VITE_API_BASE_URL=` (empty) so every `fetch` call uses a relative path (`/api/children`, etc.) — meaning client and API live on the exact same domain.

---

## Deploy to Netlify (step by step)

### 1 — Push this folder to GitHub

```bash
cd /Users/khalid/Desktop/Kidsdev
git init
git add .
git commit -m "Initial Kidsdev — Netlify deployment"
# Create a new repo on GitHub, then:
git remote add origin https://github.com/<you>/kidsdev.git
git push -u origin main
```

### 2 — Create a new Netlify site

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Connect GitHub → select your `kidsdev` repo
3. Netlify auto-detects `netlify.toml` — build settings are already filled in
4. Click **Deploy site**

### 3 — Set environment variables in Netlify

Go to **Site settings → Environment variables** and add:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://zhsfvqxdbrpobytqqkgs.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(from your Supabase dashboard → Settings → API → service_role key)* |
| `SUPABASE_ANON_KEY` | `sb_publishable_V_mnS0cuGUS5ok5DUfkjZg_hTPgezCA` |
| `CORS_ORIGIN` | `https://<your-site>.netlify.app` |
| `NODE_ENV` | `production` |
| `VITE_SUPABASE_URL` | `https://zhsfvqxdbrpobytqqkgs.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_V_mnS0cuGUS5ok5DUfkjZg_hTPgezCA` |
| `VITE_API_BASE_URL` | *(leave empty — already set in client/.env)* |

> **Tip:** `VITE_*` variables are baked into the React bundle at build time by Vite.  
> Non-`VITE_` variables are available to the Netlify Function at runtime.

### 4 — Trigger a redeploy

After setting env vars, go to **Deploys → Trigger deploy → Deploy site**.  
The build runs: `npm ci → shared build → server build → client build`.

### 5 — Share the URL

Netlify gives you a URL like `https://wonderful-curie-abc123.netlify.app`.  
Share that link with the customer — no login or VPN needed.

---

## Local development (unchanged)

```bash
npm install
npm run dev:server   # NestJS on http://localhost:3000
npm run dev:client   # Vite on  http://localhost:5173
```

For local dev, restore `client/.env`:
```
VITE_API_BASE_URL=http://localhost:3000
```

---

## Tech stack

- **Database / Auth:** Supabase Postgres + Supabase Auth
- **Backend:** NestJS + TypeScript + Zod
- **Frontend:** React + Vite + TypeScript + TailwindCSS + TanStack Query
- **Shared:** `@kids/shared` workspace package
- **Serverless adapter:** `serverless-http` wraps NestJS for Lambda

## Roles

- **admin** — full school admin
- **specialist** — manages children, goals, notes, tasks
- **teacher** — records behavior logs
- **parent** — reads child info and assigned tasks via portal
