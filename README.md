# Lumina MVP - Dark Funnel Intelligence Engine

A B2B lead intelligence platform that converts "dark funnel" signals (personal email subscriptions) into actionable enterprise pipeline through data enrichment and ICP scoring.

## Project Setup Complete ✅

This project has been initialized with:

- **TanStack Start** - Full-stack React framework with TypeScript strict mode
- **Drizzle ORM** - Type-safe database access with PostgreSQL
- **Zod** - Runtime validation for environment variables and API schemas
- **Vitest** - Testing framework with property-based testing support
- **fast-check** - Property-based testing library
- **Tailwind CSS** - Utility-first CSS framework

## Database Schema

The following tables have been defined:

### Subscribers
- Stores subscriber information from webhooks and file uploads
- Tracks enrichment data (LinkedIn, job title, company info)
- Includes ICP scoring and CRM sync status

### Enrichment Jobs
- Manages asynchronous enrichment requests to FullEnrich API
- Tracks job status, credits, and retry logic
- Foreign key relationship to subscribers

### Webhook Logs
- Audit trail for all webhook events
- Stores raw payloads and signature validation results

## Environment Configuration

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lumina

# FullEnrich API
FULLENRICH_API_KEY=your_api_key
FULLENRICH_WEBHOOK_URL=https://your-domain.com/api/webhooks/enrichment

# Webhook Secrets
NEWSLETTER_WEBHOOK_SECRET=your_secret
FULLENRICH_WEBHOOK_SECRET=your_secret

# Application
NODE_ENV=development
PORT=3000
```

## Available Scripts

```bash
# Development
npm run dev              # Start development server on port 3000

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode

# Database
npm run db:generate      # Generate database migrations
npm run db:migrate       # Run database migrations
npm run db:push          # Push schema changes to database
npm run db:studio        # Open Drizzle Studio (database GUI)

# Build
npm run build            # Build for production
npm run preview          # Preview production build
```

## Testing

The project includes comprehensive property-based tests:

### Environment Configuration Tests
- Validates environment variable loading
- Tests missing required variables
- Verifies URL format validation
- Tests default values

### Database Constraint Tests
- Validates email uniqueness constraint (Property 17)
- Validates foreign key integrity (Property 19)
- Tests UUID primary keys
- Verifies not null constraints

### RLS (Row-Level Security) Tests
- Validates organization data isolation (Property 20)
- Tests cross-organization access prevention
- Requires PostgreSQL test database

**Note**: RLS tests require a running PostgreSQL database. See [TEST_DATABASE_SETUP.md](./TEST_DATABASE_SETUP.md) for setup instructions.

### Running Tests

```bash
# Run all tests (RLS tests will skip if database not available)
npm test

# Start test database for RLS tests
npm run test:db:up

# Run tests with database
npm test

# Stop test database
npm run test:db:down
```

## Next Steps

1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations: `npm run db:push`
4. Start development server: `npm run dev`
5. Begin implementing data ingestion layer (Task 2)

## Architecture

The system follows a layered architecture:

```
Data Ingestion → Enrichment Pipeline → ICP Scoring → Dashboard
```

- **Data Ingestion**: Webhooks and file uploads
- **Enrichment Pipeline**: FullEnrich API integration with Rilo workflows
- **ICP Scoring**: Automated lead qualification
- **Dashboard**: Real-time analytics and lead management

## Requirements Validated

This setup validates the following requirements:

- **5.1-5.6**: Database schema and data integrity
- **11.1-11.4**: Environment configuration and security
- **15.1-15.4**: TypeScript type safety

## Property-Based Testing

All tests use property-based testing with fast-check to verify correctness properties across all possible inputs. This ensures robust validation beyond traditional example-based testing.

---

For more information, see the spec documents in `.kiro/specs/lumina-mvp/`.
