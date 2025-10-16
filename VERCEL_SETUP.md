# 🚀 VERCEL DEPLOYMENT GUIDE

## Status

✅ **Vercel CLI Installed**
✅ **Logged in to Vercel**
✅ **Project Linked**
✅ **Connected to GitHub Repository**

```
Repository: zoxknez/fiskalni-racun
Connected Branch: main
```

---

## 🚨 Current Issue

**Rate Limit Hit:** "Too many requests - try again in 11 hours"
- Vercel free tier has upload limits
- We hit the 5000 file limit
- Issue: node_modules directory had 59k files

## ✅ Solution Applied

1. Deleted node_modules (freed 55k files)
2. Reinstalled dependencies (1180 packages)
3. Now at ~5k files (acceptable level)

---

## 🔄 Deployment Options

### Option 1: Wait 11 Hours (Not Recommended)
After rate limit expires, run:
```bash
vercel --prod
```

### Option 2: Deploy via GitHub (RECOMMENDED) ✅
Since project is linked to GitHub:

1. **Push your cache busting code to GitHub:**
```bash
git add .
git commit -m "feat: implement cache busting 4-layer system"
git push origin main
```

2. **Vercel will automatically deploy:**
   - Vercel watches your GitHub repo
   - On push to main: automatic build & deployment
   - Takes ~3-5 minutes
   - View at: https://vercel.com/zoxknez/fiskalni-racun

3. **Monitor deployment:**
   - Go to: https://vercel.com/dashboard
   - Click on project: fiskalni-racun
   - Watch build logs in real-time

### Option 3: Use .vercelignore (For Future)
Create `.vercelignore` file to exclude large directories:
```
node_modules/
.git/
dist/
dev-dist/
.env.local
```

Then retry deploy.

---

## 📋 Vercel CLI Commands Reference

### Deployment
```bash
# Deploy to staging (preview)
vercel

# Deploy to production
vercel --prod

# Deploy specific directory
vercel ./dist

# Deploy with archive to avoid rate limit
vercel --archive=tgz
```

### Project Management
```bash
# List all deployments
vercel list

# View specific deployment logs
vercel logs [deployment-url]

# Inspect deployment details
vercel inspect [deployment-id]

# Rollback to previous deployment
vercel rollback [deployment-id]

# Promote preview to production
vercel promote [preview-url]

# Redeploy previous build
vercel redeploy [deployment-id]
```

### Environment Variables
```bash
# List env variables
vercel env list

# Add new env variable
vercel env add [NAME]

# Pull env variables from cloud
vercel pull

# Push env variables to cloud
vercel env push
```

### Local Development
```bash
# Start local dev server
vercel dev

# Build locally
vercel build

# Inspect local build output
vercel inspect
```

---

## 🎯 Recommended Next Steps

1. **Push to GitHub** (recommended - automatic deployment)
   ```bash
   git add .
   git commit -m "feat: cache busting implementation complete"
   git push origin main
   ```

2. **Monitor on Vercel Dashboard**
   - https://vercel.com/dashboard
   - Check build logs
   - View deployment URL

3. **Test Production**
   - Visit deployment URL
   - Open DevTools > Application > Service Workers
   - Verify cache cleanup working
   - Test PWA update notification

4. **Verify Cache Busting**
   ```bash
   # After deployed, open DevTools Console:
   caches.keys().then(names => console.table(names))
   # Should show: supabase-api-cache, images, fonts (only current caches)
   ```

---

## 📊 Your Vercel Project Info

| Property | Value |
|----------|-------|
| Project Name | fiskalni-racun |
| Owner | o0o0o0os-projects |
| GitHub Repo | zoxknez/fiskalni-racun |
| Current Branch | main |
| Build Command | npm run build |
| Output Directory | dist |
| Development Command | vite --port $PORT |
| Auto-deploy | Enabled (on GitHub push) |

---

## 🔐 Important Notes

1. **Rate Limit:** Free tier has upload limits. GitHub deployment avoids this.
2. **Auto-Deploy:** Enable in Vercel Dashboard > Settings > Git to auto-deploy on push
3. **Environment Variables:** Store sensitive data in Vercel env settings, not in code
4. **Build Cache:** Vercel caches builds. Clear if issues persist.

---

## ✅ Next Action

### Option A: Push to GitHub (Recommended)
```bash
git add .
git commit -m "feat: complete cache busting implementation"
git push origin main
# Vercel automatically deploys!
```

### Option B: Wait 11 Hours
Then run: `vercel --prod`

### Option C: Use Archive Method
```bash
vercel --archive=tgz --prod
```

---

## 📞 Troubleshooting

**Q: Still getting rate limit?**
A: GitHub deployment is your best bet. Push code, Vercel auto-deploys.

**Q: How to view deployment logs?**
A: `vercel logs [deployment-url]` or check Dashboard

**Q: How to rollback?**
A: `vercel rollback [deployment-id]`

**Q: How to skip deployment?**
A: Create `vercel.json` with `"buildCommand": "exit 0"`

---

**Recommendation: Use GitHub for deployment** 🚀
It's automatic, reliable, and avoids rate limits!
