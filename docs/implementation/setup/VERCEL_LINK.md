# Vercel project linking

Deploys and prebuilds are controlled by `.vercel/project.json` (gitignored). To send deploys to the correct account:

**Target:** [tokenizin-projects / prestixapp](https://vercel.com/tokenizin-projects/prestixapp)

## Re-link to tokenizin-projects/prestixapp

From the project root:

```bash
vercel link
```

When prompted:

1. **Set up and deploy?** — Yes
2. **Which scope do you want to deploy to?** — Select **tokenizin-projects** (not ilishaps-projects)
3. **Link to existing project?** — Yes
4. **What’s the name of your existing project?** — **prestixapp**

This updates `.vercel/project.json` with the correct `orgId` and `projectId`. After that, `vercel deploy`, `vercel build --prod`, and prebuilds will go to https://vercel.com/tokenizin-projects/prestixapp.

## Verify

```bash
vercel whoami
vercel project ls
# Deploy and check Inspect URL:
vercel deploy --prebuilt --prod
# Should show: https://vercel.com/tokenizin-projects/prestixapp/...
```
