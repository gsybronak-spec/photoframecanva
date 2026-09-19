const userAgents = {
  WhatsApp: 'WhatsApp/2.23.20.0',
  Facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  Twitter: 'Twitterbot/1.0',
  Chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function verifyProduction() {
  console.log('=== PRODUCTION VERIFICATION ===\n');

  const testCampaigns = [
    { slug: 'vadodara-yog-shibi-4046', name: 'vadodara yog shibi' },
    { slug: 'patan-yog-shibir', name: 'patan yog shibir' }
  ];

  for (const camp of testCampaigns) {
    console.log(`\n======================================================`);
    console.log(`Checking Campaign: ${camp.slug}`);
    console.log(`======================================================`);

    const cacheBuster = `v=prod-test-${Date.now().toString().slice(-4)}`;
    const url = `https://yogframe-portal.pages.dev/campaign/${camp.slug}?${cacheBuster}`;

    for (const [uaName, uaHeader] of Object.entries(userAgents)) {
      console.log(`\n--- Request as ${uaName} ---`);
      const res = await fetch(url, {
        headers: { 'User-Agent': uaHeader }
      });

      console.log(`Status: ${res.status}`);
      const html = await res.text();

      const hasLogo = html.includes('gujarat-yog-board-logo.png');
      console.log(`Contains gujarat-yog-board-logo.png: ${hasLogo ? 'FAIL (YES)' : 'PASS (NO)'}`);

      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      console.log(`Title: ${titleMatch ? titleMatch[1] : 'NOT FOUND'}`);

      const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      const ogImageUrl = ogImageMatch ? ogImageMatch[1] : null;
      console.log(`og:image: ${ogImageUrl || 'NOT FOUND'}`);

      const ogTypeMatch = html.match(/<meta\s+property=["']og:image:type["']\s+content=["']([^"']+)["']/i);
      console.log(`og:image:type: ${ogTypeMatch ? ogTypeMatch[1] : 'NOT FOUND'}`);

      const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
      console.log(`twitter:image: ${twitterImageMatch ? twitterImageMatch[1] : 'NOT FOUND'}`);

      const appleIconMatch = html.match(/<link\s+rel=["']apple-touch-icon["']\s+href=["']([^"']+)["']/i);
      console.log(`apple-touch-icon: ${appleIconMatch ? appleIconMatch[1] : 'NOT FOUND'}`);

      // Verify the social preview image asset directly on first UA pass
      if (uaName === 'WhatsApp' && ogImageUrl) {
        console.log(`\nDirectly verifying og:image asset: ${ogImageUrl}...`);
        const imgRes = await fetch(ogImageUrl);
        console.log(`Image HTTP status: ${imgRes.status}`);
        const contentType = imgRes.headers.get('content-type');
        const contentLength = parseInt(imgRes.headers.get('content-length') || '0', 10);
        console.log(`Image Content-Type: ${contentType}`);
        console.log(`Image Content-Length: ${contentLength} bytes (${(contentLength / 1024).toFixed(2)} KB)`);

        if (contentLength > 300 * 1024) {
          console.error(`FAIL: Image size ${(contentLength / 1024).toFixed(2)} KB exceeds 300 KB limit!`);
        } else {
          console.log(`PASS: Image size strictly within 300 KB budget (< 300 KB)`);
        }

        if (contentType && contentType.includes('image/jpeg')) {
          console.log(`PASS: Image format is JPEG`);
        } else {
          console.error(`FAIL: Image format is not JPEG (${contentType})`);
        }
      }
    }
  }

  // Verify yogboard.in
  console.log(`\n======================================================`);
  console.log(`Verifying external domain https://yogboard.in is untouched`);
  console.log(`======================================================`);
  try {
    const ybRes = await fetch('https://yogboard.in', {
      headers: { 'User-Agent': userAgents.Chrome }
    });
    console.log(`https://yogboard.in status: ${ybRes.status}`);
  } catch (err) {
    console.log(`https://yogboard.in error:`, err.message);
  }

  console.log('\nVerification complete!');
}

verifyProduction().catch(console.error);
