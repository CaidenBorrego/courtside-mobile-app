# CI Final Fix - Action Required

## Current Status
Tests pass locally but fail in CI with the Expo winter runtime error.

## Root Cause
The `jest.setup.js` file that contains the critical Expo mocks needs to be committed and pushed to the repository.

## Required Actions

### 1. Verify jest.setup.js exists locally
```bash
cd courtside-mobile-app
ls -la jest.setup.js
```

You should see:
```javascript
// Mock Expo winter runtime to prevent import scope errors
// This MUST be done before any other imports or setup
jest.mock('expo/src/winter/runtime.native.ts', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal.ts', () => ({}), { virtual: true });
```

### 2. Commit and push all changes
```bash
git add .
git commit -m "fix: Add jest.setup.js for Expo winter runtime mocks and update CI workflow"
git push origin develop
```

### 3. Verify CI workflow changes
The `.github/workflows/ci.yml` file should now include:
- `working-directory: courtside-mobile-app` for all steps
- `cache-dependency-path: courtside-mobile-app/package-lock.json` in Node.js setup
- `Clear Jest cache` step before running tests

### 4. Monitor the CI run
After pushing, check GitHub Actions to verify:
- Tests install dependencies correctly
- Jest cache is cleared
- All 127 tests pass

## Files That Must Be Committed

1. ✅ `jest.setup.js` - Contains Expo winter runtime mocks
2. ✅ `jest.config.js` - References jest.setup.js in setupFiles
3. ✅ `.github/workflows/ci.yml` - Updated with working-directory
4. ✅ `src/__tests__/setup.ts` - Expo mocks removed (now in jest.setup.js)

## Verification

After pushing, run this locally to confirm it matches CI:

```bash
cd courtside-mobile-app
npx jest --clearCache
npm test -- --watchAll=false
```

Expected output:
```
Test Suites: 11 passed, 11 total
Tests:       127 passed, 127 total
```

## If CI Still Fails

### Option 1: Clear GitHub Actions Cache
1. Go to GitHub repository
2. Click "Actions" tab
3. Click "Caches" in left sidebar
4. Delete all caches
5. Re-run the workflow

### Option 2: Force Fresh Install
Add `--force` to npm install in CI:
```yaml
- name: Install dependencies
  run: npm install --legacy-peer-deps --force
  working-directory: courtside-mobile-app
```

### Option 3: Verify File Contents in CI
Add a debug step before tests:
```yaml
- name: Debug - Check jest.setup.js
  run: |
    echo "=== jest.setup.js contents ==="
    cat jest.setup.js
    echo "=== jest.config.js setupFiles ==="
    grep -A 2 "setupFiles" jest.config.js
  working-directory: courtside-mobile-app
```

## Why This Solution Works

1. **jest.setup.js runs BEFORE all test code**
   - Uses `setupFiles` instead of `setupFilesAfterEnv`
   - Mocks are applied before Expo tries to import winter runtime

2. **Separate file prevents autofix issues**
   - Autofix can't reformat or move the mocks
   - File is dedicated to this one critical purpose

3. **Clear cache ensures fresh start**
   - Removes any cached module resolutions
   - Forces Jest to re-evaluate all mocks

## Current CI Workflow Structure

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js (with cache path to courtside-mobile-app)
      - Install dependencies (in courtside-mobile-app)
      - Clear Jest cache (in courtside-mobile-app)
      - Run linter (in courtside-mobile-app)
      - Run type check (in courtside-mobile-app)
      - Run tests (in courtside-mobile-app)
      - Upload coverage
```

## Success Criteria

✅ All files committed and pushed
✅ CI workflow runs without errors
✅ All 127 tests pass in CI
✅ Linting passes (11 warnings, 0 errors)
✅ Type check passes

---

**Next Step:** Commit and push all changes, then monitor the CI run in GitHub Actions.
