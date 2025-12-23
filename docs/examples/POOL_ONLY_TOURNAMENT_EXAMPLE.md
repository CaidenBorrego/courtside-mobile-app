# Pool-Only Tournament Example

This example demonstrates a pool-only tournament format where teams play round-robin within pools and the champion is determined by final standings.

## Tournament Overview

**Tournament Name**: Summer Hoops Classic  
**Format**: Pool Only  
**Teams**: 12 teams  
**Pools**: 3 pools of 4 teams each  
**Duration**: 1 day  
**Champion**: Team with best overall record

## Tournament Structure

### Pool Configuration

#### Pool A
- Team Alpha
- Team Beta
- Team Gamma
- Team Delta

**Games Generated**: 6 games
- Game 1: Alpha vs Beta
- Game 2: Alpha vs Gamma
- Game 3: Alpha vs Delta
- Game 4: Beta vs Gamma
- Game 5: Beta vs Delta
- Game 6: Gamma vs Delta

#### Pool B
- Team Epsilon
- Team Zeta
- Team Eta
- Team Theta

**Games Generated**: 6 games
- Game 1: Epsilon vs Zeta
- Game 2: Epsilon vs Eta
- Game 3: Epsilon vs Theta
- Game 4: Zeta vs Eta
- Game 5: Zeta vs Theta
- Game 6: Eta vs Theta

#### Pool C
- Team Iota
- Team Kappa
- Team Lambda
- Team Mu

**Games Generated**: 6 games
- Game 1: Iota vs Kappa
- Game 2: Iota vs Lambda
- Game 3: Iota vs Mu
- Game 4: Kappa vs Lambda
- Game 5: Kappa vs Mu
- Game 6: Lambda vs Mu

**Total Games**: 18 games

## Setup Instructions

### Step 1: Create Tournament

```typescript
const tournament = {
  name: "Summer Hoops Classic",
  startDate: "2024-07-15",
  endDate: "2024-07-15",
  city: "Springfield",
  state: "IL",
  status: "active"
};
```

### Step 2: Create Division

```typescript
const division = {
  tournamentId: tournament.id,
  name: "Boys 14U",
  ageGroup: "14U",
  gender: "male",
  skillLevel: "Competitive",
  format: "pool_only"
};
```

### Step 3: Create Pools

```typescript
// Pool A
const poolA = await poolService.createPool(
  division.id,
  tournament.id,
  "Pool A",
  ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"]
);

// Pool B
const poolB = await poolService.createPool(
  division.id,
  tournament.id,
  "Pool B",
  ["Team Epsilon", "Team Zeta", "Team Eta", "Team Theta"]
);

// Pool C
const poolC = await poolService.createPool(
  division.id,
  tournament.id,
  "Pool C",
  ["Team Iota", "Team Kappa", "Team Lambda", "Team Mu"]
);
```

### Step 4: Generate Games

```typescript
// Games are automatically generated when pools are created
const poolAGames = await poolService.generatePoolGames(poolA.id);
const poolBGames = await poolService.generatePoolGames(poolB.id);
const poolCGames = await poolService.generatePoolGames(poolC.id);
```

### Step 5: Schedule Games

```typescript
// Example: Schedule Pool A games
const schedule = [
  { gameId: poolAGames[0], time: "09:00", court: "Court 1" },
  { gameId: poolAGames[1], time: "09:00", court: "Court 2" },
  { gameId: poolAGames[2], time: "10:00", court: "Court 1" },
  { gameId: poolAGames[3], time: "10:00", court: "Court 2" },
  { gameId: poolAGames[4], time: "11:00", court: "Court 1" },
  { gameId: poolAGames[5], time: "11:00", court: "Court 2" },
];

// Apply schedule to games
for (const item of schedule) {
  await firebaseService.updateGame(item.gameId, {
    startTime: new Date(`2024-07-15T${item.time}`),
    court: item.court
  });
}
```

## Sample Schedule

### Morning Session (9:00 AM - 12:00 PM)

| Time  | Court 1           | Court 2           |
|-------|-------------------|-------------------|
| 9:00  | Pool A Game 1     | Pool B Game 1     |
| 9:45  | Pool C Game 1     | Pool A Game 2     |
| 10:30 | Pool B Game 2     | Pool C Game 2     |
| 11:15 | Pool A Game 3     | Pool B Game 3     |

### Afternoon Session (1:00 PM - 4:00 PM)

| Time  | Court 1           | Court 2           |
|-------|-------------------|-------------------|
| 1:00  | Pool C Game 3     | Pool A Game 4     |
| 1:45  | Pool B Game 4     | Pool C Game 4     |
| 2:30  | Pool A Game 5     | Pool B Game 5     |
| 3:15  | Pool C Game 5     | Pool A Game 6     |
| 4:00  | Pool B Game 6     | Pool C Game 6     |

