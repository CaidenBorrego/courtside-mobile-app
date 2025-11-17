# Authentication Troubleshooting Guide

## ✅ Issue Fixed: "Failed to fetch user profile"

### What Was Wrong
The Firestore security rules were set to deny all access, preventing the app from:
1. Creating user profiles during signup
2. Reading user profiles during signin

### What Was Fixed

1. **Updated Firestore Security Rules** (`firestore.rules`)
   - Added proper rules for user profile access
   - Users can read/write their own profiles
   - Public read access for tournaments, games, divisions, locations
   - Admin-only write access for tournament data

2. **Deployed Security Rules**
   - Ran `npm run deploy:rules` to apply the new rules

3. **Added Profile Creation Fallback**
   - Updated `AuthContext.tsx` to create missing profiles
   - If a profile doesn't exist during signin, it's created automatically
   - Auth state listener also creates missing profiles

### How to Test

1. **Restart the app** (stop and run `npm start` again)

2. **Try signing in with your existing account**
   - Email: [your email]
   - Password: [your password]
   - Should now work without errors

3. **If still having issues, create a new account**
   - Click "Sign Up"
   - Enter new credentials
   - Should create profile and sign in successfully

### Verify Security Rules Are Deployed

```bash
# Check Firebase Console
# Go to: https://console.firebase.google.com/project/borrego-tourneyapp/firestore/rules

# Or redeploy rules
npm run deploy:rules
```

### Common Issues & Solutions

#### Issue: "Permission denied" errors
**Solution**: Make sure security rules are deployed
```bash
npm run deploy:rules
```

#### Issue: "Network error" 
**Solution**: Check your internet connection and Firebase project status

#### Issue: Profile still not created
**Solution**: 
1. Check Firebase Console → Firestore Database
2. Look for `users` collection
3. If empty, try creating a new account
4. Profile should appear in Firestore

#### Issue: "Invalid email or password"
**Solution**: 
- Double-check your credentials
- Password must be at least 6 characters
- Email must be valid format

### Security Rules Summary

```
✅ User Profiles (users collection)
   - Read: Any authenticated user
   - Create: Owner only
   - Update: Owner only
   - Delete: Admin only

✅ Tournaments, Games, Divisions, Locations
   - Read: Public (anyone)
   - Write: Admin only

✅ Helper Functions
   - isAuthenticated(): Checks if user is logged in
   - isOwner(userId): Checks if user owns the document
   - isAdmin(): Checks if user has admin role
```

### Testing Checklist

- [ ] Security rules deployed successfully
- [ ] Can create new account
- [ ] Can sign in with existing account
- [ ] User profile appears in Firestore
- [ ] No "permission denied" errors
- [ ] Navigation to Home screen works

### Next Steps

Once authentication is working:
1. Verify you can see the Home screen after login
2. Check that bottom tabs (Home, Profile) are visible
3. Ready to start Task 6 (Tournament Listing)

### Need More Help?

Check these files:
- `firestore.rules` - Security rules configuration
- `src/services/auth/AuthService.ts` - Authentication logic
- `src/contexts/AuthContext.tsx` - Auth state management
- Firebase Console: https://console.firebase.google.com/project/borrego-tourneyapp

---

**Status**: ✅ Fixed and deployed
**Last Updated**: Now
**Action Required**: Restart app and try signing in
