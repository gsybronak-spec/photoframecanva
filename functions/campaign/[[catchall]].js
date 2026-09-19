import { createClient } from '@supabase/supabase-js';

/**
 * Cloudflare Pages Function: Dynamic Campaign Social Preview Metadata
 * Intercepts /campaign/:slug requests to inject campaign-specific Open Graph and Twitter
 * meta tags (using the campaign's admin-configured artwork URL) into the initial HTML response
 * before it reaches social crawlers (WhatsApp, Facebook, Twitter, Telegram, etc.).
 *
 * Browsers receive this HTML, mount the React application normally, and execute clientside.
 * Zero user-generated personal photos or canvas exports are involved.
 */

function getSupabase(env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in environment');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getMimeType(url) {
  if (!url) return 'image/png';
  if (/\.jpe?g($|\?)/i.test(url)) return 'image/jpeg';
  if (/\.webp($|\?)/i.test(url)) return 'image/webp';
  return 'image/png';
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Extract campaign slug from pathname: /campaign/:slug
  const match = url.pathname.match(/^\/campaign\/([a-zA-Z0-9\-_]+)/);
  const slug = match ? match[1] : null;

  // 1. Fetch the base index.html from static assets
  const indexUrl = new URL('/index.html', url.origin);
  const assetRes = await env.ASSETS.fetch(new Request(indexUrl, {
    headers: request.headers,
    method: 'GET',
  }));

  if (!slug) {
    return assetRes;
  }

  try {
    const supabase = getSupabase(env);
    const { data: campaign, error } = await supabase
      .from('yogframe_campaigns')
      .select('id, name, slug, description, status, campaign_image_url')
      .eq('slug', slug)
      .maybeSingle();

    // If query fails or campaign doesn't exist, return default index.html for React SPA handling
    if (error || !campaign) {
      return assetRes;
    }

    let html = await assetRes.text();

    const campaignName = campaign.name || 'Campaign';
    const pageTitle = `YogBoardFrame — ${campaignName}`;
    const pageDesc = campaign.description && campaign.description.trim()
      ? campaign.description.trim()
      : `Create your personalized YogBoardFrame for ${campaignName}.`;
    const artworkUrl = campaign.campaign_image_url || '';
    const canonicalUrl = `${url.origin}/campaign/${encodeURIComponent(campaign.slug)}`;
    const imageType = getMimeType(artworkUrl);

    // Build campaign-specific Open Graph and Twitter tags using the campaign's actual artwork
    const metaTags = [
      `    <title>${escapeHtml(pageTitle)}</title>`,
      `    <meta name="description" content="${escapeHtml(pageDesc)}" />`,
      `    <meta property="og:title" content="${escapeHtml(pageTitle)}" />`,
      `    <meta property="og:description" content="${escapeHtml(pageDesc)}" />`,
      artworkUrl ? `    <meta property="og:image" content="${escapeHtml(artworkUrl)}" />` : '',
      artworkUrl ? `    <meta property="og:image:secure_url" content="${escapeHtml(artworkUrl)}" />` : '',
      artworkUrl ? `    <meta property="og:image:type" content="${imageType}" />` : '',
      `    <meta property="og:image:width" content="1080" />`,
      `    <meta property="og:image:height" content="1080" />`,
      `    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
      `    <meta property="og:type" content="website" />`,
      `    <meta name="twitter:card" content="summary_large_image" />`,
      `    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`,
      `    <meta name="twitter:description" content="${escapeHtml(pageDesc)}" />`,
      artworkUrl ? `    <meta name="twitter:image" content="${escapeHtml(artworkUrl)}" />` : '',
      artworkUrl ? `    <link rel="apple-touch-icon" href="${escapeHtml(artworkUrl)}" />` : '',
    ].filter(Boolean).join('\n');

    // Remove static default title, description, and apple-touch-icon from template
    html = html.replace(/<title>.*?<\/title>/gi, '');
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
    html = html.replace(/<link\s+rel=["']apple-touch-icon["'][^>]*>/gi, '');

    // Inject meta tags right at the top of <head> after charset for maximum crawler priority
    if (/<meta\s+charset=[^>]*>/i.test(html)) {
      html = html.replace(/(<meta\s+charset=[^>]*>)/i, `$1\n${metaTags}`);
    } else {
      html = html.replace(/<head>/i, `<head>\n${metaTags}`);
    }

    const headers = new Headers(assetRes.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');

    // Edge cache control isolated per campaign URL
    if (campaign.status === 'Active') {
      headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
    } else {
      headers.set('Cache-Control', 'no-cache');
    }

    return new Response(html, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('Error injecting dynamic campaign meta:', err);
    return assetRes;
  }
}
