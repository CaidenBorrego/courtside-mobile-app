# Hybrid Tournament Example

This example demonstrates a hybrid tournament format combining pool play with bracket elimination rounds.

## Tournament Overview

**Tournament Name**: Elite Summer Invitational  
**Format**: Hybrid (Pools → Brackets)  
**Teams**: 16 teams  
**Pools**: 4 pools of 4 teams each  
**Bracket**: 8-team single elimination  
**Duration**: 2 days  
**Champion**: Winner of bracket finals

## Tournament Structure

### Day 1: Pool Play

#### Pool A
- Team Alpha (Seed 1)
- Team Echo (Seed 8)
- Team India (Seed 9)
- Team Papa (Seed 16)

#### Pool B
- Team Bravo (Seed 2)
- Team Foxtrot (Seed 7)
- Team Juliet (Seed 10)
- Team Quebec (Seed 15)

#### Pool C
- Team Charlie (Seed 3)
- Team Golf (Seed 6)
- Team Kilo (Seed 11)
- Team Romeo (Seed 14)

#### Pool D
- Team Delta (Seed 4)
- Team Hotel (Seed 5)
- Team Lima (Seed 12)
- Team Sierra (Seed 13)

**Pool Play Games**: 24 games total (6 per pool)  
**Advancement**: Top 2 from each pool advance to bracket

### Day 2: Bracket Play

**Bracket Size**: 8 teams  
**Seeding**: Automatic from pool results  
**Rounds**: Quarterfinals, Semifinals, Finals

## Setup Instructions

### Step 1: Create Tournament

```typescript
const tournament = {
  name: "Elite Summer Invitational",
  startDate: "2024-07-27",
  endDate: "2024-07-28",
  city: "Los Angeles",
  state: "CA",
  status: "active"
};
```

### Step 2: Create Division

```typescript
const division = {
  tournamentId: tournament.id,
  name: "Boys 17U Elite",
  ageGroup: "17U",
  gender: "male",
  skillLevel: "Elite",
  format: "hybrid"
};
```

### Step 3: Create Pools with Advancement

```typescript
// Pool A
const poolA = await poolService.createPool(
  division.id,
  tournament.id,
  "Pool A",
  ["Team Alpha", "Team Echo", "Team India", "Team Papa"],
  2  // Top 2 advance
);

// Pool B
const poolB = await poolService.createPool(
  division.id,
  tournament.id,
  "Pool B",
  ["Team Bravo", "Team Foxtrot", "Team Juliet", "Team Quebec"],
  2  // Top 2 advance
);

// Pool C
const poolC = await poolService.createPool(
  division.id,
  tournament.id,
  "Pool C",
  ["Team Charlie", "Team Golf", "Team Kilo", "Team Romeo"],
  2  // Top 2 advance
);

// Pool D
const poolD = await poolService.createPool(
  division.id,
  tournament.id,
  "Pool D",
  ["Team Delta", "Team Hotel", "Team Lima", "Team Sierra"],
  2  // Top 2 advance
);
```

### Step 4: Generate Pool Games

```typescript
// Games automatically generated for each pool
await poolService.generatePoolGames(poolA.id);
await poolService.generatePoolGames(poolB.id);
await poolService.generatePoolGames(poolC.id);
await poolService.generatePoolGames(poolD.id);
```

### Step 5: Create Bracket

```typescript
const bracket = await bracketService.createBracket(
  division.id,
  tournament.id,
  "Championship Bracket",
  8,  // 8-team bracket
  "pools"  // Seed from pool results
);

// Generate bracket games (teams will be TBD until pools complete)
await bracketService.generateBracketGames(bracket.id);
```

### Step 6: Complete Pool Play and Advance

```typescript
// After all pool games are completed
const poolsComplete = await tournamentStructureService.arePoolsComplete(division.id);

if (poolsComplete) {
  // Automatically seed bracket from pool results
  await tournamentStructureService.advancePoolsToBrackets(division.id);
}
```

## Day 1: Pool Play Schedule

### Morning Session (9:00 AM - 12:30 PM)

| Time  | Court 1      | Court 2      | Court 3      | Court 4      |
|-------|--------------|--------------|--------------|--------------|
| 9:00  | Pool A G1    | Pool B G1    | Pool C G1    | Pool D G1    |
| 10:00 | Pool A G2    | Pool B G2    | Pool C G2    | Pool D G2    |
| 11:00 | Pool A G3    | Pool B G3    | Pool C G3    | Pool D G3    |
| 12:00 | Pool A G4    | Pool B G4    | Pool C G4    | Pool D G4    |

### Afternoon Session (2:00 PM - 5:00 PM)

| Time  | Court 1      | Court 2      | Court 3      | Court 4      |
|-------|--------------|--------------|--------------|--------------|
| 2:00  | Pool A G5    | Pool B G5    | Pool C G5    | Pool D G5    |
| 3:00  | Pool A G6    | Pool B G6    | Pool C G6    | Pool D G6    |

