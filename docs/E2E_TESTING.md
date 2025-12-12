# End-to-End Testing Guide

This document describes the end-to-end (E2E) testing strategy for the CourtSide mobile application.

## Overview

E2E tests verify complete user workflows from start to finish, ensuring that all components work together correctly. These tests simulate real user interactions and validate the entire application stack.

## Test Structure

### Test Files

E2E tests are located in `src/__tests__/e2e/`:

- `tournament-flow.test.tsx` - Tournament browsing and viewing
- `following-flow.test.tsx` - Following teams and games
- `admin-flow.test.tsx` - Admin panel and tournament management

### Test Categories

1. **Tournament Browsing Flow**
   - View tournament list
   - Navigate to tournament details
   - View divisions, schedule, and locations
   - Search and filter games

2. **Following Flow**
   - Follow/unfollow teams
   - Follow/unfollow games
   - Manage followed items
   - Notification preferences

3. **Admin Flow**
   - Create tournaments
   - Edit tournaments
   - Delete tournaments
   - Bulk import data

## Running E2E Tests

### Run All E2E Tests

```bash
npm test -- --testPathPattern=e2e
```

### Run Specific Test Suite

```bash
# Tournament flow
npm test -- tournament-flow.test.tsx

# Following flow
npm test -- following-flow.test.tsx

# Admin flow
npm test -- admin-flow.test.tsx
```

### Run with Coverage

```bash
npm test -- --testPathPattern=e2e --coverage
```

### Watch Mode

```bash
npm test -- --testPathPattern=e2e --watch
```

## Writing E2E Tests

### Test Structure

```typescript
describe('Feature E2E Flow', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };

  const mockRoute = {
    params: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete user workflow', async () => {
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <AuthProvider>
          <ScreenComponent 
            navigation={mockNavigation as any} 
            route={mockRoute as any} 
          />
        </AuthProvider>
      </NavigationContainer>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(getByText('Expected Text')).toBeTruthy();
    });

    // Simulate user interaction
    fireEvent.press(getByText('Button'));

    // Verify result
    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalled();
    });
  });
});
```

### Best Practices

1. **Test User Workflows, Not Implementation**
   - Focus on what users do, not how it's implemented
   - Test complete flows from start to finish
   - Avoid testing internal state or implementation details

2. **Use Realistic Data**
   - Mock Firebase with realistic tournament/game data
   - Use actual date/time values
   - Include edge cases (empty lists, errors)

3. **Wait for Async Operations**
   - Always use `waitFor` for async operations
   - Don't use arbitrary timeouts
   - Verify loading states

4. **Clean Up Between Tests**
   - Clear mocks in `beforeEach`
   - Reset navigation state
   - Clean up subscriptions

5. **Test Accessibility**
   - Verify screen reader labels
   - Check keyboard navigation
   - Test with different text sizes

## Mocking Firebase

### Basic Mock Setup

```typescript
jest.mock('../../services/firebase/config', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id',
      email: 'test@example.com',
    },
  },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'new-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  doc: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn((date) => ({ toDate: () => date })),
  },
}));
```

### Real-time Listener Mock

```typescript
jest.mock('firebase/firestore', () => ({
  onSnapshot: jest.fn((q, callback) => {
    // Simulate real-time update
    callback({
      docs: [
        {
          id: 'doc1',
          data: () => ({ name: 'Test Data' }),
        },
      ],
    });
    return jest.fn(); // unsubscribe function
  }),
}));
```

## Test Scenarios

### Critical User Flows

1. **New User Journey**
   - Register account
   - Browse tournaments
   - Follow a team
   - Receive notification

2. **Returning User Journey**
   - Login
   - View followed games
   - Check game scores
   - Unfollow team

3. **Admin Journey**
   - Login as admin
   - Create tournament
   - Add games
   - Publish tournament

### Edge Cases

1. **Network Errors**
   - Offline mode
   - Failed requests
   - Timeout scenarios

2. **Empty States**
   - No tournaments
   - No followed items
   - No search results

3. **Error States**
   - Invalid form data
   - Permission denied
   - Authentication errors

## Continuous Integration

### GitHub Actions

E2E tests run automatically on:
- Pull requests
- Pushes to main branch
- Nightly builds

### CI Configuration

```yaml
- name: Run E2E Tests
  run: npm test -- --testPathPattern=e2e --ci --coverage
```

## Debugging E2E Tests

### Enable Debug Output

```bash
DEBUG=* npm test -- tournament-flow.test.tsx
```

### View Test Results

```bash
npm test -- --verbose
```

### Generate Coverage Report

```bash
npm test -- --coverage --coverageDirectory=coverage/e2e
```

## Performance Considerations

1. **Parallel Execution**
   - Tests run in parallel by default
   - Use `--runInBand` for sequential execution if needed

2. **Test Isolation**
   - Each test should be independent
   - Don't rely on test execution order
   - Clean up after each test

3. **Mock Optimization**
   - Reuse mock setups where possible
   - Clear mocks between tests
   - Avoid unnecessary re-renders

## Troubleshooting

### Common Issues

1. **Timeout Errors**
   - Increase timeout: `jest.setTimeout(10000)`
   - Check for missing `waitFor` calls
   - Verify async operations complete

2. **Element Not Found**
   - Check accessibility labels
   - Verify element is rendered
   - Wait for async operations

3. **Navigation Errors**
   - Verify navigation mock setup
   - Check route parameters
   - Ensure NavigationContainer wraps component

### Debug Tips

```typescript
// Log rendered output
const { debug } = render(<Component />);
debug();

// Log specific element
const element = getByText('Text');
console.log(element);

// Check what's in the tree
const { container } = render(<Component />);
console.log(container);
```

## Future Improvements

- [ ] Add Detox for native E2E testing
- [ ] Implement visual regression testing
- [ ] Add performance benchmarks
- [ ] Test on real devices
- [ ] Add screenshot comparison
- [ ] Implement test data factories
- [ ] Add API contract testing

## Resources

- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Detox E2E Testing](https://wix.github.io/Detox/)
