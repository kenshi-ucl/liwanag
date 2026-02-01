# Test Database Setup Guide

This guide explains how to set up and run the PostgreSQL test database required for property-based tests, particularly the RLS (Row-Level Security) tests.

## Prerequisites

- Docker and Docker Compose installed on your system
- Node.js and npm installed

## Quick Start

### 1. Start the Test Database

```bash
npm run test:db:up
```

This command starts a PostgreSQL 16 container with the following configuration:
- **Host**: localhost
- **Port**: 5433 (to avoid conflicts with local PostgreSQL on 5432)
- **Database**: lumina_test
- **User**: test
- **Password**: test

### 2. Verify Database is Running

```bash
npm run test:db:logs
```

You should see logs indicating PostgreSQL is ready to accept connections:
```
database system is ready to accept connections
```

### 3. Run Tests

```bash
npm test
```

The RLS property tests will now run successfully against the test database.

### 4. Stop the Test Database

When you're done testing:

```bash
npm run test:db:down
```

## Test Database Architecture

### Docker Compose Configuration

The test database is defined in `docker-compose.test.yml`:

- Uses PostgreSQL 16 Alpine (lightweight)
- Exposes port 5433 to avoid conflicts
- Includes health checks to ensure database is ready
- Persists data in a Docker volume (survives container restarts)

### Environment Configuration

Test environment variables are defined in `.env.test`:

```bash
DATABASE_URL=postgresql://test:test@localhost:5433/lumina_test
FULLENRICH_API_KEY=test-api-key
FULLENRICH_WEBHOOK_URL=https://test.example.com/api/webhooks/enrichment
NEWSLETTER_WEBHOOK_SECRET=test-newsletter-secret
FULLENRICH_WEBHOOK_SECRET=test-fullenrich-secret
NODE_ENV=test
PORT=3001
```

### Database Setup Utilities

The `src/test/db-setup.ts` module provides utilities for test database management:

- `initializeTestDatabase()` - Creates all required tables
- `cleanupTestDatabase()` - Truncates all tables between tests
- `dropTestDatabase()` - Drops all tables (use with caution)
- `closeTestDatabase()` - Closes database connection
- `isDatabaseAccessible()` - Checks if database is reachable

## RLS Property Tests

The RLS tests validate **Property 20: Row-level security isolation**:

> For any two users from different organizations, querying subscribers should return only records belonging to their respective organizations with no cross-contamination.

### Test Coverage

1. **Subscriber Isolation**: Verifies users can only see their organization's subscribers
2. **Enrichment Job Isolation**: Verifies users can only see their organization's enrichment jobs
3. **Cross-Organization Update Prevention**: Verifies users cannot update other organizations' data

### Graceful Degradation

If the test database is not available, the RLS tests will:
- Skip gracefully with a warning message
- Provide instructions on how to start the database
- Not fail the entire test suite

## Troubleshooting

### Port Already in Use

If port 5433 is already in use, you can modify `docker-compose.test.yml`:

```yaml
ports:
  - "5434:5432"  # Change 5433 to another port
```

Then update `.env.test`:

```bash
DATABASE_URL=postgresql://test:test@localhost:5434/lumina_test
```

### Database Connection Refused

1. Ensure Docker is running
2. Check if the container is healthy:
   ```bash
   docker ps
   ```
3. View container logs:
   ```bash
   npm run test:db:logs
   ```

### Permission Denied

On Linux, you may need to run Docker commands with sudo or add your user to the docker group:

```bash
sudo usermod -aG docker $USER
```

Then log out and back in for changes to take effect.

### Clean Start

To completely reset the test database:

```bash
npm run test:db:down
docker volume rm lumina_postgres-test-data
npm run test:db:up
```

## CI/CD Integration

For continuous integration environments, you can start the database as part of your CI pipeline:

```yaml
# Example GitHub Actions workflow
steps:
  - name: Start test database
    run: npm run test:db:up
  
  - name: Wait for database
    run: |
      until docker exec lumina-test-db pg_isready -U test -d lumina_test; do
        sleep 1
      done
  
  - name: Run tests
    run: npm test
  
  - name: Stop test database
    run: npm run test:db:down
```

## Best Practices

1. **Always start the database before running tests** that require database access
2. **Stop the database when done** to free up system resources
3. **Use separate databases** for development and testing (different ports)
4. **Don't commit** `.env` files with real credentials
5. **Clean up test data** between test runs to ensure isolation

## Additional Resources

- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Property-Based Testing with fast-check](https://github.com/dubzzz/fast-check)

---

For questions or issues, refer to the main README.md or the spec documents in `.kiro/specs/lumina-mvp/`.