## Day 1: Pool Play Results

### Pool A Final Standings

| Rank | Team       | W-L | PF  | PA  | Diff | Status   |
|------|------------|-----|-----|-----|------|----------|
| 1    | Alpha      | 3-0 | 189 | 156 | +33  | Advances |
| 2    | Echo       | 2-1 | 178 | 172 | +6   | Advances |
| 3    | India      | 1-2 | 165 | 181 | -16  | Eliminated|
| 4    | Papa       | 0-3 | 152 | 175 | -23  | Eliminated|

### Pool B Final Standings

| Rank | Team       | W-L | PF  | PA  | Diff | Status   |
|------|------------|-----|-----|-----|------|----------|
| 1    | Bravo      | 3-0 | 195 | 162 | +33  | Advances |
| 2    | Foxtrot    | 2-1 | 182 | 175 | +7   | Advances |
| 3    | Juliet     | 1-2 | 168 | 186 | -18  | Eliminated|
| 4    | Quebec     | 0-3 | 159 | 181 | -22  | Eliminated|

### Pool C Final Standings

| Rank | Team       | W-L | PF  | PA  | Diff | Status   |
|------|------------|-----|-----|-----|------|----------|
| 1    | Charlie    | 3-0 | 192 | 158 | +34  | Advances |
| 2    | Golf       | 2-1 | 179 | 168 | +11  | Advances |
| 3    | Kilo       | 1-2 | 162 | 183 | -21  | Eliminated|
| 4    | Romeo      | 0-3 | 155 | 179 | -24  | Eliminated|

### Pool D Final Standings

| Rank | Team       | W-L | PF  | PA  | Diff | Status   |
|------|------------|-----|-----|-----|------|----------|
| 1    | Delta      | 3-0 | 198 | 165 | +33  | Advances |
| 2    | Hotel      | 2-1 | 185 | 178 | +7   | Advances |
| 3    | Lima       | 1-2 | 171 | 188 | -17  | Eliminated|
| 4    | Sierra     | 0-3 | 162 | 185 | -23  | Eliminated|

## Bracket Seeding

### Automatic Seeding from Pools

**Seeding Order**:
1. All pool winners (ranked by point differential)
2. All pool runners-up (ranked by point differential)

**Bracket Seeds**:
1. Delta (Pool D winner, +33)
2. Charlie (Pool C winner, +34)
3. Bravo (Pool B winner, +33)
4. Alpha (Pool A winner, +33)
5. Golf (Pool C runner-up, +11)
6. Hotel (Pool D runner-up, +7)
7. Foxtrot (Pool B runner-up, +7)
8. Echo (Pool A runner-up, +6)

### Bracket Structure

```
Quarterfinals          Semifinals            Finals
─────────────          ──────────            ──────

#1 Delta    ┐
            ├─ Winner QF1 ┐
#8 Echo     ┘            │
                         ├─ Winner SF1 ┐
#4 Alpha    ┐            │             │
            ├─ Winner QF2 ┘             │
#5 Golf     ┘                          │
                                       ├─ Champion
#3 Bravo    ┐                          │
            ├─ Winner QF3 ┐             │
#6 Hotel    ┘            │             │
                         ├─ Winner SF2 ┘
#2 Charlie  ┐            │
            ├─ Winner QF4 ┘
#7 Foxtrot  ┘
```

## Day 2: Bracket Play Schedule

### Quarterfinals (9:00 AM - 12:00 PM)

| Time  | Court 1                  | Court 2                  |
|-------|--------------------------|--------------------------|
| 9:00  | QF1: #1 Delta vs #8 Echo | QF2: #4 Alpha vs #5 Golf |
| 10:30 | QF3: #3 Bravo vs #6 Hotel| QF4: #2 Charlie vs #7 Foxtrot |

### Semifinals (2:00 PM - 4:00 PM)

| Time  | Court 1                          | Court 2                          |
|-------|----------------------------------|----------------------------------|
| 2:00  | SF1: Winner QF1 vs Winner QF2    | SF2: Winner QF3 vs Winner QF4    |

### Finals (6:00 PM)

| Time  | Court 1                          |
|-------|----------------------------------|
| 6:00  | Finals: Winner SF1 vs Winner SF2 |

## Day 2: Bracket Results

### Quarterfinals Results

| Game | Matchup              | Score | Winner  |
|------|----------------------|-------|---------|
| QF1  | #1 Delta vs #8 Echo  | 72-58 | Delta   |
| QF2  | #4 Alpha vs #5 Golf  | 65-68 | Golf    |
| QF3  | #3 Bravo vs #6 Hotel | 71-64 | Bravo   |
| QF4  | #2 Charlie vs #7 Foxtrot | 69-66 | Charlie |

**Upset**: #5 Golf defeats #4 Alpha

### Semifinals Results

