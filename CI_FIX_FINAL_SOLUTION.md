# CI Pipeline - Final Solution

## ✅ Problem Solved

All CI pipeline issues have been resolved. The key was separating the Expo winter runtime mocks into a dedicated setup file that runs **before** all other test setup.

## The Solution

### Root Cause
Expo 54's new "winter" runtime was trying to import files outside Jest's test scope, causing all tests to fail with:
```
ReferenceError: You are trying to `import` a file outside of the scope of the test code.
```

### Why Previous Attempts Failed
- Putting mocks in `setupFilesAfterEnv` (setup.ts) was too late - tests were already loading
- Autofix kept reformatting or moving the mocks
- The mocks needed to run BEFORE any test code or imports

### The Working Solution

**1. Created `jest.setup.js` (NEW FILE)**
```javascript
// Mock Expo winter runtime to prevent import scope errors
// This MUST be done before any other imports or setup
jest.mock('expo/src/winter/runtime.native.ts', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal.ts', () => ({}), { virtual: true });
```

**2. Updated `jest.config.js`**
```javascript
module.exports = {
  preset: 'jest-expo',
  // ... other config ...
  setupFiles: ['<rootDir>/jest.setup.js'],  // ← NEW: Runs FIRST
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],  // Runs after
};
```

**3. Removed mocks from `src/__tests__/setup.ts`**
- The Expo mocks are now only in `jest.setup.js`
- This prevents autofix from interfering with them

## Test Results

```
✅ Test Suites: 11 passed, 11 total
✅ Tests: 127 passed, 127 total
✅ Time: ~6-8 seconds
✅ Coverage: 26% statements, 20% branches, 26% functions, 26% lines
```

## Additional Fixes

### App Configuration (`app.json`)
```json
{
  "ios": {
    "bundleIdentifier": "com.courtside.mobileapp",
    "infoPlist": {
      "ITSAppUsesNonExemptEncryption": false
    }
  },
  "android": {
    "package": "com.courtside.mobileapp"
  }
}
```

### EAS Configuration (`eas.json`)
```json
{
  "cli": {
    "version": ">= 5.9.0",
    "appVersionSource": "remote"
  }
}
```

### Build Preview Workflow
- Changed to manual trigger only (`workflow_dispatch`)
- Requires EAS credentials setup (must run `eas build` interactively first)
- Added EAS CLI installation step

## CI Workflow Status

### ✅ Main CI Workflow (`.github/workflows/ci.yml`)
**Triggers:** Push to master/develop, PRs to master/develop

| Step | Status |
|------|--------|
| Checkout | ✅ Pass |
| Setup Node.js | ✅ Pass |
| Install dependencies | ✅ Pass |
| Run linter | ✅ Pass (11 warnings, 0 errors) |
| Run type check | ✅ Pass |
| Run tests | ✅ Pass (127 tests) |
| Upload coverage | ✅ Pass |

### ⚙️ Build Preview Workflow (`.github/workflows/build-preview.yml`)
**Triggers:** Manual only or PR with 'build-preview' label

- Requires EAS credentials to be configured first
- Run `eas login` and `eas build` locally to set up credentials
- Then the workflow can use those credentials

## Verification Commands

Run these locally to verify everything works:

```bash
# Run tests
npm test -- --watchAll=false

# Run linter
npm run lint

# Run type check
npx tsc --noEmit

# All should pass ✅
```

## Key Takeaways

1. **Jest setup order matters:** `setupFiles` runs before `setupFilesAfterEnv`
2. **Expo winter runtime mocks must be early:** They need to intercept imports before any test code runs
3. **Separate files prevent autofix issues:** Keeping critical mocks in their own file protects them
4. **EAS builds need interactive setup:** Credentials can't be configured in non-interactive CI mode

## Files Changed

| File | Change |
|------|--------|
| `jest.setup.js` | NEW - Expo winter runtime mocks |
| `jest.config.js` | Added `setupFiles` configuration |
| `src/__tests__/setup.ts` | Removed Expo mocks (now in jest.setup.js) |
| `app.json` | Added bundle IDs and encryption flag |
| `eas.json` | Added appVersionSource |
| `.github/workflows/build-preview.yml` | Manual trigger, EAS CLI install |
| `src/services/firebase/config.ts` | Removed unused imports |
| `src/services/firebase/__tests__/FirebaseService.test.ts` | Removed unused imports |

## Success! 🎉

Your CI pipeline is now fully functional:
- ✅ All tests passing
- ✅ No linting errors
- ✅ No type errors
- ✅ Ready for continuous integration

The main CI workflow will run automatically on every push and PR, ensuring code quality!
