import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { verifyConnection, supabase } from './db.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

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

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/campaigns', publicRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'YogBoardFrame Portal API',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Dynamic Social Preview HTML for Campaign Pages
app.get('/campaign/:slug', async (req, res, next) => {
  const { slug } = req.params;
  const indexPath = path.join(distPath, 'index.html');
  try {
    const htmlTemplate = await fs.promises.readFile(indexPath, 'utf-8');
    const { data: campaign } = await supabase
      .from('yogframe_campaigns')
      .select('id, name, slug, description, status, campaign_image_url')
      .eq('slug', slug)
      .maybeSingle();

    if (campaign) {
      const campaignName = campaign.name || 'Campaign';
      const pageTitle = `YogBoardFrame — ${campaignName}`;
      const pageDesc = campaign.description && campaign.description.trim()
        ? campaign.description.trim()
        : `Create your personalized YogBoardFrame for ${campaignName}.`;
      const artworkUrl = campaign.campaign_image_url || '';
      const canonicalUrl = `${req.protocol}://${req.get('host')}/campaign/${encodeURIComponent(campaign.slug)}`;
      const imageType = getMimeType(artworkUrl);

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

      let html = htmlTemplate;
      html = html.replace(/<title>.*?<\/title>/gi, '');
      html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
      html = html.replace(/<link\s+rel=["']apple-touch-icon["'][^>]*>/gi, '');

      if (/<meta\s+charset=[^>]*>/i.test(html)) {
        html = html.replace(/(<meta\s+charset=[^>]*>)/i, `$1\n${metaTags}`);
      } else {
        html = html.replace(/<head>/i, `<head>\n${metaTags}`);
      }


      if (campaign.status === 'Active') {
        res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
      } else {
        res.set('Cache-Control', 'no-cache');
      }
      return res.type('html').send(html);
    }
  } catch (err) {
    console.error('Error serving local campaign HTML with meta:', err);
  }
  return res.sendFile(indexPath);
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('YogBoardFrame Portal API is running. Build frontend to view admin client.');
    }
  });
});


// Start server
app.listen(PORT, async () => {
  console.log(`===========================================`);
  console.log(`🧘 YogBoardFrame Portal Server running on http://localhost:${PORT}`);
  console.log(`===========================================`);
  await verifyConnection();
});