| Game | Matchup          | Score | Winner  |
|------|------------------|-------|---------|
| SF1  | Delta vs Golf    | 74-70 | Delta   |
| SF2  | Bravo vs Charlie | 68-72 | Charlie |

### Finals Result

| Game   | Matchup          | Score | Winner  |
|--------|------------------|-------|---------|
| Finals | Delta vs Charlie | 76-73 | Delta   |

**Champion**: Team Delta

## Tournament Statistics

### Overall Tournament Stats

**Total Games**: 31 games
- Pool Play: 24 games
- Quarterfinals: 4 games
- Semifinals: 2 games
- Finals: 1 game

**Teams**: 16 teams
- Advanced to Bracket: 8 teams
- Eliminated in Pools: 8 teams

**Duration**: 2 days
- Day 1: Pool Play (6 hours)
- Day 2: Bracket Play (9 hours)

### Champion's Path

**Team Delta**:
- Pool D: 3-0 (+33)
- QF: def. Echo 72-58
- SF: def. Golf 74-70
- Finals: def. Charlie 76-73
- **Overall Record**: 6-0

## Key Features Demonstrated

### 1. Pool-to-Bracket Flow
- Pool play determines bracket seeding
- Top performers get favorable matchups
- Fair competition through round-robin

### 2. Automatic Advancement
- System calculates pool standings
- Automatically seeds bracket
- Updates bracket games with team names

### 3. Hybrid Benefits
- Multiple games for all teams (pool play)
- Exciting elimination rounds (bracket)
- Balanced competition and entertainment

### 4. Real-time Updates
- Standings update as games complete
- Bracket updates automatically
- Clear visibility of advancement

## Advantages of Hybrid Format

1. **Fair Seeding**: Pool play determines bracket seeds objectively
2. **Multiple Games**: All teams play at least 3 games
3. **Competitive Balance**: Strong teams seeded appropriately
4. **Excitement**: Elimination rounds create drama
5. **Skill Assessment**: Pool play reveals true team strength
6. **Clear Champion**: Bracket determines definitive winner

## Best Use Cases

- **Multi-Day Tournaments**: Ideal for weekend events
- **Large Tournaments**: 12-32 teams
- **Competitive Events**: Balance fairness and excitement
- **Championship Tournaments**: Determine true champion
- **Showcase Events**: Display team skills in multiple games

## Advancement Variations

### Variation 1: Unequal Advancement
- Pool A: Top 3 advance (larger pool)
- Pool B: Top 2 advance
- Pool C: Top 2 advance
- Pool D: Top 1 advance

### Variation 2: Wildcard System
- Top 2 from each pool (8 teams)
- Plus 2 wildcards (best 3rd place teams)
- Creates 10-team bracket (with byes)

### Variation 3: Multiple Brackets
- Top 2 from each pool → Gold Bracket
- 3rd place teams → Silver Bracket
- 4th place teams → Bronze Bracket

## Tips for Success

1. **Day 1 Planning**: Complete all pool games on day 1
2. **Seeding Transparency**: Clearly communicate seeding rules
3. **Rest Time**: Allow adequate rest between days
4. **Bracket Reveal**: Announce bracket seeding after pool play
5. **Schedule Buffer**: Build in time for delays
6. **Communication**: Keep teams informed of advancement
7. **Venue Setup**: Prepare for bracket atmosphere on day 2

## Common Challenges

### Challenge 1: Pool Play Running Late
**Solution**: Use running clock, strict time limits, add courts

### Challenge 2: Tied Pool Standings
**Solution**: Clear tiebreaker rules (point diff, head-to-head)

### Challenge 3: Teams Not Advancing
**Solution**: Consider consolation brackets for eliminated teams

### Challenge 4: Bracket Seeding Disputes
**Solution**: Publish seeding rules before tournament starts

## Advanced Features

### Consolation Bracket
- 3rd/4th place teams from pools
- Separate bracket for non-advancing teams
- Provides more games and rankings

### Reseeding After Pools
- Reseed bracket based on pool performance
- Highest seed plays lowest seed
- Maximizes competitive balance

### Cross-Pool Play
- Add cross-pool games on day 1
- Pool winners play other pool winners
- Provides additional seeding data

## Comparison with Other Formats

### vs. Pool-Only
- **Hybrid Advantage**: Clear champion through elimination
- **Pool-Only Advantage**: All teams play same number of games

### vs. Bracket-Only
- **Hybrid Advantage**: Fair seeding through pool play
- **Bracket-Only Advantage**: Faster, fewer total games

## Conclusion

Hybrid tournaments combine the best aspects of pool play and bracket elimination. Pool play ensures fair competition and multiple games for all teams, while bracket play provides exciting elimination rounds and a clear path to championship. This format is ideal for multi-day competitive tournaments where both fairness and excitement are priorities.

The hybrid format demonstrated here shows how CourtSide seamlessly manages the transition from pool play to bracket elimination, automatically calculating standings, seeding brackets, and updating games in real-time. This creates a professional tournament experience for players, coaches, and fans.
