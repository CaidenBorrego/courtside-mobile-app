# Pools and Brackets Admin Guide

This guide explains how to set up and manage pool play and bracket tournaments in the CourtSide mobile application.

## Table of Contents

1. [Overview](#overview)
2. [Tournament Formats](#tournament-formats)
3. [Setting Up Pool Play](#setting-up-pool-play)
4. [Setting Up Brackets](#setting-up-brackets)
5. [Hybrid Tournaments](#hybrid-tournaments)
6. [Managing Games](#managing-games)
7. [Best Practices](#best-practices)

## Overview

CourtSide supports three tournament formats:

- **Pool Only**: Teams play round-robin within pools, champion determined by final standings
- **Bracket Only**: Single-elimination tournament with manual or automatic seeding
- **Hybrid**: Pool play followed by bracket elimination rounds

## Tournament Formats

### Pool Only Format

Best for:
- Ensuring all teams play multiple games
- Tournaments where every game matters
- Smaller tournaments (2-6 teams per pool)

Characteristics:
- Each team plays every other team in their pool once
- Champion determined by final pool standings
- No elimination - all teams play all scheduled games

### Bracket Only Format

Best for:
- Traditional playoff-style tournaments
- Larger tournaments with time constraints
- Clear winner determination

Characteristics:
- Single-elimination structure
- Winners advance, losers are eliminated
- Bracket sizes: 4, 8, 16, or 32 teams
- Fewer total games than pool play

### Hybrid Format

Best for:
- Combining fairness of pool play with excitement of elimination
- Multi-day tournaments
- Ensuring competitive balance in elimination rounds

Characteristics:
- Pool play determines seeding
- Top teams from each pool advance to brackets
- Combines benefits of both formats

## Setting Up Pool Play

### Step 1: Access Division Management

1. Navigate to your tournament
2. Select the division you want to configure
3. Tap "Manage Tournament"
4. Select the "Structure" tab

### Step 2: Create Pools

1. Tap "Add Pool"
2. Enter pool name (e.g., "Pool A", "Gold Pool")
3. Select teams to include in the pool
   - Minimum: 2 teams
   - Maximum: 16 teams (recommended: 4-6 teams)
4. Set advancement count (if using hybrid format)
   - This determines how many teams advance to brackets
   - Example: Set to 2 to advance top 2 teams from each pool

### Step 3: Generate Pool Games

1. After creating a pool, games are automatically generated
2. Each team will play every other team once
3. Formula: For N teams, N×(N-1)/2 games are created
4. Example: 4 teams = 6 games

### Step 4: Schedule Pool Games

1. View generated games in the schedule
2. Assign start times to each game
3. Assign courts/locations
4. Games are labeled automatically (e.g., "Pool A Game 1")

### Pool Management Tips

- **Balanced Pools**: Try to create pools with equal numbers of teams
- **Skill Distribution**: Distribute strong teams across different pools
- **Scheduling**: Leave adequate time between games for the same team
- **Advancement**: Set advancement count before pool play begins

## Setting Up Brackets

### Step 1: Access Bracket Configuration

1. Navigate to division management
2. Select the "Structure" tab
3. Tap "Add Bracket"

### Step 2: Configure Bracket

1. **Name**: Enter bracket name (e.g., "Gold Bracket", "Championship")
2. **Size**: Select bracket size
   - 4 teams = 3 games (Semifinals + Finals)
   - 8 teams = 7 games (Quarterfinals + Semifinals + Finals)
   - 16 teams = 15 games
   - 32 teams = 31 games
3. **Seeding Source**: Choose how teams are seeded
   - **Manual**: You assign teams to each seed position
   - **Pools**: Automatically seed from pool play results
   - **Mixed**: Combination of manual and pool seeding

### Step 3: Seed the Bracket

#### Manual Seeding

1. Tap on each seed position
2. Select a team from the dropdown
3. Standard seeding: #1 seed plays lowest seed, #2 plays second-lowest, etc.

#### Automatic Seeding from Pools

1. Ensure all pool games are completed
2. Tap "Seed from Pools"
3. System automatically seeds based on pool standings:
   - All pool winners get top seeds
   - All pool runners-up get next seeds
   - And so on

### Step 4: Generate Bracket Games

1. After seeding, games are automatically generated
2. First round games are created with assigned teams
3. Later round games show "TBD" until winners are determined
4. Game dependencies are automatically set up

### Bracket Management Tips

- **Bracket Size**: Choose size based on number of advancing teams
- **Seeding Order**: Higher seeds should face lower seeds in first round
- **Scheduling**: Schedule first round, later rounds fill in as games complete
- **Manual Adjustments**: You can manually adjust seeds after automatic seeding

## Hybrid Tournaments

### Setup Process

1. **Create Pools First**
   - Set up all pools with teams
   - Set advancement count on each pool
   - Generate and schedule pool games

2. **Create Brackets**
   - Choose bracket size based on total advancing teams
   - Example: 4 pools with 2 advancing each = 8-team bracket
   - Set seeding source to "Pools"

3. **Complete Pool Play**
   - All pool games must be completed
   - System calculates final standings
   - Teams are ranked within each pool

4. **Advance to Brackets**
   - Tap "Advance to Brackets" button
   - System automatically seeds bracket from pool results
   - Bracket games are updated with team names

### Advancement Rules

Standard advancement order:
1. All 1st place teams from pools (seeds 1, 2, 3, ...)
2. All 2nd place teams from pools
3. All 3rd place teams from pools (if applicable)
4. Within same rank, teams are ordered by point differential

### Example Hybrid Tournament

**Setup:**
- 3 pools of 4 teams each (12 teams total)
- Top 2 from each pool advance (6 teams)
- Need 8-team bracket (6 advancing + 2 wildcards)

**Configuration:**
1. Create Pool A, B, C with 4 teams each
2. Set advancement count = 2 on each pool
3. Create 8-team bracket with "Pools" seeding
4. Add 2 wildcard teams manually if needed

## Managing Games

### Editing Games

1. Tap on any game in the schedule
2. Edit details:
   - Start time
   - Court/location
   - Teams (for non-bracket games)
3. **Warning**: Editing completed bracket games affects advancement

### Deleting Games

1. Select game to delete
2. Tap "Delete Game"
3. System shows warning if:
   - Game is part of a pool (affects standings)
   - Game is part of a bracket (affects dependencies)
4. Confirm deletion

### Scoring Games

1. Tap on game to view details
2. Enter scores for each team
3. Mark game as "Completed"
4. For bracket games:
   - Winner automatically advances to next round
   - Next game is updated with winning team
5. For pool games:
   - Standings are automatically recalculated
   - Cache is invalidated for fresh data

### Handling Issues

#### Incorrect Score Entered

1. Navigate to game detail
2. Edit scores
3. Save changes
4. System recalculates standings/advancement

#### Wrong Team Advanced in Bracket

1. Edit the completed game
2. System warns about dependent games
3. Manually update next round game if needed
4. Or delete and recreate bracket games

#### Pool Not Complete

- Check for games with status "Scheduled" or "In Progress"
- Complete or cancel all games before advancing to brackets
- System prevents advancement if pool play incomplete

## Best Practices

### Planning

- **Timeline**: Plan pool play for day 1, brackets for day 2
- **Court Availability**: Ensure enough courts for simultaneous games
- **Rest Time**: Allow 30-60 minutes between games for same team
- **Buffer Time**: Add buffer between pool play and bracket start

### Pool Configuration

- **Pool Size**: 4-6 teams per pool is optimal
  - 3 teams = only 3 games (too few)
  - 7+ teams = too many games (time consuming)
- **Balanced Pools**: Distribute skill levels evenly
- **Advancement**: Typically advance 1-2 teams per pool

### Bracket Configuration

- **Size Selection**: Choose next power of 2 above advancing teams
  - 5-8 advancing teams → 8-team bracket
  - 9-16 advancing teams → 16-team bracket
- **Byes**: If fewer teams than bracket size, top seeds get byes
- **Scheduling**: Schedule first round only, later rounds as games complete

### Communication

- **Publish Schedule**: Share pool play schedule before tournament
- **Bracket Updates**: Post bracket updates as games complete
- **Advancement**: Announce which teams advance from pools
- **Finals Time**: Clearly communicate championship game time

### Troubleshooting

#### "Cannot advance to brackets: pools not complete"
- Check all pool games are marked completed or cancelled
- Look for games stuck in "In Progress" status

#### "Too many teams for bracket size"
- Reduce advancement count in pools
- Or increase bracket size

#### "Bracket seeding failed"
- Ensure all pools have completed games
- Check that advancement count is set correctly
- Verify pool standings are calculated

#### Games not generating
- Verify pool has at least 2 teams
- Check for duplicate team names
- Ensure division is properly configured

### Performance Tips

- **Caching**: Standings are cached for 5 minutes
- **Refresh**: Pull down to refresh standings if needed
- **Batch Operations**: Create all pools before generating games
- **Pagination**: Large tournaments automatically paginate game lists

## Support

For additional help:
- Check the [User Guide](./POOLS_AND_BRACKETS_USER_GUIDE.md) for participant features
- Review [Troubleshooting Guide](./POOLS_AND_BRACKETS_TROUBLESHOOTING.md) for common issues
- Contact tournament support for technical assistance
