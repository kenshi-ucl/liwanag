# Liwanag Setup Complete ✅

## What's Been Configured

### 1. Environment Variables (.env)
Your `.env` file has been created with:

- **Database**: Connected to PostgreSQL at `localhost:5432/liwanag`
  - Username: `postgres`
  - Password: `admin123`
  - Database: `liwanag`

- **FullEnrich API**: 
  - API Key: `612422ba-c8fb-409c-a2a4-4daa6ed08205`
  - Webhook URL: `https://your-domain.com/api/webhooks/enrichment` (update when deployed)

- **Webhook Secrets** (auto-generated):
  - Newsletter: `12fbe57d88b8fc2bc87a72de4dab60ae7d09d1e4333df55606a8bb280a11b442`
  - FullEnrich: `246c45b24cef511e6249dcc57d4df9fa075d39fe48af4f64930c77fd23f26d71`

### 2. Database Schema
Three tables created successfully:
- `subscribers` - Stores newsletter subscribers and enriched data
- `enrichment_jobs` - Tracks FullEnrich API enrichment jobs
- `webhook_logs` - Logs all incoming webhook requests

## Next Steps

### For Development (localhost)
1. **Update webhook URL for testing**:
   ```bash
   # Option A: Use webhook.site for quick testing
   # Visit https://webhook.site and copy your unique URL
   # Update FULLENRICH_WEBHOOK_URL in .env
   
   # Option B: Use ngrok to expose localhost
   ngrok http 3000
   # Copy the HTTPS URL and update FULLENRICH_WEBHOOK_URL
   ```

2. **Start the dev server**:
   ```bash
   npm run dev
   ```

3. **Test the setup**:
   - Visit http://localhost:3000
   - Try uploading a CSV with subscriber data
   - Check webhook.site or ngrok for incoming webhooks

### For Production
1. Deploy your app to a hosting service
2. Update `FULLENRICH_WEBHOOK_URL` to your production domain:
   ```
   https://yourdomain.com/api/webhooks/enrichment
   ```

## Webhook Security

Your webhook endpoints will validate incoming requests using the secrets:
- Newsletter webhooks: Verified with `NEWSLETTER_WEBHOOK_SECRET`
- FullEnrich webhooks: Verified with `FULLENRICH_WEBHOOK_SECRET`

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql -U postgres -d liwanag
# Password: admin123
```

### Environment Variable Issues
```bash
# Verify env vars are loaded
npm run dev
# Check console for validation errors
```

### Webhook Testing
Use webhook.site to inspect payloads:
1. Visit https://webhook.site
2. Copy your unique URL
3. Update FULLENRICH_WEBHOOK_URL in .env
4. Trigger an enrichment
5. View the payload on webhook.site

## Available Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Database
npm run db:push          # Push schema changes to database
npm run db:studio        # Open Drizzle Studio (database GUI)
npm run db:generate      # Generate migrations

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:db:up       # Start test database (Docker)
npm run test:db:down     # Stop test database
```

## Ready to Go! 🚀

Your Liwanag application is now configured and ready for development. Start the dev server and begin building your dark funnel lead enrichment system!
