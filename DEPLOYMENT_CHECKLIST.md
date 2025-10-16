# 🚀 DEPLOYMENT CHECKLIST - Cache Busting Implementation

## ✅ Pre-Deployment Verification (COMPLETE)

All 18 components verified:
- ✅ vite.config.ts - [hash] tokens in all output files
- ✅ public/sw-custom.js - Aggressive cache cleanup on activate
- ✅ index.html - Runtime cache detection script
- ✅ PWAPrompt.tsx - handleUpdate() with cache clearing
- ✅ useSWUpdate.ts - Message listener hook created
- ✅ App.tsx - Hook integrated
- ✅ dist/assets - All files have unique [hash] pattern
- ✅ Documentation - Complete and comprehensive

---

## 📋 Pre-Deployment Checklist

### 1. Final Build Verification
- [ ] Run: `npm run build`
- [ ] Verify: Build succeeds in < 30 seconds
- [ ] Check: dist/assets/*.js have [hash] format (e.g., utils-BX_-73K9.js)
- [ ] Verify: dist/sw-custom.js contains "FORCE_REFRESH" handler
- [ ] Verify: dist/index.html contains "detectAndClearOldCache" script

### 2. Local Testing
- [ ] Run: `npm run preview`
- [ ] Open: http://localhost:4173
- [ ] DevTools > Application > Cache Storage - should show only:
  - `supabase-api-cache` (empty initially)
  - `images` (empty initially)
  - `fonts` (empty initially)
- [ ] No errors in Console tab
- [ ] PWA installs successfully (Windows/Mac/Mobile)

### 3. Browser Testing
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (if Mac available)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Verify: Service Worker activates (DevTools > Application > Service Workers)

### 4. Cache Verification
```javascript
// Run in DevTools Console:
caches.keys().then(names => console.table(names))
// Should show only: supabase-api-cache, images, fonts
```

### 5. PWA Update Flow
- [ ] Install PWA to device
- [ ] Deploy new build to production
- [ ] Wait 24h OR manually trigger update:
  ```javascript
  // In DevTools Console:
  navigator.serviceWorker.getRegistrations().then(regs => 
    regs.forEach(reg => reg.update())
  )
  ```
- [ ] Notification "Nova verzija dostupna" appears
- [ ] Click "Ažuriraj sada"
- [ ] Page reloads and shows new content
- [ ] DevTools > Cache Storage shows cleaned caches

---

## 🚢 Deployment Steps

### Step 1: Production Build
```bash
npm run build
```
**Expected Output:**
```
vite v5.4.20 building for production...
✓ 4414 modules transformed
✓ 19 chunks → 11 chunks
✓ dist/index.html 6.31 KB │ gzip: 1.60 KB │ brotli: 1.40 KB
```

### Step 2: Upload to Server
**For Vercel (if using):**
```bash
vercel deploy --prod
```

**For Custom Server:**
```bash
# Delete old dist
rm -r /var/www/app/dist

# Copy new build
cp -r dist/* /var/www/app/dist/

# Restart app server
systemctl restart app-server
```

**For Docker:**
```bash
# Rebuild image (will trigger npm run build)
docker build -t fiskalni-racun:latest .

# Push to registry
docker push your-registry/fiskalni-racun:latest

# Deploy new version
kubectl set image deployment/app app=your-registry/fiskalni-racun:latest
```

### Step 3: Verify Deployment
- [ ] Open: https://your-production-domain.com
- [ ] DevTools > Console - no errors
- [ ] DevTools > Application > Service Workers - new SW registered
- [ ] DevTools > Network - JS files have correct hashes
- [ ] DevTools > Cache Storage - only current caches present

### Step 4: Monitor First 24 Hours
- [ ] Check server logs for errors
- [ ] Monitor error reporting (Sentry, etc.) for new issues
- [ ] Monitor user complaints in support channel
- [ ] Expected: Zero TDZ "Cannot access 'ut'" errors
- [ ] Expected: PWA users receive update notification within 24h

---

## 🔍 Post-Deployment Monitoring

### Browser Console Checks
```javascript
// Should show NO errors about TDZ or cache:
console.log('✅ App loaded successfully')

// Verify cache state:
const caches_info = await caches.keys()
console.log('Active caches:', caches_info)
// Expected: ['supabase-api-cache', 'images', 'fonts']
```

### Service Worker Checks
```javascript
// Verify SW is active:
if (navigator.serviceWorker.controller) {
  console.log('✅ Service Worker is active')
} else {
  console.log('⚠️  Service Worker NOT active')
}

// Verify registration:
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log('SW Scope:', reg.scope))
})
```

### Production Metrics to Track
- Error rate (should decrease to near 0%)
- TDZ errors (should be eliminated completely)
- PWA update success rate (should be > 95%)
- Cache storage size (should be < 500MB per user)
- Time to first interactive (should remain < 3s)

---

## 🆘 Troubleshooting

### If Users Still See Old Version
1. Verify new build was deployed: `curl https://your-domain.com/assets/utils-*.js | grep '[hash]'`
2. Check CloudFlare/CDN cache: Purge if necessary
3. Send message to PWA users to click "Ažuriraj sada" button
4. Last resort: Add cache header `Cache-Control: no-cache` to index.html

### If Users See Blank Screen After Update
1. Check DevTools Console for errors
2. Verify dist/index.html was uploaded correctly
3. Check that all JS chunks were uploaded (should be 22+ files)
4. Rollback to previous version if necessary:
   ```bash
   git revert [commit-hash]
   npm run build
   # Re-deploy
   ```

### If Cache Storage Shows Old Caches
1. Check that sw-custom.js activate handler is running
2. Verify browser DevTools shows new SW registration
3. Click "Unregister" in DevTools > Application > Service Workers
4. Hard reload page (Ctrl+Shift+R / Cmd+Shift+R)
5. Verify cache cleanup script in index.html ran

---

## 📞 Rollback Plan

If critical issues occur:

```bash
# 1. Revert code
git revert [new-commit-hash]

# 2. Rebuild
npm run build

# 3. Redeploy
vercel deploy --prod
# OR
docker build -t fiskalni-racun:rollback . && docker push ...

# 4. Notify users
# Send notification: "Vraćanje na prethodnu verziju. Morate osvežiti stranicu."
```

Expected rollback time: 5-10 minutes

---

## ✨ Success Criteria

Deployment is **SUCCESSFUL** when:

1. ✅ Build completes without warnings
2. ✅ All files deployed to production with [hash] format
3. ✅ Zero TDZ errors in production for 24 hours
4. ✅ PWA users receive update notification and can click "Ažuriraj sada"
5. ✅ Cache Storage shows only current caches after update
6. ✅ No new console errors related to cache or service workers
7. ✅ Page load performance maintained (< 3s Time to Interactive)

---

## 📚 Documentation References

- **Technical Details:** docs/CACHE_BUSTING.md
- **Implementation Summary:** CACHE_BUSTING_IMPLEMENTATION.md
- **Quick Reference:** CACHE_BUSTING_SUMMARY.txt
- **This Checklist:** DEPLOYMENT_CHECKLIST.md

---

## 🎯 Timeline

**Estimated Deployment Schedule:**

| Task | Duration | Owner |
|------|----------|-------|
| Final build & testing | 15 min | Dev |
| Deploy to production | 5 min | DevOps |
| Monitor first hour | 60 min | Dev + Support |
| Monitor 24 hours | Ongoing | Support |
| Declare success | After 24h | Dev Lead |

**Total Time to Production:** ~80 minutes

---

## 👤 Owner & Contact

**Deployment Owner:** [DevOps/Dev Lead Name]
**Backup Contact:** [Tech Lead Name]
**Escalation:** [CTO/Manager Name]

**Rollback Trigger:** If error rate > 5% OR TDZ errors reappear

---

Generated: 2024
Cache Busting Implementation v1.0
