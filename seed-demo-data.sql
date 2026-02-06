-- Liwanag Demo Data Seed Script
-- Run this to populate the database with impressive demo data

-- Clear existing data (optional - comment out if you want to keep existing data)
-- TRUNCATE TABLE subscribers CASCADE;
-- TRUNCATE TABLE enrichment_jobs CASCADE;
-- TRUNCATE TABLE webhook_logs CASCADE;

-- Create a demo organization ID (reuse for all demo data)
DO $$
DECLARE
  demo_org_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert sample enriched subscribers (Hidden Gems)
  INSERT INTO subscribers (
    organization_id,
    email, 
    email_type, 
    source,
    job_title,
    company_name,
    company_domain,
    headcount,
    industry,
    icp_score,
    synced_to_crm,
    linkedin_url,
    created_at
  ) VALUES
  -- High-value leads (Hidden Gems)
  (
    demo_org_id,
    'sarah.jenkins@gmail.com', 
    'personal', 
    'Newsletter', 
    'Chief Technology Officer', 
    'TechCorp Solutions', 
    'techcorp.com', 
    500, 
    'Enterprise Software', 
    95, 
    false,
    'https://linkedin.com/in/sarahjenkins',
    NOW() - INTERVAL '2 hours'
  ),
  (
    demo_org_id,
    'mike.chen.tech@gmail.com', 
    'personal', 
    'Newsletter', 
    'VP of Engineering', 
    'DataScale Inc', 
    'datascale.io', 
    300, 
    'Data Analytics', 
    88, 
    false,
    'https://linkedin.com/in/mikechen',
    NOW() - INTERVAL '3 hours'
  ),
  (
    demo_org_id,
    'jessica.r@protonmail.com', 
    'personal', 
    'Webinar', 
    'Director of Product', 
    'CloudNine Technologies', 
    'cloudnine.com', 
    250, 
    'Cloud Infrastructure', 
    82, 
    false,
    'https://linkedin.com/in/jessicarodriguez',
    NOW() - INTERVAL '5 hours'
  ),
  (
    demo_org_id,
    'emily.watson@gmail.com', 
    'personal', 
    'Newsletter', 
    'Head of Growth', 
    'ScaleUp Inc', 
    'scaleup.com', 
    180, 
    'Marketing Technology', 
    78, 
    true,
    'https://linkedin.com/in/emilywatson',
    NOW() - INTERVAL '1 day'
  ),
  (
    demo_org_id,
    'alex.kumar@yahoo.com', 
    'personal', 
    'Newsletter', 
    'VP of Sales', 
    'RevOps Pro', 
    'revopspro.com', 
    150, 
    'Sales Enablement', 
    85, 
    false,
    'https://linkedin.com/in/alexkumar',
    NOW() - INTERVAL '6 hours'
  ),
  
  -- Medium-value leads
  (
    demo_org_id,
    'david.kim@yahoo.com', 
    'personal', 
    'Newsletter', 
    'Senior Software Engineer', 
    'StartupXYZ', 
    'startupxyz.com', 
    50, 
    'Technology', 
    45, 
    false,
    'https://linkedin.com/in/davidkim',
    NOW() - INTERVAL '8 hours'
  ),
  (
    demo_org_id,
    'lisa.martinez@gmail.com', 
    'personal', 
    'Webinar', 
    'Product Manager', 
    'InnovateCo', 
    'innovateco.com', 
    120, 
    'SaaS', 
    62, 
    false,
    'https://linkedin.com/in/lisamartinez',
    NOW() - INTERVAL '10 hours'
  ),
  (
    demo_org_id,
    'james.wilson@protonmail.com', 
    'personal', 
    'Newsletter', 
    'Engineering Manager', 
    'DevTools Inc', 
    'devtools.io', 
    80, 
    'Developer Tools', 
    58, 
    false,
    'https://linkedin.com/in/jameswilson',
    NOW() - INTERVAL '12 hours'
  ),
  
  -- Pending enrichment (to show the process)
  (
    demo_org_id,
    'pending.user@gmail.com', 
    'personal', 
    'Newsletter', 
    NULL, 
    NULL, 
    NULL, 
    NULL, 
    NULL, 
    0, 
    false,
    NULL,
    NOW() - INTERVAL '5 minutes'
  ),
  (
    demo_org_id,
    'another.pending@yahoo.com', 
    'personal', 
    'Webinar', 
    NULL, 
    NULL, 
    NULL, 
    NULL, 
    NULL, 
    0, 
    false,
    NULL,
    NOW() - INTERVAL '3 minutes'
  );
END $$;

-- Insert enrichment jobs to show activity
INSERT INTO enrichment_jobs (
  organization_id,
  subscriber_id,
  status,
  enrichment_id,
  estimated_credits,
  actual_credits,
  retry_count,
  created_at,
  completed_at
)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  id,
  CASE 
    WHEN job_title IS NOT NULL THEN 'enriched'
    ELSE 'pending'
  END,
  'fullenrich_' || substr(md5(random()::text), 1, 10),
  3,
  CASE WHEN job_title IS NOT NULL THEN 3 ELSE NULL END,
  0,
  created_at,
  CASE WHEN job_title IS NOT NULL THEN created_at + INTERVAL '30 seconds' ELSE NULL END
FROM subscribers;

-- Insert webhook logs to show system activity
INSERT INTO webhook_logs (
  source,
  payload,
  signature,
  is_valid,
  processed_at
) VALUES
  (
    'fullenrich',
    '{"id": "enrich_123", "status": "completed", "data": [{"email": "sarah.jenkins@gmail.com"}]}'::jsonb,
    'sha256=abc123...',
    true,
    NOW() - INTERVAL '2 hours'
  ),
  (
    'fullenrich',
    '{"id": "enrich_124", "status": "completed", "data": [{"email": "mike.chen.tech@gmail.com"}]}'::jsonb,
    'sha256=def456...',
    true,
    NOW() - INTERVAL '3 hours'
  ),
  (
    'newsletter',
    '{"email": "new.subscriber@gmail.com", "source": "Newsletter"}'::jsonb,
    'sha256=ghi789...',
    true,
    NOW() - INTERVAL '1 hour'
  );

-- Verify the data
SELECT 
  'Total Subscribers' as metric,
  COUNT(*)::text as value
FROM subscribers
UNION ALL
SELECT 
  'Enriched Subscribers',
  COUNT(*)::text
FROM subscribers
WHERE job_title IS NOT NULL
UNION ALL
SELECT 
  'Hidden Gems (ICP > 70)',
  COUNT(*)::text
FROM subscribers
WHERE icp_score > 70
UNION ALL
SELECT 
  'Synced to CRM',
  COUNT(*)::text
FROM subscribers
WHERE synced_to_crm = true
UNION ALL
SELECT 
  'Enrichment Jobs',
  COUNT(*)::text
FROM enrichment_jobs
UNION ALL
SELECT 
  'Webhook Logs',
  COUNT(*)::text
FROM webhook_logs;

-- Show the Hidden Gems
SELECT 
  email,
  job_title,
  company_name,
  headcount,
  icp_score,
  synced_to_crm
FROM subscribers
WHERE icp_score > 70
ORDER BY icp_score DESC;
