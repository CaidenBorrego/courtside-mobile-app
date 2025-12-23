# Hays HS Christmas Classic - ELITE 8 Bracket

This seed script creates a complex tournament structure that demonstrates the **multiple game advancement** feature, specifically showing how bracket games can feed into pool games.

## Tournament Structure

### Championship Bracket (8 teams)
- **Round 1** (4 games) → **Quarterfinals** (2 games) → **Semifinals** (2 games) → **Finals** + **3rd Place**
- All games are organized within a "Championship Bracket" structure
- Teams: Veterans Memorial, Ellison, Antonian, HCSA, Harker Heights, Weiss, Liberty Christian, Round Rock

### Losers Pool (Consolation)
- The 4 losers from Round 1 games feed into a **Losers Pool**
- Losers Pool has 6 round-robin games where all 4 teams play each other
- Pool games are NOT part of a bracket - they're standalone pool play

## Key Feature Demonstrated

This tournament showcases **bracket games advancing to pool games**:
- Round 1 Game 1 loser → Losers Pool Game 1 (as "Loser Round 1 Game 1")
- Round 1 Game 2 loser → Losers Pool Game 1 (as "Loser Round 1 Game 2")
- Round 1 Game 3 loser → Losers Pool Game 2 (as "Loser Round 1 Game 3")
- Round 1 Game 4 loser → Losers Pool Game 2 (as "Loser Round 1 Game 4")

This demonstrates that the `loserAdvancesTo` array can contain pool game IDs, not just bracket game IDs.

## Running the Script

```bash
cd courtside-mobile-app
npx ts-node scripts/seed-elite8-bracket.ts
```

## Tournament Organization

### Bracket View
When viewing the "Pools & Brackets" tab, you'll see:
- **Championship Bracket** - Shows all 10 bracket games organized by round
  - Round 1 (4 games)
  - Quarterfinals (2 games)
  - Semifinals (2 games)
  - Finals (1 game)
  - 3rd Place (1 game)

### Pool View
- **Losers Pool** - Shows 6 pool games with standings
  - Teams are placeholders until Round 1 completes
  - Standings will populate as games are played

## Schedule

### December 29, 2025
- **12:20 PM** - Round 1 (4 games simultaneously)
- **4:20 PM** - Quarterfinals (2 games) + Losers Pool Games 1-2

### December 30, 2025
- **10:20 AM** - Semifinals (2 games) + Losers Pool Games 3-4
- **2:20 PM** - Losers Pool Games 5-6
- **5:00 PM** - Finals + 3rd Place

## Teams
- Veterans Memorial
- Ellison
- Antonian
- HCSA
- Harker Heights
- Weiss
- Liberty Christian
- Round Rock

## Locations
- Bales Gym
- Graham Gym
- Red Gym
- Barton MS (Barton Middle School)
