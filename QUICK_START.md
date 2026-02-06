# Liwanag Quick Start Guide

## 🚀 Get Demo-Ready in 5 Minutes

### Step 1: Verify Environment
```bash
# Check if PostgreSQL is running
psql -U postgres -d liwanag -c "SELECT 1;"

# Should see: "1" (1 row)
```

### Step 2: Load Demo Data
```bash
# Load the sample data
psql -U postgres -d liwanag -f seed-demo-data.sql

# You should see:
# - 10 subscribers inserted
# - 10 enrichment jobs created
# - 3 webhook logs added
# - Summary statistics displayed
```

### Step 3: Start the Application
```bash
# Install dependencies (if not already done)
npm install

# Start the dev server
npm run dev

# Server will start at: http://localhost:3000
```

### Step 4: Verify the Demo
Open your browser and check:

1. **Landing Page**: http://localhost:3000
   - Should see Liwanag branding
   - "Illuminating Revenue in the Dark Funnel" tagline
   - View Dashboard and Upload Subscribers buttons

2. **Dashboard**: http://localhost:3000/dashboard
   - Should see metrics cards with data
   - Hidden Gems section with 5 high-value leads
   - All leads table with 10 total subscribers

### Step 5: Test the Upload Feature
1. Go to http://localhost:3000/upload (or click "Upload Subscribers")
2. Upload the `demo-subscribers.csv` file
3. Watch the processing happen
4. Return to dashboard to see new leads

## 🎯 Demo Flow

### For Hackathon Judges:

**1. Start on Landing Page** (30 sec)
- Explain the dark funnel problem
- Show the value proposition
- Click "View Dashboard"

**2. Show the Dashboard** (60 sec)
- Point out the metrics
- Highlight Hidden Gems (ICP > 70)
- Show enriched data: email → full profile
- Demonstrate "Sync to CRM" button

**3. Upload Demo** (60 sec)
- Click "Upload Subscribers"
- Upload `demo-subscribers.csv`
- Explain the enrichment process
- Show results appearing in real-time

**4. Explain the Tech** (30 sec)
- FullEnrich waterfall (15 providers)
- Async webhook architecture
- ICP scoring algorithm
- Production-ready stack

**5. ROI Pitch** (30 sec)
- $0.30 per enrichment
- $50k per enterprise deal
- 80%+ match rate on personal emails
- Immediate pipeline discovery

## 🔧 Troubleshooting

### Database Connection Error
```bash
# Check if PostgreSQL is running
pg_isready

# If not running, start it:
# Windows: Start PostgreSQL service from Services
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

### Environment Variables Not Loading
```bash
# Verify .env file exists
cat .env

# Should show:
# DATABASE_URL=postgresql://postgres:admin123@localhost:5432/liwanag
# FULLENRICH_API_KEY=612422ba-c8fb-409c-a2a4-4daa6ed08205
# etc.
```

### Port 3000 Already in Use
```bash
# Kill the process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Or use a different port:
npm run dev -- --port 3001
```

### No Data Showing on Dashboard
```bash
# Re-run the seed script
psql -U postgres -d liwanag -f seed-demo-data.sql

# Verify data exists
psql -U postgres -d liwanag -c "SELECT COUNT(*) FROM subscribers;"
```

## 📊 Expected Demo Data

After running `seed-demo-data.sql`, you should have:

- **10 Total Subscribers**
  - 8 enriched (with full profiles)
  - 2 pending (to show the process)

- **5 Hidden Gems** (ICP Score > 70)
  - Sarah Jenkins - CTO @ TechCorp (ICP: 95)
  - Mike Chen - VP Engineering @ DataScale (ICP: 88)
  - Alex Kumar - VP Sales @ RevOps Pro (ICP: 85)
  - Jessica Rodriguez - Director @ CloudNine (ICP: 82)
  - Emily Watson - Head of Growth @ ScaleUp (ICP: 78)

- **Metrics**
  - Enrichment Rate: 80%
  - High-Value Leads: 5
  - Synced to CRM: 1

## 🎬 Live Demo Checklist

Before presenting:
- [ ] Database is running and seeded
- [ ] Dev server is running (npm run dev)
- [ ] Browser is open to landing page
- [ ] demo-subscribers.csv is ready
- [ ] You've practiced the flow 3+ times
- [ ] Backup slides are ready (in case of tech issues)

## 🌐 Setting Up Webhooks (Optional for Live Demo)

### Option 1: webhook.site (Easiest)
```bash
# 1. Visit https://webhook.site
# 2. Copy your unique URL
# 3. Update .env:
FULLENRICH_WEBHOOK_URL=https://webhook.site/your-unique-id

# 4. Restart the server
```

### Option 2: ngrok (For localhost)
```bash
# 1. Install ngrok: https://ngrok.com/download
# 2. Start ngrok:
ngrok http 3000

# 3. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# 4. Update .env:
FULLENRICH_WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks/enrichment

# 5. Restart the server
```

## 💡 Pro Tips

1. **Practice the demo flow** - Know exactly where to click
2. **Have backup data** - If live enrichment fails, show pre-seeded data
3. **Tell a story** - Use Sarah Jenkins as your example persona
4. **Show the transformation** - Before (dark) → After (illuminated)
5. **End with ROI** - Judges care about business value

## 🎯 Key Talking Points

- **Problem**: 50% of revenue hiding in @gmail.com addresses
- **Solution**: Waterfall enrichment across 15 providers
- **Result**: 80%+ match rate on personal emails
- **Value**: $50k average pipeline per hidden gem
- **ROI**: $0.30 cost vs $50k value = Infinite ROI

## 📞 Support

If you encounter issues during setup:
1. Check the DEMO_GUIDE.md for detailed troubleshooting
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL is running and accessible
4. Check the browser console for errors

---

**You're ready to demo! 🚀**

Remember: You're not just showing a tool, you're illuminating hidden revenue. 
Make it compelling. Make it real. Win the hackathon.
