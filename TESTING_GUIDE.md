# Testing Guide

## Overview

Lumina uses property-based testing with [fast-check](https://github.com/dubzzz/fast-check) to validate correctness properties across all possible inputs. This ensures robust validation beyond traditional example-based testing.

## Test Categories

### 1. Unit Tests
Standard unit tests for individual functions and modules.

### 2. Property-Based Tests
Tests that verify universal properties hold across all inputs:
- Environment configuration
- Database constraints
- Email classification
- Webhook validation
- ICP scoring
- Dashboard metrics
- And more...

### 3. Integration Tests
Tests that verify complete workflows across multiple components.

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- path/to/test.ts
```

### Tests Requiring Database

Some tests (particularly RLS tests) require a PostgreSQL database. These tests will **gracefully skip** if the database is not available.

To run these tests:

```bash
# 1. Start test database
npm run test:db:up

# 2. Run tests
npm test

# 3. Stop test database (when done)
npm run test:db:down
```

See [TEST_DATABASE_SETUP.md](./TEST_DATABASE_SETUP.md) for detailed database setup instructions.

## Test Structure

### Property-Based Test Example

```typescript
import fc from 'fast-check';

it('should validate email classification', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.emailAddress(),
      async (email) => {
        const result = classifyEmail(email);
        
        // Property: Personal emails should be classified correctly
        if (email.endsWith('@gmail.com')) {
          expect(result).toBe('personal');
        }
      }
    ),
    { numRuns: 100 } // Run 100 random test cases
  );
});
```

### Test Annotations

Each property-based test includes annotations linking to requirements:

```typescript
/**
 * **Property 20: Row-level security isolation**
 * **Validates: Requirements 5.6**
 * 
 * For any two users from different organizations, querying subscribers 
 * should return only records belonging to their respective organizations 
 * with no cross-contamination.
 */
```

## Test Configuration

### Vitest Configuration

Tests are configured in `vite.config.ts`:

```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
}
```

### Environment Variables

Test environment variables are loaded from `.env.test`:

```bash
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5433/lumina_test
# ... other test variables
```

## Debugging Tests

### View Test Output

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run specific test with debugging
npm test -- --reporter=verbose path/to/test.ts
```

### Debug in VS Code

Add this configuration to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Test Coverage

To generate test coverage reports:

```bash
npm test -- --coverage
```

Coverage reports will be generated in the `coverage/` directory.

## Writing New Tests

### Guidelines

1. **Use property-based testing** for universal properties
2. **Use unit tests** for specific examples and edge cases
3. **Annotate tests** with property numbers and requirements
4. **Keep tests focused** on a single property or behavior
5. **Use descriptive test names** that explain what is being tested

### Property-Based Test Template

```typescript
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('Property X: Description', () => {
  it('should verify property holds', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generators for test inputs
        fc.string(),
        fc.integer(),
        async (input1, input2) => {
          // Test logic
          const result = functionUnderTest(input1, input2);
          
          // Assertions
          expect(result).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Common Issues

### Tests Timing Out

If tests are timing out, increase the timeout:

```typescript
it('should complete within time', async () => {
  // ... test code
}, { timeout: 10000 }); // 10 second timeout
```

### Database Connection Issues

If RLS tests fail with connection errors:

1. Ensure Docker is running
2. Start the test database: `npm run test:db:up`
3. Check database logs: `npm run test:db:logs`
4. See [TEST_DATABASE_SETUP.md](./TEST_DATABASE_SETUP.md) for troubleshooting

### Flaky Tests

Property-based tests may occasionally find edge cases. To reproduce:

```typescript
// fast-check provides a seed for reproduction
fc.assert(
  fc.property(...),
  { 
    seed: 1234567890, // Use seed from failed test
    path: "0:1:2"     // Use path from failed test
  }
);
```

## CI/CD Integration

Tests run automatically in CI/CD pipelines. For database-dependent tests:

```yaml
# Example GitHub Actions
- name: Start test database
  run: npm run test:db:up

- name: Run tests
  run: npm test

- name: Stop test database
  run: npm run test:db:down
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [fast-check Documentation](https://github.com/dubzzz/fast-check)
- [Property-Based Testing Guide](https://github.com/dubzzz/fast-check/blob/main/documentation/Guides.md)
- [Drizzle ORM Testing](https://orm.drizzle.team/docs/testing)

---

For more information, see the spec documents in `.kiro/specs/lumina-mvp/`.
