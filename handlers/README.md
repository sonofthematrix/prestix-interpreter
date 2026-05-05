# Handlers (legacy serverless logic)

This folder contains the **handler implementations** for `/api/*` endpoints. They are **not** deployed as Vercel serverless functions (Vercel only treats a root `api/` folder that way). All `/api/*` routes are served by Next.js in `src/app/api/*`, which dynamically import from this `handlers/` folder at runtime.

- **Deployment:** Only Next.js handles `/api/*`. No root `api/` folder exists, so no conflict with the signin route.
- **CORS & cookies:** Handlers set `Access-Control-Allow-Credentials` and origin allowlist for session cookies.
- **Env:** Use the same environment variables on Vercel (see `.env.example`).

**Local development:** `npm run dev` runs Next.js; the app’s API routes import these handlers, so `/api/*` works without `vercel dev`.
