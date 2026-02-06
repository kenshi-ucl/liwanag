// Quick API test script
// Run with: node test-api.js

async function testAPI() {
  console.log('🧪 Testing Liwanag API endpoints...\n');

  // Test 1: Dashboard Metrics
  console.log('1️⃣ Testing /api/dashboard/metrics');
  try {
    const response = await fetch('http://localhost:3000/api/dashboard/metrics');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success!');
      console.log('   Total Subscribers:', data.totalSubscribers);
      console.log('   Enriched:', data.enrichedCount);
      console.log('   Dark Funnel %:', data.darkFunnelPercentage);
    } else {
      console.log('❌ Failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('');

  // Test 2: Hidden Gems
  console.log('2️⃣ Testing /api/leads?minICPScore=71');
  try {
    const response = await fetch('http://localhost:3000/api/leads?minICPScore=71');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success!');
      console.log('   Hidden Gems Found:', data.totalCount);
      if (data.leads && data.leads.length > 0) {
        console.log('   First Lead:', data.leads[0].email, '-', data.leads[0].jobTitle);
      }
    } else {
      console.log('❌ Failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('');

  // Test 3: All Leads
  console.log('3️⃣ Testing /api/leads (all)');
  try {
    const response = await fetch('http://localhost:3000/api/leads');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success!');
      console.log('   Total Leads:', data.totalCount);
    } else {
      console.log('❌ Failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n✨ Test complete!');
}

testAPI();
