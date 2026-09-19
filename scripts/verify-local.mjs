async function testLocal() {
  const url = 'http://localhost:3001/campaign/vadodara-yog-shibi-4046';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WhatsApp/2.23.20.0' }
  });

  const html = await res.text();

  console.log('--- LOCAL TEST RESULTS ---');
  console.log('Status code:', res.status);
  console.log('Contains gujarat-yog-board-logo.png:', html.includes('gujarat-yog-board-logo.png'));
  
  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  console.log('og:image:', ogImageMatch ? ogImageMatch[1] : 'NOT FOUND');

  const ogTypeMatch = html.match(/<meta\s+property=["']og:image:type["']\s+content=["']([^"']+)["']/i);
  console.log('og:image:type:', ogTypeMatch ? ogTypeMatch[1] : 'NOT FOUND');

  const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
  console.log('twitter:image:', twitterImageMatch ? twitterImageMatch[1] : 'NOT FOUND');

  const appleIconMatch = html.match(/<link\s+rel=["']apple-touch-icon["']\s+href=["']([^"']+)["']/i);
  console.log('apple-touch-icon:', appleIconMatch ? appleIconMatch[1] : 'NOT FOUND');

  const iconMatch = html.match(/<link\s+rel=["']icon["'][^>]*href=["']([^"']+)["']/i);
  console.log('icon:', iconMatch ? iconMatch[1] : 'NOT FOUND');
}

testLocal().catch(console.error);
