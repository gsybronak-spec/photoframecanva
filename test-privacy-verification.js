import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const BASE_URL = 'http://localhost:3001';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runPrivacyVerification() {
  console.log('================================================================');
  console.log('🧪 RUNNING YOGFRAME PRIVACY & DATA STORAGE COMPLIANCE TESTS');
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

  // 1. Fetch an active campaign
  console.log('--- TEST 1: Public Campaign Retrieval ---');
  const campRes = await fetch(`${BASE_URL}/api/campaigns/by-slug/international-yoga-day-2026`);
  const campData = await campRes.json();
  assert(campRes.status === 200, 'Public campaign by slug returns 200 OK');
  assert(campData.campaign && campData.campaign.slug === 'international-yoga-day-2026', 'Campaign data returned');
  const campaignId = campData.campaign.id;

  // 2. Count current storage objects in yogframe-campaign-media
  console.log('\n--- TEST 2: Inspect Initial Storage Bucket State ---');
  const { data: initialStorageFiles, error: storageErr } = await supabase.storage
    .from('yogframe-campaign-media')
    .list('', { recursive: true });
  assert(!storageErr, 'Listed files in yogframe-campaign-media bucket');
  console.log(`Current storage file count: ${initialStorageFiles?.length || 0}`);
  initialStorageFiles?.forEach(f => console.log(`  - File: ${f.name}`));

  // Ensure no generated user frames exist in storage initially
  const initialGeneratedFiles = (initialStorageFiles || []).filter(f => f.name.includes('generated') || f.name.includes('user_'));
  assert(initialGeneratedFiles.length === 0, 'Zero user-generated frames or user photos in storage');

  // 3. Count rows in yogframe_generated_frames
  console.log('\n--- TEST 3: Check Deprecated yogframe_generated_frames Table ---');
  const { count: initialFramesRowCount, error: countErr } = await supabase
    .from('yogframe_generated_frames')
    .select('*', { count: 'exact', head: true });
  assert(!countErr, 'Queried yogframe_generated_frames table');
  assert(initialFramesRowCount === 0, `yogframe_generated_frames is empty (count = ${initialFramesRowCount})`);

  // 4. Test Anonymous Frame Generation Endpoint
  console.log('\n--- TEST 4: Test Anonymous POST /api/campaigns/:id/generate ---');
  const genRes = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}), // Zero personal data sent
  });
  const genData = await genRes.json();
  assert(genRes.status === 201, 'Generate endpoint returns 201 Created');
  assert(genData.success === true, 'Response contains { success: true }');
  assert(genData.event && genData.event.event_type === 'generate', 'Event recorded with event_type = generate');
  assert(!genData.event.user_name && !genData.event.source_photo_url, 'Event contains NO user name or source photo');

  // 5. Verify Zero Database Writes to yogframe_generated_frames
  console.log('\n--- TEST 5: Verify yogframe_generated_frames Row Count Still Zero ---');
  const { count: postGenFramesCount } = await supabase
    .from('yogframe_generated_frames')
    .select('*', { count: 'exact', head: true });
  assert(postGenFramesCount === 0, `yogframe_generated_frames remains strictly 0 (count = ${postGenFramesCount})`);

  // 6. Verify Zero Storage Bucket Writes
  console.log('\n--- TEST 6: Verify Supabase Storage Remains Unchanged ---');
  const { data: postGenStorageFiles } = await supabase.storage
    .from('yogframe-campaign-media')
    .list('', { recursive: true });
  assert(postGenStorageFiles.length === initialStorageFiles.length, `Storage file count identical (${postGenStorageFiles.length} files)`);
  const anyUserFile = postGenStorageFiles.some(f => f.name.includes('generated') || f.name.includes('user_'));
  assert(!anyUserFile, 'Supabase storage has ZERO user-generated or personal images');

  // 7. Verify Schema of yogframe_share_events row
  console.log('\n--- TEST 7: Inspect yogframe_share_events Entry Schema ---');
  const { data: latestEvents } = await supabase
    .from('yogframe_share_events')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(1);

  assert(latestEvents && latestEvents.length > 0, 'Fetched latest share event from DB');
  const event = latestEvents[0];
  console.log('Latest event columns:', Object.keys(event));
  console.log('Event record:', JSON.stringify(event, null, 2));

  assert(event.event_type === 'generate', 'event_type is "generate"');
  assert(event.campaign_id === campaignId, 'campaign_id matches');
  assert(!('user_name' in event), 'No user_name column exists');
  assert(!('user_photo' in event), 'No user_photo column exists');
  assert(!('ip_address' in event), 'No ip_address column exists');
  assert(!('generated_frame_id' in event), 'generated_frame_id column dropped');
  assert(!('metadata' in event), 'metadata column dropped');

  // 8. Test Share Events Endpoints
  console.log('\n--- TEST 8: Test Anonymous Share Events Logging ---');
  for (const type of ['download', 'whatsapp', 'facebook', 'instagram', 'link']) {
    const shareRes = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: type }),
    });
    const shareData = await shareRes.json();
    assert(shareRes.status === 200 && shareData.success === true, `Logged anonymous "${type}" event`);
  }

  // 9. Verify Admin Metrics
  console.log('\n--- TEST 9: Verify Admin Metrics Aggregation ---');
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'yogframe@admin2026' }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200 && loginData.token, 'Admin login succeeded and token received');

  const metricsRes = await fetch(`${BASE_URL}/api/admin/metrics`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  const metrics = await metricsRes.json();
  assert(metricsRes.status === 200, 'Admin metrics returned 200 OK');
  console.log('Admin metrics:', JSON.stringify(metrics, null, 2));
  assert(typeof metrics.totalFrames === 'number' && metrics.totalFrames > 0, `totalFrames tracked: ${metrics.totalFrames}`);
  assert(typeof metrics.totalShares === 'number' && metrics.totalShares >= 5, `totalShares tracked: ${metrics.totalShares}`);
  assert(metrics.downloads >= 1, `downloads tracked: ${metrics.downloads}`);
  assert(metrics.whatsappShares >= 1, `whatsappShares tracked: ${metrics.whatsappShares}`);
  assert(metrics.facebookShares >= 1, `facebookShares tracked: ${metrics.facebookShares}`);
  assert(metrics.instagramShares >= 1, `instagramShares tracked: ${metrics.instagramShares}`);
  assert(metrics.linkShares >= 1, `linkShares tracked: ${metrics.linkShares}`);

  // 10. Verify Admin Campaigns List Metrics
  console.log('\n--- TEST 10: Verify Admin Campaigns List Metrics ---');
  const campsListRes = await fetch(`${BASE_URL}/api/admin/campaigns`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  const campsList = await campsListRes.json();
  assert(campsListRes.status === 200 && Array.isArray(campsList.campaigns), 'Admin campaigns list returned 200 OK');
  const targetCamp = campsList.campaigns.find(c => c.id === campaignId);
  assert(targetCamp !== undefined, 'Target campaign found in admin list');
  assert(typeof targetCamp.frames_count === 'number' && targetCamp.frames_count > 0, `Campaign frames_count: ${targetCamp.frames_count}`);
  assert(typeof targetCamp.shares_count === 'number' && targetCamp.shares_count >= 5, `Campaign shares_count: ${targetCamp.shares_count}`);

  console.log('\n================================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPrivacyVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
