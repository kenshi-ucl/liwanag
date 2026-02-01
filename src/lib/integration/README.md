# Integration Tests

This directory contains integration tests that verify the complete end-to-end flows of the Lumina MVP application.

## Test Files

### 1. webhook-enrichment.integration.test.ts
Tests the complete webhook-to-enrichment flow:
- Newsletter webhook received → subscriber created
- Enrichment job created for personal emails
- FullEnrich API called (simulated)
- Enrichment webhook callback received
- Subscriber updated with enriched data
- ICP score calculated automatically

**Key Test Cases:**
- Complete flow for personal email
- No enrichment job for corporate email
- Partial enrichment data handling
- Duplicate webhook idempotency
- Invalid signature rejection

### 2. file-upload.integration.test.ts
Tests the complete file upload flow:
- File parsing (CSV/Excel)
- Intra-file deduplication
- Cross-file deduplication (existing subscribers)
- Subscriber creation
- Enrichment job creation for personal emails
- Upload summary accuracy

**Key Test Cases:**
- CSV file upload with complete flow
- Intra-file deduplication
- Cross-file deduplication
- Missing email column error
- Empty file handling
- Invalid email handling
- Large file upload (1000 rows)
- File size limit enforcement

### 3. dashboard.integration.test.ts
Tests dashboard queries with real database data:
- Metrics calculation (dark funnel percentage, credit usage, etc.)
- Lead filtering (ICP score, company name, job title, sync status)
- Hidden gems query (enriched leads with ICP > 70)
- CRM sync integration
- Complex query scenarios

**Key Test Cases:**
- Dashboard metrics with mixed data
- Empty database handling
- Dark funnel percentage calculation
- Enrichment status aggregation
- ICP score filtering
- Company name search (case-insensitive partial match)
- Job title search (case-insensitive partial match)
- Sync status filtering
- Multiple filter combination (AND logic)
- Hidden gems filtering
- CRM sync status updates
- Large dataset efficiency (100 subscribers)
- Data consistency across queries

## Prerequisites

### Database Setup
Integration tests require a PostgreSQL database. Use Docker Compose to start the test database:

```bash
# Start test database
npm run test:db:up

# Check database logs
npm run test:db:logs

# Stop test database
npm run test:db:down
```

The test database runs on port 5433 (not 5432) to avoid conflicts with development databases.

### Environment Variables
The tests use environment variables from `.env.test`:

```env
DATABASE_URL=postgresql://test:test@localhost:5433/lumina_test
FULLENRICH_API_KEY=test-api-key
FULLENRICH_WEBHOOK_URL=https://test.com/webhook
NEWSLETTER_WEBHOOK_SECRET=test-newsletter-secret
FULLENRICH_WEBHOOK_SECRET=test-fullenrich-secret
NODE_ENV=test
PORT=3000
```

## Running Tests

### Run All Integration Tests
```bash
npm test -- --run src/lib/integration
```

### Run Specific Test File
```bash
npm test -- --run src/lib/integration/webhook-enrichment.integration.test.ts
npm test -- --run src/lib/integration/file-upload.integration.test.ts
npm test -- --run src/lib/integration/dashboard.integration.test.ts
```

### Run Tests in Watch Mode
```bash
npm run test:watch src/lib/integration
```

## Test Structure

Each integration test follows this structure:

1. **Setup (beforeAll)**: Initialize test database schema
2. **Cleanup (beforeEach)**: Clear all data between tests
3. **Test Cases**: Execute complete flows with real database operations
4. **Teardown (afterAll)**: Close database connections

## Database Helpers

The tests use helper functions from `@/test/db-setup`:

- `initializeTestDatabase()`: Creates database schema
- `cleanupTestDatabase()`: Truncates all tables
- `closeTestDatabase()`: Closes database connection
- `isDatabaseAccessible()`: Checks database connectivity

## Test Data Helpers

Each test file includes helper functions to create test data:

- `createTestSubscriber()`: Creates a subscriber with custom fields
- `createTestJob()`: Creates an enrichment job with custom status

## Assertions

Tests verify:
- **Data Flow**: Data flows correctly through all layers
- **Business Logic**: ICP scoring, email classification, deduplication
- **Database Integrity**: Foreign keys, unique constraints, timestamps
- **API Contracts**: Request/response formats, error handling
- **Performance**: Large dataset handling, query efficiency

## Troubleshooting

### Database Connection Errors
If tests fail with `ECONNREFUSED`:
1. Ensure Docker is running
2. Start the test database: `npm run test:db:up`
3. Verify database is accessible: `docker ps`

### Test Timeouts
If tests timeout:
1. Check database performance
2. Increase timeout in test configuration
3. Verify no hanging connections

### Data Inconsistencies
If tests fail with unexpected data:
1. Ensure `cleanupTestDatabase()` is called in `beforeEach`
2. Check for test isolation issues
3. Verify no shared state between tests

## Coverage

Integration tests cover:
- ✅ Complete webhook-to-enrichment flow
- ✅ Complete file upload flow
- ✅ Dashboard metrics calculation
- ✅ Lead filtering and search
- ✅ Hidden gems query
- ✅ CRM sync integration
- ✅ Error handling and edge cases
- ✅ Performance with large datasets

## Next Steps

After running integration tests:
1. Review test results and coverage
2. Fix any failing tests
3. Add additional test cases for edge cases
4. Run full test suite: `npm test`
5. Proceed to task 18: Final system verification
