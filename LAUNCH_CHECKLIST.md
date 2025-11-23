# 🚀 APPWHISTLER LAUNCH CHECKLIST

**Copy this. Check boxes as you go. Ship today.**

---

## ☑️ **PRE-LAUNCH (Do These First)**

### Backend Deployment
- [ ] Run `cd backend && ./deploy.sh`
- [ ] Verify API: `curl https://appwhistler-api.fly.dev/health`
- [ ] Initialize database with `schema.sql`
- [ ] Test GraphQL: Query `trendingApps`

### Extension Package
- [ ] Generate icons (use `extension/chrome/assets/generate-icons.html`)
- [ ] Update API URL in `extension/shared/api.js`
- [ ] Test extension locally in Chrome
- [ ] Create ZIP: `cd extension/chrome && zip -r ../../appwhistler-v1.0.0.zip .`

---

## ☑️ **LAUNCH DAY**

### Chrome Web Store
- [ ] Go to https://chrome.google.com/webstore/devconsole/register
- [ ] Pay $5 developer fee
- [ ] Upload `appwhistler-v1.0.0.zip`
- [ ] Fill in store listing (copy from `DEPLOY_TO_MARS.md`)
- [ ] Upload screenshots
- [ ] Submit for review

### Social Launch
- [ ] Create @appwhistler Twitter account
- [ ] Post launch tweet (template in `DEPLOY_TO_MARS.md`)
- [ ] Post on Reddit r/SideProject
- [ ] Post on HackerNews (Show HN:...)
- [ ] Email 10 friends for beta testing

### Monitoring
- [ ] Check Fly.io logs: `flyctl logs --app appwhistler-api`
- [ ] Monitor extension errors in Chrome DevTools
- [ ] Track user feedback in `BETA_FEEDBACK.md`

---

## ☑️ **WEEK 1 GOALS**

- [ ] 100 extension installs
- [ ] 10 beta tester reviews
- [ ] Fix top 3 reported bugs
- [ ] Chrome Web Store approval
- [ ] First press mention

---

## ☑️ **METRICS TO TRACK**

### Backend
- [ ] API response time (<200ms)
- [ ] Error rate (<1%)
- [ ] Database queries/sec
- [ ] Uptime (target: 99.9%)

### Extension
- [ ] Daily Active Users (DAU)
- [ ] Truth checks per user
- [ ] Average session length
- [ ] Crash rate (<0.1%)

### Growth
- [ ] New installs/day
- [ ] Retention (D1, D7, D30)
- [ ] Viral coefficient (K-factor)
- [ ] Organic vs. paid growth

---

## ☑️ **SUCCESS CRITERIA**

### MVP Success (Week 1)
- ✅ 100 users
- ✅ <5 critical bugs
- ✅ 3+ positive reviews
- ✅ Chrome Web Store approved

### Product-Market Fit (Month 1)
- ✅ 1,000 users
- ✅ 20%+ D7 retention
- ✅ First revenue
- ✅ Press coverage

### Scale (Month 3)
- ✅ 10,000 users
- ✅ VC interest
- ✅ Team of 3
- ✅ $1k MRR

---

## ☑️ **EMERGENCY CONTACTS**

### If Backend Crashes
```bash
flyctl logs --app appwhistler-api
flyctl restart --app appwhistler-api
```

### If Extension Breaks
- Check Chrome DevTools Console
- Rollback to previous version
- Post update in Chrome Web Store

### If Database Dies
```bash
flyctl postgres connect -a appwhistler-db
# Check connections, restart if needed
```

---

## 🎯 **THE ONE-DAY LAUNCH PLAN**

**Hour 1-2: Deploy**
- Run deploy script
- Test API
- Fix any errors

**Hour 3-4: Package**
- Generate icons
- Create ZIP
- Test locally

**Hour 5-6: Submit**
- Chrome Web Store submission
- Write store listing
- Upload screenshots

**Hour 7-8: Announce**
- Twitter launch thread
- Reddit posts
- HackerNews
- Email beta testers

**Hour 9-24: Monitor**
- Watch for bugs
- Respond to feedback
- Fix critical issues
- Celebrate first users 🎉

---

## 🔥 **MANTRAS**

- **Ship fast, fix faster**
- **Users > perfection**
- **Feedback > assumptions**
- **Growth > features**
- **Mars > Moon**

---

## ✅ **YOU'RE READY WHEN:**

ALL of these are true:
- ✅ `curl https://appwhistler-api.fly.dev/health` returns 200
- ✅ Extension shows whistle button on X/Twitter
- ✅ Clicking whistle shows truth panel
- ✅ Dark mode works
- ✅ No console errors
- ✅ Chrome Web Store submission is pending

**If all boxes checked: YOU ARE LIVE 🚀**

---

**Last updated**: Now
**Next update**: After you ship
**Status**: READY TO LAUNCH

🎺 **Execute `./deploy.sh` and change the world.** 🔴
