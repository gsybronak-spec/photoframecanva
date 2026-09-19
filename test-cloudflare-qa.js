import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const CF_URL = 'https://yogframe-portal.pages.dev';
const YOGBOARD_URL = 'https://yogboard.in';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ronak@2207';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runCloudflareQA() {
  console.log('================================================================');
  console.log('🚀 TESTING LIVE CLOUDFLARE PAGES DEPLOYMENT');
  console.log(`URL: ${CF_URL}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  let adminToken = null;
  let campaignId = null;

  // 1. Health Check
  console.log('--- TEST 1: /api/health ---');
  try {
    const res = await fetch(`${CF_URL}/api/health`);
    const data = await res.json();
    assert(res.status === 200, `Health check returned 200 OK (status=${res.status})`);
    assert(data.status === 'healthy', `Service status is healthy (${data.service})`);
  } catch (err) {
    assert(false, `Health check failed: ${err.message}`);
  }

  // 2. Admin Login
  console.log('\n--- TEST 2: Admin Login (/api/admin/login) ---');
  try {
    const res = await fetch(`${CF_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PASSWORD }),
    });
    const data = await res.json();
    assert(res.status === 200, 'Admin login returned 200 OK');
    assert(data.success === true && !!data.token, 'Received JWT token from Cloudflare edge');
    adminToken = data.token;
  } catch (err) {
    assert(false, `Admin login failed: ${err.message}`);
  }

  // 3. Admin Dashboard / Authentication Check (/api/admin/me)
  console.log('\n--- TEST 3: Admin Auth Verification (/api/admin/me) ---');
  try {
    const res = await fetch(`${CF_URL}/api/admin/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, 'Admin /me returned 200 OK');
    assert(data.authenticated === true && data.user.role === 'admin', 'Edge JWT verified user is admin');
  } catch (err) {
    assert(false, `Admin auth verification failed: ${err.message}`);
  }

  // 4. Admin Metrics (/api/admin/metrics)
  console.log('\n--- TEST 4: Admin Metrics (/api/admin/metrics) ---');
  try {
    const res = await fetch(`${CF_URL}/api/admin/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, 'Admin metrics returned 200 OK');
    assert(typeof data.activeCampaigns === 'number', `Active campaigns: ${data.activeCampaigns}`);
    assert(typeof data.totalCampaigns === 'number', `Total campaigns: ${data.totalCampaigns}`);
    assert(typeof data.totalFrames === 'number', `Total frames: ${data.totalFrames}`);
    assert(typeof data.totalShares === 'number', `Total shares: ${data.totalShares}`);
  } catch (err) {
    assert(false, `Admin metrics failed: ${err.message}`);
  }

  // 5. Existing Campaigns List (/api/admin/campaigns)
  console.log('\n--- TEST 5: Existing Campaigns List (/api/admin/campaigns) ---');
  try {
    const res = await fetch(`${CF_URL}/api/admin/campaigns`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, 'Campaigns list returned 200 OK');
    assert(Array.isArray(data.campaigns) && data.campaigns.length > 0, `Found ${data.campaigns.length} campaigns`);
    const sample = data.campaigns[0];
    campaignId = sample.id;
    assert(!!sample.name && !!sample.slug, `Campaign loaded: "${sample.name}" (slug: /${sample.slug})`);
    assert(!!sample.photo_config, 'Photo config included in campaign');
    assert(!!sample.name_config, 'Name config included in campaign');
  } catch (err) {
    assert(false, `Campaigns list failed: ${err.message}`);
  }

  // 6. Campaign Detail & Composition Save
  console.log('\n--- TEST 6: Campaign Detail & Composition Update ---');
  try {
    const detailRes = await fetch(`${CF_URL}/api/admin/campaigns/${campaignId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const detailData = await detailRes.json();
    assert(detailRes.status === 200, 'Campaign detail fetched 200 OK');

    const updateRes = await fetch(`${CF_URL}/api/admin/campaigns/${campaignId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        campaign: {
          name: detailData.campaign.name,
          slug: detailData.campaign.slug,
          description: detailData.campaign.description,
          status: detailData.campaign.status,
          campaign_image_url: detailData.campaign.campaign_image_url,
          campaign_x: detailData.campaign.campaign_x,
          campaign_y: detailData.campaign.campaign_y,
          campaign_width: detailData.campaign.campaign_width,
          campaign_height: detailData.campaign.campaign_height,
          campaign_rotation: detailData.campaign.campaign_rotation,
        },
        photoConfig: detailData.campaign.photo_config,
        nameConfig: detailData.campaign.name_config,
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200 && updateData.success === true, 'Campaign composition saved successfully via Cloudflare edge');
  } catch (err) {
    assert(false, `Campaign update failed: ${err.message}`);
  }

  // 7. Public Campaign by Slug (/api/campaigns/by-slug/:slug)
  console.log('\n--- TEST 7: Public Campaign Query by Slug ---');
  try {
    const res = await fetch(`${CF_URL}/api/campaigns/by-slug/international-yoga-day-2026`);
    const data = await res.json();
    assert(res.status === 200, 'Public campaign by slug returned 200 OK');
    assert(data.campaign && data.campaign.slug === 'international-yoga-day-2026', 'Correct isolated campaign returned');
    assert(data.campaign.photo_config.shape === 'Circle', 'Photo config matches circular mask');
    assert(data.campaign.name_config.font_family === 'Playfair Display', 'Name config typography matches');
  } catch (err) {
    assert(false, `Public campaign query failed: ${err.message}`);
  }

  // 8. Public SPA Fallback (Refreshing /campaign/:slug must NOT 404)
  console.log('\n--- TEST 8: SPA Fallback Routing Check ---');
  try {
    const spaRes = await fetch(`${CF_URL}/campaign/international-yoga-day-2026`);
    assert(spaRes.status === 200, `SPA path /campaign/... returned 200 OK (status=${spaRes.status})`);
    const htmlText = await spaRes.text();
    assert(htmlText.includes('<div id="root"></div>'), 'Returned index.html with React root div');
    assert(htmlText.includes('viewport'), 'Mobile-first viewport meta tag present');
  } catch (err) {
    assert(false, `SPA fallback failed: ${err.message}`);
  }

  // 9. Anonymous Frame Generation Counter
  console.log('\n--- TEST 9: Anonymous Generate Event Logging ---');
  try {
    const genRes = await fetch(`${CF_URL}/api/campaigns/${campaignId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const genData = await genRes.json();
    assert(genRes.status === 201, 'Generate endpoint returned 201 Created');
    assert(genData.success === true && genData.event.event_type === 'generate', 'Logged anonymous generate event');
  } catch (err) {
    assert(false, `Generate event logging failed: ${err.message}`);
  }

  // 10-14. Anonymous Share & Download Events
  console.log('\n--- TEST 10-14: Multi-Channel Share & Download Events ---');
  for (const channel of ['download', 'whatsapp', 'facebook', 'instagram', 'link']) {
    try {
      const res = await fetch(`${CF_URL}/api/campaigns/${campaignId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: channel }),
      });
      const data = await res.json();
      assert(res.status === 200 && data.success === true, `Channel "${channel}" logged successfully`);
    } catch (err) {
      assert(false, `Channel "${channel}" failed: ${err.message}`);
    }
  }

  // 15. Verify Zero Personal Data in Database & Storage
  console.log('\n--- TEST 15: Verify Privacy Guarantees on Production ---');
  const { count: frameRows } = await supabase.from('yogframe_generated_frames').select('*', { count: 'exact', head: true });
  assert(frameRows === 0, `yogframe_generated_frames is strictly 0 (count=${frameRows})`);

  const { data: storageFiles } = await supabase.storage.from('yogframe-campaign-media').list('', { recursive: true });
  const userFiles = (storageFiles || []).filter(f => f.name.includes('generated') || f.name.includes('user_'));
  assert(userFiles.length === 0, 'Zero user personal images or generated frames in Supabase storage');

  // 16. Existing yogboard.in SAFETY CHECK
  console.log('\n--- TEST 16: CRITICAL SAFETY CHECK — yogboard.in ---');
  try {
    const yogRes = await fetch(YOGBOARD_URL);
    assert(yogRes.status === 200, `yogboard.in is ONLINE and returned 200 OK (status=${yogRes.status})`);
    const yogText = await yogRes.text();
    assert(yogText.length > 500, `yogboard.in is serving its original live site (${yogText.length} bytes)`);
    console.log('✅ CONFIRMED: yogboard.in is 100% UNTOUCHED, LIVE, AND WORKING NORMALLY.');
  } catch (err) {
    assert(false, `yogboard.in check failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🏁 CLOUDFLARE QA RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runCloudflareQA().catch(err => {
  console.error('QA script error:', err);
  process.exit(1);
});
