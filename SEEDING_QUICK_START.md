# Quick Start: Seeding Test Data

## ⚡ Quick Commands

```bash
# 1. Navigate to project
cd courtside-mobile-app

# 2. Rules are already open for seeding (deployed)

# 3. Run seed script
npx ts-node scripts/seed-test-data.ts

# 4. IMPORTANT: Restore production rules after seeding
./scripts/restore-firestore-rules.sh
```

## ⚠️ Critical Reminders

1. **Firestore rules are currently OPEN** for seeding (all reads/writes allowed)
2. **MUST restore production rules** after seeding using the restore script
3. **Never leave open rules** in production

## 📊 What Gets Created

- 3 user accounts (admin, scorekeeper, user)
- 5 tournaments
- 6 divisions
- 5 locations
- 11 regular games
- **4 pools** (2 for pool-only, 2 for hybrid)
- **12 pool games** (all completed)
- **2 brackets** (1 bracket-only, 1 hybrid)
- **7 bracket games** (quarterfinals through finals)

## 🏀 Tournament Formats

1. **Pool-only**: Boys 14U (2 pools, 12 games)
2. **Bracket-only**: Boys 18U (8-team bracket, 7 games)
3. **Hybrid**: Girls 16U (2 pools → 4-team bracket)

## 🔐 Test Credentials

- **Admin**: admin@courtside.test / Admin123!
- **Scorekeeper**: scorekeeper@courtside.test / Score123!
- **User**: user@courtside.test / User123!

## 🔒 Security Checklist

- [ ] Seed script completed successfully
- [ ] Production rules restored (`./scripts/restore-firestore-rules.sh`)
- [ ] Verified rules in Firebase Console
- [ ] Tested app with restored rules

## 📚 Full Documentation

See [SEEDING_TEST_DATA.md](./docs/SEEDING_TEST_DATA.md) for complete instructions.
