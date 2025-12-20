# Pools and Brackets Troubleshooting Guide

This guide helps resolve common issues with pool play and bracket tournaments in CourtSide.

## Table of Contents

1. [Pool Play Issues](#pool-play-issues)
2. [Bracket Issues](#bracket-issues)
3. [Advancement Issues](#advancement-issues)
4. [Game Management Issues](#game-management-issues)
5. [Display Issues](#display-issues)
6. [Performance Issues](#performance-issues)

## Pool Play Issues

### Pool Games Not Generating

**Symptom**: After creating a pool, no games appear in the schedule.

**Possible Causes**:
- Pool has fewer than 2 teams
- Duplicate team names in pool
- Network connectivity issue

**Solutions**:
1. Verify pool has at least 2 teams
2. Check for duplicate team names (case-sensitive)
3. Delete and recreate the pool
4. Check internet connection and retry
5. Force refresh the app

**Prevention**:
- Always add at least 2 teams before saving pool
- Use unique team names
- Verify team list before creating pool

### Incorrect Number of Pool Games

**Symptom**: Pool has wrong number of games (too many or too few).

**Expected Game Count**:
- 2 teams = 1 game
- 3 teams = 3 games
- 4 teams = 6 games
- 5 teams = 10 games
- 6 teams = 15 games
- Formula: N × (N-1) / 2

**Solutions**:
1. Count teams in pool
2. Verify expected game count using formula
3. If incorrect, delete pool and recreate
4. Check for hidden/duplicate teams

### Pool Standings Not Updating

**Symptom**: Standings don't change after completing games.

**Possible Causes**:
- Game not marked as "Completed"
- Cache not refreshed
- Score not saved properly

**Solutions**:
1. Verify game status is "Completed"
2. Pull down to refresh standings
3. Check that scores were saved (view game detail)
4. Wait 30 seconds and refresh again
5. Force close and reopen app

**Prevention**:
- Always mark games as "Completed" after entering scores
- Verify scores are saved before leaving game detail
- Enable auto-refresh in settings

### Tied Pool Standings

**Symptom**: Two teams have identical records and point differential.

**Tiebreaker Rules** (in order):
1. Wins (most wins wins)
2. Point differential (highest wins)
3. Head-to-head result (winner of game between tied teams)
4. Points scored (most points wins)

**Solutions**:
1. Check head-to-head game result
2. Verify all games are completed
3. If still tied, teams share the rank
4. For advancement, higher seed goes to team with more points scored

### Cannot Delete Pool

**Symptom**: Error when trying to delete a pool.

**Possible Causes**:
- Pool has completed games
- Pool is referenced by bracket
- Network issue

**Solutions**:
1. Check if pool has games - you'll see a warning
2. Confirm you want to delete games too
3. If pool is used for bracket seeding, remove bracket first
4. Check internet connection
5. Contact admin if issue persists

## Bracket Issues

### Bracket Games Not Generating

**Symptom**: After creating bracket, no games appear.

**Possible Causes**:
- Invalid bracket size
- Insufficient teams
- Network connectivity issue

**Solutions**:
1. Verify bracket size is 4, 8, 16, or 32
2. Ensure enough teams are available
3. Delete and recreate bracket
4. Check internet connection
5. Force refresh the app

**Prevention**:
- Choose valid bracket size
- Verify team availability before creating bracket
- Use "Preview" feature before creating

### TBD Teams Not Updating

**Symptom**: Bracket games still show "TBD" after previous games complete.

**Possible Causes**:
- Previous game not marked as "Completed"
- Winner not properly recorded
- Game dependency issue
- Cache not refreshed

**Solutions**:
1. Verify previous games are marked "Completed"
2. Check that winning team is correctly identified
3. Pull down to refresh bracket
4. View game detail to verify winner
5. If issue persists, manually update next game

**Prevention**:
- Always mark games as "Completed"
- Verify winner before moving to next game
- Enable auto-advancement in settings

### Wrong Team Advanced

**Symptom**: Incorrect team appears in next round of bracket.

**Possible Causes**:
- Wrong score entered
- Manual edit error
- System error

**Solutions**:
1. Check previous game score
2. Edit previous game if score is wrong
3. Manually update next round game with correct team
4. If needed, delete and recreate bracket games
5. Contact support if issue persists

**Prevention**:
- Double-check scores before marking complete
- Use score confirmation feature
- Review bracket after each round

### Cannot Seed Bracket from Pools

**Symptom**: "Seed from Pools" button doesn't work or shows error.

**Possible Causes**:
- Pool play not complete
- Insufficient advancing teams
- Bracket size mismatch
- No pools configured

**Solutions**:
1. Verify all pool games are completed
2. Check advancement count on each pool
3. Ensure total advancing teams ≤ bracket size
4. Verify pools exist for the division
5. Try manual seeding instead

**Prevention**:
- Complete all pool games before seeding
- Set correct advancement count on pools
- Choose appropriate bracket size

### Bracket Size Mismatch

**Symptom**: Error about bracket size when creating or seeding.

**Valid Bracket Sizes**: 4, 8, 16, 32 teams

**Solutions**:
1. Count total advancing teams from pools
2. Choose next power of 2 bracket size
   - 1-4 teams → 4-team bracket
   - 5-8 teams → 8-team bracket
   - 9-16 teams → 16-team bracket
   - 17-32 teams → 32-team bracket
3. Adjust pool advancement counts if needed
4. Use byes for unfilled bracket positions

## Advancement Issues

### "Pools Not Complete" Error

**Symptom**: Cannot advance to brackets, error says pools not complete.

**Possible Causes**:
- Games still in "Scheduled" status
- Games in "In Progress" status
- Cancelled games not marked

**Solutions**:
1. Check all pool games status
2. Complete or cancel any pending games
3. Mark in-progress games as completed
4. Verify no games are stuck in wrong status
5. Force refresh and try again

**Prevention**:
- Complete all games before attempting advancement
- Use bulk status update if available
- Check game list before advancing

### Wrong Teams Advancing

**Symptom**: Incorrect teams are seeded into bracket.

**Possible Causes**:
- Standings calculated incorrectly
- Advancement count set wrong
- Tied standings not resolved

**Solutions**:
1. Verify pool standings are correct
2. Check advancement count on each pool
3. Review tiebreaker rules for tied teams
4. Manually adjust bracket seeds if needed
5. Delete bracket and reseed

**Prevention**:
- Verify standings before advancing
- Set correct advancement count
- Resolve ties before advancing

### Advancement Count Mismatch

**Symptom**: Total advancing teams doesn't match bracket size.

**Example Issues**:
- 3 pools × 2 advancing = 6 teams, but bracket is 8 teams
- 4 pools × 3 advancing = 12 teams, but bracket is 8 teams

**Solutions**:
1. Calculate total: (pools × advancement count)
2. Adjust advancement count to match bracket size
3. Or change bracket size to match advancing teams
4. Use wildcards or byes to fill bracket
5. Manually seed remaining positions

**Prevention**:
- Plan bracket size before setting advancement counts
- Use calculator: pools × advancement = bracket size
- Document advancement rules clearly

## Game Management Issues

### Cannot Edit Completed Game

**Symptom**: Error when trying to edit a completed bracket game.

**Possible Causes**:
- Game has dependent games
- Winner has already advanced
- System protection against data corruption

**Solutions**:
1. Check if next round game exists
2. If winner advanced, edit next game first
3. Use "Force Edit" option if available
4. Contact admin for assistance
5. Delete and recreate games if necessary

**Prevention**:
- Verify scores before marking complete
- Use score confirmation feature
- Be cautious with bracket game edits

### Cannot Delete Game

**Symptom**: Error when trying to delete a game.

**Possible Causes**:
- Game is part of pool (affects standings)
- Game is part of bracket (affects dependencies)
- Game is completed with dependent games

**Solutions**:
1. Read warning message carefully
2. Understand impact on standings/bracket
3. Confirm deletion if impact is acceptable
4. Delete dependent games first if needed
5. Contact admin if unsure

**Prevention**:
- Avoid deleting games when possible
- Edit games instead of deleting
- Understand tournament structure before deleting

### Duplicate Games Created

**Symptom**: Same matchup appears multiple times in schedule.

**Possible Causes**:
- Pool regenerated without deleting old games
- Manual game creation duplicated auto-generated game
- System error

**Solutions**:
1. Identify duplicate games
2. Delete extra games (keep the one with correct details)
3. Verify pool configuration
4. Regenerate pool games if needed
5. Contact support if issue persists

**Prevention**:
- Don't manually create pool games
- Delete old games before regenerating pool
- Use system-generated games when possible

## Display Issues

### Game Labels Not Showing

**Symptom**: Games don't show pool/bracket labels.

**Possible Causes**:
- Game not associated with pool or bracket
- Label not generated
- Display bug

**Solutions**:
1. Check if game has poolId or bracketId
2. Edit game to assign to pool/bracket
3. Regenerate game label
4. Force refresh the app
5. Update to latest app version

**Prevention**:
- Use auto-generated games when possible
- Verify pool/bracket assignment
- Keep app updated

### Standings Not Visible

**Symptom**: Cannot see pool or division standings.

**Possible Causes**:
- No completed games yet
- Display tab not selected
- Network issue
- Cache issue

**Solutions**:
1. Verify games are completed
2. Select correct tab (Pools & Brackets or Standings)
3. Pull down to refresh
4. Check internet connection
5. Force close and reopen app

**Prevention**:
- Complete at least one game before checking standings
- Enable auto-refresh
- Maintain stable internet connection

### Bracket Not Displaying Correctly

**Symptom**: Bracket structure looks wrong or incomplete.

**Possible Causes**:
- Screen size issue
- Rendering bug
- Incomplete bracket data

**Solutions**:
1. Rotate device to landscape mode
2. Zoom in/out on bracket
3. Force refresh the bracket view
4. Update to latest app version
5. Try different device if available

**Prevention**:
- Use tablet for better bracket viewing
- Keep app updated
- Report display issues to support

## Performance Issues

### Slow Standings Loading

**Symptom**: Standings take long time to load or calculate.

**Possible Causes**:
- Large number of games
- Cache expired
- Network slow
- Device performance

**Solutions**:
1. Wait for initial load (may take 10-30 seconds)
2. Subsequent loads will be faster (cached)
3. Close other apps to free memory
4. Check internet speed
5. Use pagination if available

**Prevention**:
- Enable caching in settings
- Use WiFi instead of cellular
- Keep device updated
- Close unused apps

### App Freezing During Game Generation

**Symptom**: App becomes unresponsive when creating pool or bracket.

**Possible Causes**:
- Large pool size (many games to generate)
- Device memory low
- Background processes

**Solutions**:
1. Wait patiently (may take 30-60 seconds)
2. Don't tap repeatedly
3. Close other apps
4. Restart app if frozen for >2 minutes
5. Try smaller pool sizes

**Prevention**:
- Keep pools to 6 teams or fewer
- Close other apps before generating games
- Ensure device has adequate storage

### Notifications Not Working

**Symptom**: Not receiving notifications for followed teams.

**Possible Causes**:
- Notifications disabled in settings
- App permissions not granted
- Network issue
- Device settings

**Solutions**:
1. Check app notification settings
2. Verify device permissions for CourtSide
3. Enable notifications in device settings
4. Check "Do Not Disturb" mode
5. Reinstall app if needed

**Prevention**:
- Grant all permissions during setup
- Keep notifications enabled
- Check settings periodically

## Getting Additional Help

### When to Contact Support

Contact support if:
- Issue persists after trying solutions
- Data appears corrupted
- App crashes repeatedly
- Critical tournament functionality broken

### Information to Provide

When contacting support, include:
- Device type and OS version
- App version
- Tournament ID
- Division ID
- Specific error messages
- Screenshots of issue
- Steps to reproduce

### Emergency Procedures

For critical tournament issues:
1. Document the issue with screenshots
2. Contact tournament admin immediately
3. Use backup/manual tracking if needed
4. Report to support with "URGENT" tag
5. Follow up until resolved

### Resources

- **Admin Guide**: [POOLS_AND_BRACKETS_ADMIN_GUIDE.md](./POOLS_AND_BRACKETS_ADMIN_GUIDE.md)
- **User Guide**: [POOLS_AND_BRACKETS_USER_GUIDE.md](./POOLS_AND_BRACKETS_USER_GUIDE.md)
- **Support Email**: support@courtside.app
- **FAQ**: Check app settings → Help → FAQ
- **Community Forum**: community.courtside.app

## Preventive Maintenance

### Regular Checks

- Update app when new version available
- Clear cache monthly
- Verify tournament structure before event
- Test features with sample tournament
- Backup tournament data

### Best Practices

- Plan tournament structure in advance
- Test with small sample before live event
- Train admins on features
- Have backup plan for technical issues
- Document tournament rules clearly

### Monitoring

- Check app performance regularly
- Monitor user feedback
- Track common issues
- Update documentation as needed
- Report bugs to development team
