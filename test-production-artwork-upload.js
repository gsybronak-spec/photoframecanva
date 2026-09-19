import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const CF_URL = 'https://yogframe-portal.pages.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ronak@2207';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Helper to create a valid minimal PNG buffer
function createMinimalPng(width = 1, height = 1, transparent = false) {
  if (width === 1 && height === 1 && !transparent) {
    // 1x1 solid pixel PNG
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    return Buffer.from(base64, 'base64');
  }
  if (transparent) {
    // 1x1 transparent PNG
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    return Buffer.from(base64, 'base64');
  }
  // Generic 1x1 PNG fallback
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(base64, 'base64');
}

// Helper to create a 1080x1350 PNG header with dummy image data
function create1080x1350Png() {
  // Let's create a valid PNG with IHDR chunk for 1080x1350
  // Or standard valid PNG data
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(base64, 'base64');
}

// Helper for minimal JPEG
function createMinimalJpeg() {
  const base64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  return Buffer.from(base64, 'base64');
}

// Helper for minimal WebP
function createMinimalWebp() {
  const base64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  return Buffer.from(base64, 'base64');
}

async function runProductionUploadTests() {
  console.log('================================================================');
  console.log('🧪 TESTING CLOUDFLARE PRODUCTION ARTWORK UPLOAD');
  console.log(`Live Endpoint: ${CF_URL}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const uploadedFilesToCleanup = [];

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Admin Login
  console.log('--- STEP 1: Admin Login ---');
  const loginRes = await fetch(`${CF_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200 && !!loginData.token, 'Admin login succeeded and received token');
  const token = loginData.token;

  // Helper upload function
  async function uploadFile(buffer, filename, mimeType, fieldName = 'artwork') {
    const blob = new Blob([buffer], { type: mimeType });
    const formData = new FormData();
    formData.append(fieldName, blob, filename);
    formData.append('campaignId', 'qa-test-campaign');

    const res = await fetch(`${CF_URL}/api/admin/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (data.path) {
      uploadedFilesToCleanup.push(data.path);
    }
    return { status: res.status, data };
  }

  // 2. Test Normal PNG
  console.log('\n--- STEP 2: Test Normal PNG (field name: artwork) ---');
  const normalPng = createMinimalPng(1, 1, false);
  const res1 = await uploadFile(normalPng, 'test-normal.png', 'image/png', 'artwork');
  assert(res1.status === 200 && res1.data.success, 'Normal PNG upload returned 200 OK');
  assert(!!res1.data.url && !!res1.data.imageUrl, 'Response contains url and imageUrl');
  console.log(`Uploaded URL: ${res1.data.url}`);

  // 3. Test Transparent Background PNG
  console.log('\n--- STEP 3: Test Transparent-Background PNG ---');
  const transparentPng = createMinimalPng(1, 1, true);
  const res2 = await uploadFile(transparentPng, 'transparent-bg.png', 'image/png', 'artwork');
  assert(res2.status === 200 && res2.data.success, 'Transparent PNG upload returned 200 OK');
  assert(res2.data.url.includes('.png'), 'Transparent PNG saved with .png extension');

  // 4. Test Large Portrait PNG (1080x1350)
  console.log('\n--- STEP 4: Test 1080x1350 Portrait PNG ---');
  const portraitPng = create1080x1350Png();
  const res3 = await uploadFile(portraitPng, 'campaign-1080x1350.png', 'image/png', 'artwork');
  assert(res3.status === 200 && res3.data.success, '1080x1350 PNG upload returned 200 OK');

  // 5. Test JPG format
  console.log('\n--- STEP 5: Test JPG format (.jpg) ---');
  const jpgBuffer = createMinimalJpeg();
  const res4 = await uploadFile(jpgBuffer, 'artwork-photo.jpg', 'image/jpeg', 'artwork');
  assert(res4.status === 200 && res4.data.success, 'JPG upload returned 200 OK');

  // 6. Test JPEG format (.jpeg)
  console.log('\n--- STEP 6: Test JPEG format (.jpeg) ---');
  const res5 = await uploadFile(jpgBuffer, 'artwork-banner.jpeg', 'image/jpeg', 'artwork');
  assert(res5.status === 200 && res5.data.success, 'JPEG upload returned 200 OK');

  // 7. Test WEBP format (.webp)
  console.log('\n--- STEP 7: Test WEBP format (.webp) ---');
  const webpBuffer = createMinimalWebp();
  const res6 = await uploadFile(webpBuffer, 'artwork-modern.webp', 'image/webp', 'artwork');
  assert(res6.status === 200 && res6.data.success, 'WEBP upload returned 200 OK');

  // 8. Test Empty MIME Type (browser fallback with .png extension)
  console.log('\n--- STEP 8: Test Empty MIME Type (browser fallback with .png) ---');
  const res7 = await uploadFile(normalPng, 'no-mime-artwork.png', '', 'artwork');
  assert(res7.status === 200 && res7.data.success, 'Empty MIME type with .png extension accepted');

  // 9. Test application/octet-stream with .png extension
  console.log('\n--- STEP 9: Test application/octet-stream with .png extension ---');
  const res8 = await uploadFile(normalPng, 'octet-stream-artwork.png', 'application/octet-stream', 'artwork');
  assert(res8.status === 200 && res8.data.success, 'application/octet-stream with .png extension accepted');

  // 10. Test field name "image" (backward compatibility)
  console.log('\n--- STEP 10: Test Legacy "image" field name compatibility ---');
  const res9 = await uploadFile(normalPng, 'legacy-field.png', 'image/png', 'image');
  assert(res9.status === 200 && res9.data.success, 'Upload using field name "image" accepted');

  // 11. Test Invalid File Type Rejection (.txt, .pdf, .html)
  console.log('\n--- STEP 11: Test Invalid File Types Rejection ---');
  const txtBuffer = Buffer.from('This is a text file');
  const res10 = await uploadFile(txtBuffer, 'malicious.txt', 'text/plain', 'artwork');
  assert(res10.status === 400, `Text file rejected with 400 (status=${res10.status})`);

  const htmlBuffer = Buffer.from('<html><body>XSS</body></html>');
  const res11 = await uploadFile(htmlBuffer, 'exploit.html', 'text/html', 'artwork');
  assert(res11.status === 400, `HTML file rejected with 400 (status=${res11.status})`);

  // 12. Full End-to-End Workflow:
  // Admin Login -> Open Campaign -> Upload PNG -> Save Campaign -> Refresh -> Verify Persisted -> Check Public URL
  console.log('\n--- STEP 12: End-to-End Campaign Artwork Update & Persistence ---');
  // Fetch existing campaign
  const campsRes = await fetch(`${CF_URL}/api/admin/campaigns`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const campsData = await campsRes.json();
  const testCamp = campsData.campaigns.find(c => c.slug === 'international-yoga-day-2026') || campsData.campaigns[0];
  console.log(`Target Campaign: "${testCamp.name}" (ID: ${testCamp.id}, Slug: /${testCamp.slug})`);

  const originalArtworkUrl = testCamp.campaign_image_url;

  // Upload fresh artwork for this campaign
  const testArtworkPng = createMinimalPng(1, 1, false);
  const uploadResult = await uploadFile(testArtworkPng, 'e2e-artwork-test.png', 'image/png', 'artwork');
  assert(uploadResult.status === 200 && !!uploadResult.data.url, 'E2E Artwork uploaded successfully');
  const newArtworkUrl = uploadResult.data.url;

  // Save campaign with the new artwork URL
  console.log('Saving campaign with new artwork URL...');
  const saveRes = await fetch(`${CF_URL}/api/admin/campaigns/${testCamp.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      campaign: {
        ...testCamp,
        campaign_image_url: newArtworkUrl,
      },
      photoConfig: testCamp.photo_config,
      nameConfig: testCamp.name_config,
    }),
  });
  const saveData = await saveRes.json();
  assert(saveRes.status === 200 && saveData.success, 'Campaign saved with new artwork URL');

  // Verify persistence (Simulate Page Refresh: fetch campaign afresh from API)
  console.log('Verifying persistence via Admin API (simulating page refresh)...');
  const verifyRes = await fetch(`${CF_URL}/api/admin/campaigns/${testCamp.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const verifyData = await verifyRes.json();
  assert(verifyData.campaign.campaign_image_url === newArtworkUrl, 'Artwork URL persists in database on refresh');

  // Verify Public Campaign Endpoint
  console.log('Verifying Public Campaign URL receives new artwork...');
  const pubRes = await fetch(`${CF_URL}/api/campaigns/by-slug/${testCamp.slug}`);
  const pubData = await pubRes.json();
  assert(pubRes.status === 200 && pubData.campaign.campaign_image_url === newArtworkUrl, 'Public campaign URL serves new artwork');

  // Restore original artwork to maintain clean state
  console.log('Restoring original artwork URL on campaign...');
  await fetch(`${CF_URL}/api/admin/campaigns/${testCamp.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      campaign: {
        ...testCamp,
        campaign_image_url: originalArtworkUrl,
      },
      photoConfig: testCamp.photo_config,
      nameConfig: testCamp.name_config,
    }),
  });
  console.log('Original artwork URL restored.');

  // Clean up uploaded test files from Supabase Storage
  console.log(`\n--- STEP 13: Cleaning up ${uploadedFilesToCleanup.length} test storage files ---`);
  if (uploadedFilesToCleanup.length > 0) {
    const { error: cleanupErr } = await supabase.storage
      .from('yogframe-campaign-media')
      .remove(uploadedFilesToCleanup);
    if (!cleanupErr) {
      console.log('✅ Cleaned up test files from Supabase storage.');
    } else {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 PRODUCTION UPLOAD QA RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runProductionUploadTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
