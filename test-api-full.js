// Enhanced API test script
// Run with: node test-api-full.js

async function testAPI() {
    console.log('🧪 Testing Liwanag API endpoints (Full Suite)...\n');

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

    console.log('');

    // Test 4: AI Outreach Generation (NEW!)
    console.log('4️⃣ Testing /api/outreach (AI Personalization)');
    try {
        const response = await fetch('http://localhost:3000/api/outreach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jobTitle: 'Chief Technology Officer',
                companyName: 'TechCorp Solutions',
                industry: 'Enterprise Software',
                headcount: 500
            })
        });
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success!');
            console.log('   Subject:', data.subject);
            console.log('   Opener:', data.opener.substring(0, 100) + '...');
        } else {
            console.log('❌ Failed:', response.status, response.statusText);
            const errorData = await response.json().catch(() => ({}));
            console.log('   Details:', JSON.stringify(errorData));
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    console.log('');

    // Test 5: Upload endpoint (check it responds)
    console.log('5️⃣ Testing /api/upload (ping check)');
    try {
        const response = await fetch('http://localhost:3000/api/upload', {
            method: 'POST',
            body: new FormData() // Empty form data should return error
        });
        // We expect a 400 error since no file is provided
        if (response.status === 400) {
            console.log('✅ Endpoint responds correctly (returns 400 for empty request)');
        } else {
            console.log('⚠️ Unexpected status:', response.status);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    console.log('\n✨ Full test suite complete!');
}

testAPI();
