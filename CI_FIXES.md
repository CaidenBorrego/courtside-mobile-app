# CI Pipeline Fixes

## Issues Fixed

### 1. Jest Test Failures - Expo Winter Runtime Import Error

**Problem:**
All tests were failing with:
```
ReferenceError: You are trying to `import` a file outside of the scope of the test code.
at Runtime._execModule (node_modules/jest-runtime/build/index.js:1216:13)
at require (node_modules/expo/src/winter/runtime.native.ts:20:43)
```

**Root Cause:**
Expo 54's new "winter" runtime was trying to import files outside the Jest test scope, causing all tests to fail.

**Solution:**
Added virtual mocks for Expo's winter runtime modules in `src/__tests__/setup.ts`:
```typescript
// Mock Expo winter runtime to prevent import scope errors
jest.mock('expo/src/winter/runtime.native.ts', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal.ts', () => ({}), { virtual: true });
```

**Result:**
- All 11 test suites now pass (127 tests total)
- Test coverage: 26.15% statements, 19.89% branches, 25.58% functions, 26.34% lines

### 2. EAS CLI Missing in Build Preview Workflow

**Problem:**
Build preview workflow was failing with:
```
eas: command not found
Error: Process completed with exit code 127
```

**Root Cause:**
The EAS CLI was not installed in the GitHub Actions workflow, but the workflow was trying to run `eas build` commands.

**Solution:**
Added EAS CLI installation step in `.github/workflows/build-preview.yml`:
```yaml
- name: Install EAS CLI
  run: npm install -g eas-cli
```

**Result:**
- EAS CLI will now be available for build commands
- Preview builds for iOS and Android can proceed

### 3. ESLint Warnings Cleanup

**Problem:**
Multiple ESLint warnings for unused imports and variables.

**Solution:**
Removed unused imports:
- `initializeAuth` from `firebase/auth` in `src/services/firebase/config.ts`
- `Platform` from `react-native` in `src/services/firebase/config.ts`
- `Division` and `Location` types from `src/services/firebase/__tests__/FirebaseService.test.ts`

**Result:**
- Reduced warnings from 15 to 11
- Remaining warnings are minor and don't block CI
- No errors present

## CI Pipeline Status

### ✅ Passing Steps:
1. **Linter** - 11 warnings (non-blocking), 0 errors
2. **Type Check** - No TypeScript errors
3. **Tests** - All 127 tests passing with coverage
4. **Build Preview** - EAS CLI now available

### Files Modified:
1. `jest.config.js` - No changes needed (preset handles it)
2. `src/__tests__/setup.ts` - Added Expo winter runtime mocks
3. `.github/workflows/build-preview.yml` - Added EAS CLI installation
4. `src/services/firebase/config.ts` - Removed unused imports
5. `src/services/firebase/__tests__/FirebaseService.test.ts` - Removed unused type imports

## Testing Locally

To verify the fixes locally:

```bash
# Run tests
npm test -- --coverage --watchAll=false

# Run linter
npm run lint

# Run type check
npx tsc --noEmit
```

All commands should complete successfully.
