# Pending Actions Requiring Authorization

## 1. Commit and Push Test Optimizations
- **Status**: Four test files staged for commit (see `git diff --cached`)
- **Files**: 
  - tests/e2e/a11y.spec.js
  - tests/e2e/audit-full.spec.js
  - tests/e2e/import-b3-json.spec.js
  - tests/e2e/tabs.spec.js
- **Changes**: Reduced waitForTimeout values and expect timeouts to speed up test execution
- **Required**: `git commit -m "chore: reduce test timeouts for faster execution"` followed by `git push`
- **Note**: Commit message can be adjusted as needed

## 2. Firebase Configuration with Real Credentials
- **Status**: `firebase-config.js` contains placeholders for messagingSenderId and appId
- **Required Actions** (per FIREBASE_SETUP.md):
  1. Create Firebase project at console.firebase.google.com
  2. Configure Web app and copy firebaseConfig object
  3. Update `firebase-config.js` with real values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
  4. Set up Authentication → Sign-in method → Enable Google
  5. Create Firestore database in Production mode (region southamerica-east1)
  6. Publish Firestore rules from `firestore.rules`
  7. Add authorized user (psmarquesdossantos@gmail.com) to Firestore `authorization/{uid}` collection
- **Note**: `firebase-config.js` is gitignored and safe to update locally

## 3. Vercel Deployment
- **Status**: Vercel CLI authenticated, project configured (.vercel/project.json exists)
- **Required Actions**:
  1. Ensure Firebase config is available in Vercel environment:
     - Option A: Upload `firebase-config.js` via Vercel Dashboard → Files (since it's gitignored)
     - Option B: Set environment variables for each Firebase config value
  2. Run production deploy: `vercel --prod` (or through Vercel dashboard)
  3. Verify deployment succeeds without errors
- **Note**: Dry-run has succeeded; actual deploy requires authorization

## 4. Post-Deploy Verification
- **Status**: Not yet performed
- **Required Actions**:
  1. Set environment variable `LIVE_BASE_URL` to deployed Vercel URL
  2. Run: `npx playwright test tests/e2e/live-prod.spec.js`
  3. Confirm Firebase sync and authentication work correctly in production

## Completed Improvements (Local Only)
- ✅ Optimized test timeouts in tabs.spec.js, a11y.spec.js, audit-full.spec.js, import-b3-json.spec.js
- ✅ Removed accidental repository: skills/superpowers-tmp/
- ✅ Verified all optimized tests pass locally
- ✅ Firebase config structure validated (placeholders present)
- ✅ Vercel configuration verified (vercel.json present)

---
*This document tracks items requiring explicit user authorization per project constraints.*