## Sample Results

### Pool A Final Standings

| Rank | Team        | W-L | PF  | PA  | Diff |
|------|-------------|-----|-----|-----|------|
| 1    | Team Alpha  | 3-0 | 165 | 142 | +23  |
| 2    | Team Beta   | 2-1 | 158 | 151 | +7   |
| 3    | Team Gamma  | 1-2 | 149 | 156 | -7   |
| 4    | Team Delta  | 0-3 | 138 | 161 | -23  |

### Pool B Final Standings

| Rank | Team         | W-L | PF  | PA  | Diff |
|------|--------------|-----|-----|-----|------|
| 1    | Team Epsilon | 3-0 | 172 | 145 | +27  |
| 2    | Team Zeta    | 2-1 | 163 | 158 | +5   |
| 3    | Team Eta     | 1-2 | 151 | 165 | -14  |
| 4    | Team Theta   | 0-3 | 142 | 160 | -18  |

### Pool C Final Standings

| Rank | Team         | W-L | PF  | PA  | Diff |
|------|--------------|-----|-----|-----|------|
| 1    | Team Iota    | 3-0 | 168 | 139 | +29  |
| 2    | Team Kappa   | 2-1 | 155 | 149 | +6   |
| 3    | Team Lambda  | 1-2 | 147 | 158 | -11  |
| 4    | Team Mu      | 0-3 | 135 | 159 | -24  |

### Overall Division Standings

| Rank | Team         | Pool | W-L | PF  | PA  | Diff |
|------|--------------|------|-----|-----|-----|------|
| 1    | Team Iota    | C    | 3-0 | 168 | 139 | +29  |
| 2    | Team Epsilon | B    | 3-0 | 172 | 145 | +27  |
| 3    | Team Alpha   | A    | 3-0 | 165 | 142 | +23  |
| 4    | Team Beta    | A    | 2-1 | 158 | 151 | +7   |
| 5    | Team Kappa   | C    | 2-1 | 155 | 149 | +6   |
| 6    | Team Zeta    | B    | 2-1 | 163 | 158 | +5   |

**Champion**: Team Iota (3-0, +29 point differential)

## Key Features Demonstrated

### 1. Round-Robin Play
- Every team plays every other team in their pool
- Fair competition with multiple games per team
- No elimination - all teams play all scheduled games

### 2. Pool Standings
- Real-time standings calculation
- Ranking by wins, then point differential
- Clear visibility of team performance

### 3. Division Standings
- Overall rankings across all pools
- Champion determined by best record
- Tiebreakers applied consistently

### 4. Game Labels
- Clear pool identification (e.g., "Pool A Game 1")
- Easy navigation and scheduling
- Context for each game

## Advantages of Pool-Only Format

1. **Fair Competition**: Every team plays same number of games
2. **Multiple Games**: Teams get more playing time
3. **No Elimination**: All teams play full schedule
4. **Skill Development**: More games = more experience
5. **Simple Logistics**: No bracket management needed
6. **Flexible Scheduling**: Games can be scheduled throughout day

## Best Use Cases

- **Youth Tournaments**: Maximize playing time for development
- **One-Day Events**: Complete tournament in single day
- **Small Tournaments**: 8-16 teams total
- **Recreational Leagues**: Focus on participation over elimination
- **Skill Assessment**: Evaluate teams against multiple opponents

## Variations

### Variation 1: Unequal Pool Sizes
- Pool A: 5 teams (10 games)
- Pool B: 4 teams (6 games)
- Pool C: 3 teams (3 games)

### Variation 2: Two Large Pools
- Pool A: 6 teams (15 games)
- Pool B: 6 teams (15 games)

### Variation 3: Single Large Pool
- One pool: 12 teams (66 games)
- Requires multiple days or many courts

## Tips for Success

1. **Balance Pools**: Try to create equal-sized pools
2. **Seed Pools**: Distribute strong teams across pools
3. **Schedule Breaks**: Allow rest time between games
4. **Court Management**: Use multiple courts efficiently
5. **Time Management**: Allow 45-60 minutes per game
6. **Standings Updates**: Update scores promptly for accurate standings
7. **Communication**: Post schedule and standings prominently

## Common Challenges

### Challenge 1: Tied Records
**Solution**: Use point differential, then head-to-head result

### Challenge 2: Scheduling Conflicts
**Solution**: Stagger start times, use multiple courts

### Challenge 3: Uneven Skill Levels
**Solution**: Seed pools to balance competition

### Challenge 4: Time Constraints
**Solution**: Reduce pool sizes or use running clock

## Conclusion

Pool-only tournaments provide fair, competitive play with maximum game time for all teams. This format is ideal for youth development, recreational leagues, and one-day events where the goal is participation and skill development rather than elimination-style competition.
