# Pools and Brackets Documentation

Complete documentation for the CourtSide pools and brackets tournament feature.

## Overview

CourtSide supports three flexible tournament formats:

1. **Pool Only**: Round-robin play within pools
2. **Bracket Only**: Single-elimination tournament
3. **Hybrid**: Pool play followed by bracket elimination

This documentation suite provides comprehensive guides for administrators, users, and developers.

## Documentation Structure

### User Guides

#### [Admin Guide](./POOLS_AND_BRACKETS_ADMIN_GUIDE.md)
Complete guide for tournament administrators on setting up and managing pools and brackets.

**Topics Covered**:
- Tournament format selection
- Pool creation and configuration
- Bracket setup and seeding
- Hybrid tournament management
- Game scheduling and management
- Best practices and tips

**Target Audience**: Tournament directors, administrators, organizers

#### [User Guide](./POOLS_AND_BRACKETS_USER_GUIDE.md)
Guide for tournament participants on viewing and following pools and brackets.

**Topics Covered**:
- Viewing pool standings
- Understanding bracket structure
- Division standings
- Team detail pages
- Following teams
- Game labels and context

**Target Audience**: Players, coaches, parents, fans

#### [Troubleshooting Guide](./POOLS_AND_BRACKETS_TROUBLESHOOTING.md)
Comprehensive troubleshooting guide for common issues.

**Topics Covered**:
- Pool play issues
- Bracket issues
- Advancement problems
- Game management issues
- Display problems
- Performance issues

**Target Audience**: Administrators, support staff, developers

### Example Configurations

#### [Pool-Only Tournament Example](./examples/POOL_ONLY_TOURNAMENT_EXAMPLE.md)
Complete example of a pool-only tournament with 12 teams in 3 pools.

**Demonstrates**:
- Pool configuration
- Round-robin game generation
- Standings calculation
- Champion determination

**Use Case**: Youth tournaments, recreational leagues, one-day events

#### [Bracket-Only Tournament Example](./examples/BRACKET_ONLY_TOURNAMENT_EXAMPLE.md)
Complete example of an 8-team single-elimination bracket tournament.

**Demonstrates**:
- Manual bracket seeding
- Game generation with dependencies
- Automatic winner advancement
- Bracket progression

**Use Case**: Championship events, playoff tournaments, time-constrained events

#### [Hybrid Tournament Example](./examples/HYBRID_TOURNAMENT_EXAMPLE.md)
Complete example of a 16-team hybrid tournament with pools feeding into brackets.

**Demonstrates**:
- Pool play configuration
- Automatic bracket seeding from pools
- Pool-to-bracket advancement
- Complete tournament flow

**Use Case**: Multi-day tournaments, competitive events, showcase tournaments

## Quick Start

### For Administrators

1. Read the [Admin Guide](./POOLS_AND_BRACKETS_ADMIN_GUIDE.md)
2. Review the appropriate example:
   - [Pool-Only](./examples/POOL_ONLY_TOURNAMENT_EXAMPLE.md)
   - [Bracket-Only](./examples/BRACKET_ONLY_TOURNAMENT_EXAMPLE.md)
   - [Hybrid](./examples/HYBRID_TOURNAMENT_EXAMPLE.md)
3. Plan your tournament structure
4. Set up pools and/or brackets in the app
5. Refer to [Troubleshooting Guide](./POOLS_AND_BRACKETS_TROUBLESHOOTING.md) if issues arise

### For Users

1. Read the [User Guide](./POOLS_AND_BRACKETS_USER_GUIDE.md)
2. Navigate to your tournament in the app
3. View pools, brackets, and standings
4. Follow your favorite teams
5. Check game schedules and results

### For Developers

1. Review the inline code documentation in:
   - `src/types/index.ts` - Data models
   - `src/services/tournament/PoolService.ts` - Pool management
   - `src/services/tournament/BracketService.ts` - Bracket management
   - `src/services/tournament/TournamentStructureService.ts` - Coordination
   - `src/services/tournament/TeamStatsService.ts` - Statistics
2. Study the example configurations for implementation patterns
3. Refer to the design document at `.kiro/specs/pools-and-brackets/design.md`

## Feature Highlights

### Pool Play
- Automatic round-robin game generation
- Real-time standings calculation
- Configurable advancement rules
- Tiebreaker resolution
- Performance-optimized with caching

### Bracket Play
- Support for 4, 8, 16, and 32-team brackets
- Automatic winner advancement
- Game dependency tracking
- Manual and automatic seeding
- Lazy loading for large brackets

### Hybrid Tournaments
- Seamless pool-to-bracket transition
- Automatic seeding from pool results
- Flexible advancement configuration
- Coordinated structure management

### User Experience
- Clear game labels (e.g., "Pool A Game 1", "Gold Bracket Finals")
- Real-time standings updates
- Team detail pages with complete statistics
- Follow teams for notifications
- Intuitive bracket visualization

## Technical Architecture

### Data Models
- **Pool**: Round-robin group configuration
- **Bracket**: Single-elimination structure
- **BracketSeed**: Team positioning in bracket
- **Game**: Extended with pool/bracket references
- **TeamStats**: Computed statistics
- **PoolStanding**: Pool-specific standings

### Services
- **PoolService**: Pool CRUD, game generation, standings
- **BracketService**: Bracket CRUD, game generation, advancement
- **TournamentStructureService**: Cross-service coordination
- **TeamStatsService**: Statistics calculation
- **FirebaseService**: Data persistence

### Key Features
- Batch operations for performance
- Caching with automatic invalidation
- Validation and error handling
- Real-time updates
- Pagination for large datasets

## Requirements Traceability

All features are traceable to requirements in `.kiro/specs/pools-and-brackets/requirements.md`:

- **Pool Play**: Requirements 1.x, 9.1
- **Bracket Play**: Requirements 2.x, 9.2
- **Advancement**: Requirements 3.x
- **Game Management**: Requirements 4.x
- **Display**: Requirements 5.x, 6.x
- **Standings**: Requirements 10.x
- **Team Details**: Requirements 11.x

## Support and Resources

### Documentation
- Admin Guide: Comprehensive setup and management
- User Guide: Participant features and navigation
- Troubleshooting: Common issues and solutions
- Examples: Real-world tournament configurations

### Code Documentation
- JSDoc comments on all service methods
- Type definitions with detailed descriptions
- Inline comments for complex logic
- Example usage in documentation

### Getting Help
- Check troubleshooting guide first
- Review relevant example configuration
- Contact tournament support
- Report bugs to development team

## Version History

### Version 1.0 (Current)
- Initial release of pools and brackets feature
- Support for all three tournament formats
- Complete documentation suite
- Example configurations

### Planned Enhancements
- Double elimination brackets
- Swiss system tournaments
- Consolation brackets
- Custom advancement rules
- Bracket templates
- PDF export

## Contributing

When updating this feature:

1. Update relevant documentation
2. Add JSDoc comments to new code
3. Update examples if behavior changes
4. Test with all three tournament formats
5. Update troubleshooting guide with new issues

## License

Copyright © 2024 CourtSide. All rights reserved.

## Contact

For questions or support:
- Email: support@courtside.app
- Documentation: This folder
- Code: `src/services/tournament/`
- Issues: GitHub issue tracker
