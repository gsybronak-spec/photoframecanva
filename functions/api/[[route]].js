import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { createClient } from '@supabase/supabase-js';

const app = new Hono().basePath('/api');

const BUCKET_NAME = 'yogframe-campaign-media';

// Helper: Initialize Supabase client per request from environment
function getSupabase(c) {
  const url = c.env.SUPABASE_URL;
  const key = c.env.SUPABASE_SERVICE_ROLE_KEY;

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

// Helper: Slugify string
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// CORS Middleware
app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    credentials: true,
  })
);

// Admin Auth Middleware
async function requireAdminAuth(c, next) {
  const authHeader = c.req.header('Authorization');
  const cookieToken = getCookie(c, 'yogframe_admin_token');
  let token = authHeader || cookieToken;

  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  }

  if (!token) {
    return c.json({ error: 'Unauthorized: Admin authentication required' }, 401);
  }

  const secret = c.env.SESSION_SECRET || 'yogframe_secret_key_change_in_production_2026';

  try {
    const payload = await verify(token, secret, 'HS256');
    if (!payload || !payload.authenticated) {
      return c.json({ error: 'Unauthorized: Invalid token session' }, 401);
    }
    c.set('adminUser', payload);
    await next();
  } catch (err) {
    return c.json({ error: 'Unauthorized: Token verification failed' }, 401);
  }
}

// -------------------------------------------------------------
// Health Check
// -------------------------------------------------------------
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'YogBoardFrame Portal API (Cloudflare Edge)',
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// Admin Auth Endpoints
// -------------------------------------------------------------
app.post('/admin/login', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const password = body.password;
    const expectedPassword = c.env.ADMIN_PASSWORD || 'Ronak@2207';

    if (!password || password !== expectedPassword) {
      return c.json({ error: 'Invalid admin credentials' }, 401);
    }

    const secret = c.env.SESSION_SECRET || 'yogframe_secret_key_change_in_production_2026';
    const token = await sign(
      {
        role: 'admin',
        authenticated: true,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      },
      secret
    );

    setCookie(c, 'yogframe_admin_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return c.json({ success: true, token });
  } catch (err) {
    return c.json({ error: err.message || 'Login failed' }, 500);
  }
});

app.post('/admin/logout', (c) => {
  deleteCookie(c, 'yogframe_admin_token', { path: '/' });
  return c.json({ success: true, message: 'Logged out successfully' });
});

app.get('/admin/me', requireAdminAuth, (c) => {
  return c.json({ authenticated: true, user: c.get('adminUser') });
});

// -------------------------------------------------------------
// Admin Metrics Endpoint
// -------------------------------------------------------------
app.get('/admin/metrics', requireAdminAuth, async (c) => {
  try {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    const supabase = getSupabase(c);

    // Call database-level aggregate stored functions (Zero 1,000 row limits, 100% accurate)
    const [{ data: overall, error: overallErr }, { data: campaignMetrics, error: campErr }] =
      await Promise.all([
        supabase.rpc('get_admin_overall_metrics'),
        supabase.rpc('get_admin_campaign_analytics'),
      ]);

    if (overallErr) throw overallErr;
    if (campErr) throw campErr;

    return c.json({
      ...overall,
      campaigns: campaignMetrics || [],
    });
  } catch (err) {
    console.error('Error fetching admin metrics:', err);
    return c.json({ error: err.message || 'Failed to fetch metrics' }, 500);
  }
});

// Lightweight in-memory rate limiting map for edge functions
const rateLimitMap = new Map();
function isRateLimited(ip, limit = 60, windowMs = 60000) {
  const now = Date.now();
  if (rateLimitMap.size > 5000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now - val.startTime > 60000) rateLimitMap.delete(key);
    }
  }
  const record = rateLimitMap.get(ip);
  if (!record || now - record.startTime > windowMs) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return false;
  }
  if (record.count >= limit) {
    return true;
  }
  record.count++;
  return false;
}

// -------------------------------------------------------------
// Admin Campaign Management Endpoints
// -------------------------------------------------------------
app.get('/admin/campaigns', requireAdminAuth, async (c) => {
  try {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    const supabase = getSupabase(c);
    const status = c.req.query('status');
    const district = c.req.query('district');
    const search = c.req.query('search');
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(c.req.query('limit') || '25', 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('yogframe_campaigns')
      .select(
        `
        *,
        photo_config:yogframe_campaign_photo_config(*),
        name_config:yogframe_campaign_name_config(*)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    if (district && district !== 'All') {
      query = query.eq('district', district);
    }

    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`name.ilike.%${s}%,slug.ilike.%${s}%,district.ilike.%${s}%`);
    }

    query = query.range(from, to);

    const { data: campaigns, count, error } = await query;
    if (error) throw error;

    const campaignList = campaigns || [];
    const campaignIds = campaignList.map((camp) => camp.id);
    let campMetricsMap = {};

    if (campaignIds.length > 0) {
      const { data: cMetrics } = await supabase.rpc('get_admin_campaign_analytics');
      if (cMetrics) {
        cMetrics.forEach((cm) => {
          campMetricsMap[cm.id] = cm;
        });
      }
    }

    const enrichedCampaigns = campaignList.map((camp) => {
      const cm = campMetricsMap[camp.id] || {};
      return {
        ...camp,
        photo_config: Array.isArray(camp.photo_config)
          ? camp.photo_config[0] || null
          : camp.photo_config,
        name_config: Array.isArray(camp.name_config)
          ? camp.name_config[0] || null
          : camp.name_config,
        frames_count: Number(cm.generated_count || 0),
        downloads_count: Number(cm.downloads_count || 0),
        shares_count: Number(cm.shares_count || 0),
        whatsapp_count: Number(cm.whatsapp_count || 0),
        facebook_count: Number(cm.facebook_count || 0),
        instagram_count: Number(cm.instagram_count || 0),
        link_count: Number(cm.link_count || 0),
      };
    });

    const total = count != null ? count : enrichedCampaigns.length;
    const totalPages = Math.ceil(total / limit) || 1;

    return c.json({
      campaigns: enrichedCampaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('Error fetching campaigns list:', err);
    return c.json({ error: err.message || 'Failed to fetch campaigns' }, 500);
  }
});

app.post('/admin/campaigns', requireAdminAuth, async (c) => {
  try {
    const supabase = getSupabase(c);
    const body = await c.req.json();
    const campData = body.campaign || body;
    const photoData = body.photoConfig || body.photo_config;
    const nameData = body.nameConfig || body.name_config;

    const {
      name,
      slug,
      district,
      description,
      status = 'Draft',
      campaign_image_url,
      campaign_x = 0,
      campaign_y = 0,
      campaign_width = 100,
      campaign_height = 100,
      campaign_rotation = 0,
      canvas_width = 1080,
      canvas_height = 1350,
    } = campData;

    if (!name || !name.trim()) {
      return c.json({ error: 'Campaign name is required' }, 400);
    }

    let baseSlug = slugify(slug || name);
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (true) {
      const { data: existing } = await supabase
        .from('yogframe_campaigns')
        .select('id')
        .eq('slug', uniqueSlug)
        .maybeSingle();

      if (!existing) break;
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newCampaignData = {
      name: name.trim(),
      slug: uniqueSlug,
      district: district && district.trim() ? district.trim() : null,
      description: description ? description.trim() : null,
      status,
      campaign_image_url: campaign_image_url || null,
      social_preview_image_url: campData.social_preview_image_url || null,
      campaign_x,
      campaign_y,
      campaign_width,
      campaign_height,
      campaign_rotation,
      canvas_width: Number(canvas_width) || 1080,
      canvas_height: Number(canvas_height) || 1350,
    };

    if (status === 'Active') {
      newCampaignData.activated_at = new Date().toISOString();
    }

    const { data: campaign, error: campErr } = await supabase
      .from('yogframe_campaigns')
      .insert(newCampaignData)
      .select()
      .single();

    if (campErr) throw campErr;

    const { data: photoConfig, error: photoErr } = await supabase
      .from('yogframe_campaign_photo_config')
      .insert({
        campaign_id: campaign.id,
        enabled: photoData?.enabled ?? false,
        shape: photoData?.shape || 'Square',
        x: photoData?.x ?? 32,
        y: photoData?.y ?? 42,
        width: photoData?.width ?? 35,
        height: photoData?.height ?? 28,
        rotation: photoData?.rotation ?? 0,
      })
      .select()
      .single();

    if (photoErr) throw photoErr;

    const { data: nameConfig, error: nameErr } = await supabase
      .from('yogframe_campaign_name_config')
      .insert({
        campaign_id: campaign.id,
        enabled: nameData?.enabled ?? false,
        x: nameData?.x ?? 18,
        y: nameData?.y ?? 78,
        width: nameData?.width ?? 64,
        height: nameData?.height ?? 10,
        rotation: nameData?.rotation ?? 0,
        font_family: nameData?.font_family || 'DM Sans',
        font_size: nameData?.font_size != null ? Number(nameData.font_size) : 26,
        font_color: nameData?.font_color || '#fff8e9',
        font_weight: nameData?.font_weight || 'bold',
        alignment: nameData?.alignment || 'center',
        letter_spacing: nameData?.letter_spacing != null ? Number(nameData.letter_spacing) : 1,
      })
      .select()
      .single();

    if (nameErr) throw nameErr;

    return c.json(
      {
        success: true,
        campaign: {
          ...campaign,
          photo_config: photoConfig,
          name_config: nameConfig,
        },
      },
      201
    );
  } catch (err) {
    console.error('Error creating campaign:', err);
    return c.json({ error: err.message || 'Failed to create campaign' }, 500);
  }
});

app.get('/admin/campaigns/:id', requireAdminAuth, async (c) => {
  try {
    const supabase = getSupabase(c);
    const id = c.req.param('id');

    const { data: campaign, error } = await supabase
      .from('yogframe_campaigns')
      .select(`
        *,
        photo_config:yogframe_campaign_photo_config(*),
        name_config:yogframe_campaign_name_config(*)
      `)
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return c.json({ error: 'Campaign not found' }, 404);
    }

    const formatted = {
      ...campaign,
      photo_config: Array.isArray(campaign.photo_config)
        ? campaign.photo_config[0] || null
        : campaign.photo_config,
      name_config: Array.isArray(campaign.name_config)
        ? campaign.name_config[0] || null
        : campaign.name_config,
    };

    return c.json({ campaign: formatted });
  } catch (err) {
    console.error('Error fetching campaign detail:', err);
    return c.json({ error: err.message || 'Failed to fetch campaign' }, 500);
  }
});

app.put('/admin/campaigns/:id', requireAdminAuth, async (c) => {
  try {
    const supabase = getSupabase(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    // Support both flat body payload (from App.jsx savePayload) AND nested body { campaign, photoConfig, nameConfig }
    const campData = body.campaign || body;
    const photoData = body.photoConfig || body.photo_config;
    const nameData = body.nameConfig || body.name_config;

    // Check if campaign exists
    const { data: existingCamp, error: fetchErr } = await supabase
      .from('yogframe_campaigns')
      .select('id, name, slug')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !existingCamp) {
      return c.json({ error: 'Campaign not found' }, 404);
    }

    // Determine slug
    let finalSlug = campData.slug ? slugify(campData.slug) : undefined;
    if (finalSlug) {
      const { data: slugCheck } = await supabase
        .from('yogframe_campaigns')
        .select('id')
        .eq('slug', finalSlug)
        .neq('id', id)
        .maybeSingle();

      if (slugCheck) {
        finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
      }
    }

    const campaignUpdates = {
      updated_at: new Date().toISOString(),
    };

    if (campData.name !== undefined) campaignUpdates.name = campData.name.trim();
    if (finalSlug !== undefined) campaignUpdates.slug = finalSlug;
    if (campData.district !== undefined) campaignUpdates.district = campData.district && campData.district.trim() ? campData.district.trim() : null;
    if (campData.description !== undefined) campaignUpdates.description = campData.description ? campData.description.trim() : null;
    if (campData.status !== undefined) {
      campaignUpdates.status = campData.status;
      if (campData.status === 'Active') {
        campaignUpdates.activated_at = new Date().toISOString();
      }
    }
    if (campData.campaign_image_url !== undefined) campaignUpdates.campaign_image_url = campData.campaign_image_url;
    if (campData.social_preview_image_url !== undefined) campaignUpdates.social_preview_image_url = campData.social_preview_image_url;
    if (campData.campaign_x !== undefined) campaignUpdates.campaign_x = campData.campaign_x;
    if (campData.campaign_y !== undefined) campaignUpdates.campaign_y = campData.campaign_y;
    if (campData.campaign_width !== undefined) campaignUpdates.campaign_width = campData.campaign_width;
    if (campData.campaign_height !== undefined) campaignUpdates.campaign_height = campData.campaign_height;
    if (campData.campaign_rotation !== undefined) campaignUpdates.campaign_rotation = campData.campaign_rotation;
    if (campData.canvas_width !== undefined) campaignUpdates.canvas_width = Number(campData.canvas_width) || 1080;
    if (campData.canvas_height !== undefined) campaignUpdates.canvas_height = Number(campData.canvas_height) || 1350;

    const { data: updatedCamp, error: campErr } = await supabase
      .from('yogframe_campaigns')
      .update(campaignUpdates)
      .eq('id', id)
      .select()
      .single();

    if (campErr) throw campErr;

    // Photo config upsert
    let updatedPhoto = null;
    if (photoData) {
      const { data: pData, error: photoErr } = await supabase
        .from('yogframe_campaign_photo_config')
        .upsert(
          {
            campaign_id: id,
            enabled: photoData.enabled !== false,
            shape: photoData.shape || 'Square',
            x: photoData.x ?? 32,
            y: photoData.y ?? 42,
            width: photoData.width ?? 35,
            height: photoData.height ?? 28,
            rotation: photoData.rotation ?? 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'campaign_id' }
        )
        .select()
        .single();

      if (photoErr) throw photoErr;
      updatedPhoto = pData;
    }

    // Name config upsert
    let updatedName = null;
    if (nameData) {
      const { data: nData, error: nameErr } = await supabase
        .from('yogframe_campaign_name_config')
        .upsert(
          {
            campaign_id: id,
            enabled: nameData.enabled !== false,
            x: nameData.x ?? 18,
            y: nameData.y ?? 78,
            width: nameData.width ?? 64,
            height: nameData.height ?? 10,
            rotation: nameData.rotation ?? 0,
            font_family: nameData.font_family || 'DM Sans',
            font_size: nameData.font_size != null ? Number(nameData.font_size) : 26,
            font_color: nameData.font_color || '#fff8e9',
            font_weight: nameData.font_weight || 'bold',
            alignment: nameData.alignment || 'center',
            letter_spacing: nameData.letter_spacing != null ? Number(nameData.letter_spacing) : 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'campaign_id' }
        )
        .select()
        .single();

      if (nameErr) throw nameErr;
      updatedName = nData;
    }

    return c.json({
      success: true,
      message: 'Campaign composition saved successfully',
      campaign: {
        ...updatedCamp,
        photo_config: updatedPhoto,
        name_config: updatedName,
      },
    });
  } catch (err) {
    console.error('Error saving campaign composition:', err);
    return c.json({ error: err.message || 'Failed to save campaign composition' }, 500);
  }
});

app.patch('/admin/campaigns/:id/status', requireAdminAuth, async (c) => {
  try {
    const supabase = getSupabase(c);
    const id = c.req.param('id');
    const { status } = await c.req.json();

    const validStatuses = ['Draft', 'Active', 'Paused', 'Archived'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
    }

    const updates = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'Active') {
      updates.activated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('yogframe_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, campaign: data });
  } catch (err) {
    console.error('Error updating campaign status:', err);
    return c.json({ error: err.message || 'Failed to update campaign status' }, 500);
  }
});

app.delete('/admin/campaigns/:id', requireAdminAuth, async (c) => {
  try {
    const supabase = getSupabase(c);
    const id = c.req.param('id');

    const { error } = await supabase.from('yogframe_campaigns').delete().eq('id', id);
    if (error) throw error;

    return c.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (err) {
    console.error('Error deleting campaign:', err);
    return c.json({ error: err.message || 'Failed to delete campaign' }, 500);
  }
});

// -------------------------------------------------------------
// Admin Artwork Upload Endpoint (Standard Web API FormData)
// -------------------------------------------------------------
app.post('/admin/upload', requireAdminAuth, async (c) => {
  try {
    const supabase = getSupabase(c);
    const formData = await c.req.raw.formData();

    // Support both 'artwork' and 'image' field names
    const file = formData.get('artwork') || formData.get('image');
    const campaignId = formData.get('campaignId') || 'general';

    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return c.json({ error: 'No artwork file provided' }, 400);
    }

    // File size validation (20 MB limit)
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    if (file.size && file.size > MAX_FILE_SIZE) {
      return c.json({ error: 'Artwork file exceeds 20MB limit' }, 400);
    }

    const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
    const ALLOWED_MIME_TYPES = [
      'image/png',
      'image/x-png',
      'image/jpeg',
      'image/jpg',
      'image/pjpeg',
      'image/webp',
    ];

    const originalName = file.name || 'artwork.png';
    const lastDot = originalName.lastIndexOf('.');
    const ext = lastDot !== -1 ? originalName.slice(lastDot).toLowerCase() : '';
    const rawMime = (file.type || '').toLowerCase().trim();

    const isExtensionValid = ALLOWED_EXTENSIONS.includes(ext);
    const isMimeValid =
      ALLOWED_MIME_TYPES.includes(rawMime) ||
      ((rawMime === '' || rawMime === 'application/octet-stream') && isExtensionValid);

    if (!isExtensionValid || !isMimeValid) {
      console.warn(`[Upload] Rejected unsupported format - ext: "${ext}", mime: "${rawMime}"`);
      return c.json({ error: 'Only PNG, JPG, JPEG, and WEBP image formats are supported' }, 400);
    }

    // Determine canonical Content-Type for Supabase Storage
    let contentType = rawMime;
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.webp') contentType = 'image/webp';
      else contentType = 'image/png';
    }
    if (contentType === 'image/x-png') contentType = 'image/png';
    if (contentType === 'image/pjpeg' || contentType === 'image/jpg') contentType = 'image/jpeg';

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const safeFilename = `artwork_${timestamp}_${randomStr}${ext || '.png'}`;
    const filePath = `campaigns/${campaignId}/artwork/${safeFilename}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    let socialPreviewUrl = null;
    const previewFile = formData.get('socialPreview') || formData.get('preview');
    if (previewFile && typeof previewFile !== 'string' && typeof previewFile.arrayBuffer === 'function') {
      try {
        const previewBuffer = new Uint8Array(await previewFile.arrayBuffer());
        const previewPath = `campaigns/${campaignId}/social-preview/social-preview_${timestamp}.jpg`;
        const { error: pErr } = await supabase.storage.from(BUCKET_NAME).upload(previewPath, previewBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
          upsert: true,
        });
        if (!pErr) {
          const { data: pUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(previewPath);
          socialPreviewUrl = pUrlData.publicUrl;
        }
      } catch (err) {
        console.warn('Failed to upload client socialPreview:', err);
      }
    }

    return c.json({
      success: true,
      url: urlData.publicUrl,
      imageUrl: urlData.publicUrl,
      socialPreviewUrl: socialPreviewUrl || urlData.publicUrl,
      path: filePath,
    });
  } catch (err) {
    console.error('Error uploading artwork:', err);
    return c.json({ error: err.message || 'Failed to upload artwork' }, 500);
  }
});

// -------------------------------------------------------------
// Public Endpoints (Isolated Campaign & Anonymous Tracking)
// -------------------------------------------------------------
app.get('/campaigns/by-slug/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    if (!slug || !slug.trim()) {
      return c.json({ error: 'Campaign slug is required' }, 400);
    }

    const supabase = getSupabase(c);
    const { data: campaign, error } = await supabase
      .from('yogframe_campaigns')
      .select(`
        id,
        name,
        slug,
        district,
        description,
        status,
        campaign_image_url,
        campaign_x,
        campaign_y,
        campaign_width,
        campaign_height,
        campaign_rotation,
        canvas_width,
        canvas_height,
        photo_config:yogframe_campaign_photo_config(
          enabled,
          shape,
          x,
          y,
          width,
          height,
          rotation
        ),
        name_config:yogframe_campaign_name_config(
          enabled,
          x,
          y,
          width,
          height,
          rotation,
          font_family,
          font_size,
          font_color,
          font_weight,
          alignment,
          letter_spacing
        )
      `)
      .eq('slug', slug.trim())
      .maybeSingle();

    if (error) throw error;
    if (!campaign) {
      return c.json({ error: `Campaign "${slug}" not found` }, 404);
    }

    // Status handling: Draft or Archived campaigns are not publicly accessible
    if (campaign.status === 'Draft' || campaign.status === 'Archived') {
      return c.json({ error: `Campaign "${slug}" not found` }, 404);
    }

    // Set Edge CDN and Browser caching headers for active public campaign
    if (campaign.status === 'Active') {
      c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
    } else {
      c.header('Cache-Control', 'no-cache');
    }

    const formatted = {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      district: campaign.district || null,
      description: campaign.description,
      status: campaign.status,
      campaign_image_url: campaign.campaign_image_url,
      campaign_x: campaign.campaign_x,
      campaign_y: campaign.campaign_y,
      campaign_width: campaign.campaign_width,
      campaign_height: campaign.campaign_height,
      campaign_rotation: campaign.campaign_rotation,
      canvas_width: campaign.canvas_width || 1080,
      canvas_height: campaign.canvas_height || 1350,
      photo_config: Array.isArray(campaign.photo_config)
        ? campaign.photo_config[0] || null
        : campaign.photo_config,
      name_config: Array.isArray(campaign.name_config)
        ? campaign.name_config[0] || null
        : campaign.name_config,
    };

    return c.json({ campaign: formatted });
  } catch (err) {
    console.error('Error in public campaign query:', err);
    return c.json({ error: 'Failed to retrieve campaign' }, 500);
  }
});

app.post('/campaigns/:id/generate', async (c) => {
  try {
    const id = c.req.param('id');
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'anon';

    // Edge rate limiting: max 60 generation events per minute per IP
    if (isRateLimited(ip, 60)) {
      return c.json(
        {
          success: true,
          limited: true,
          event: { campaign_id: id, event_type: 'generate' },
        },
        200
      );
    }

    const supabase = getSupabase(c);

    // Non-blocking best-effort insert
    const { data, error } = await supabase
      .from('yogframe_share_events')
      .insert({
        campaign_id: id,
        event_type: 'generate',
      })
      .select('id, campaign_id, event_type, created_at')
      .single();

    if (error) {
      console.warn('Anonymous event logging warning:', error.message);
    }

    return c.json(
      {
        success: true,
        event: data || { campaign_id: id, event_type: 'generate' },
      },
      201
    );
  } catch (err) {
    console.error('Error in anonymous generate event:', err);
    return c.json({ success: true, event: { campaign_id: c.req.param('id'), event_type: 'generate' } }, 200);
  }
});

app.post('/campaigns/:id/share', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { eventType } = body;

    const validEvents = ['download', 'whatsapp', 'facebook', 'instagram', 'link', 'generate'];
    const cleanEvent = (eventType || '').toLowerCase();

    if (!validEvents.includes(cleanEvent)) {
      return c.json({ error: `Invalid event type: ${eventType}` }, 400);
    }

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'anon';
    if (isRateLimited(ip, 60)) {
      return c.json({ success: true, limited: true, event: { campaign_id: id, event_type: cleanEvent } }, 200);
    }

    const supabase = getSupabase(c);
    const { data, error } = await supabase
      .from('yogframe_share_events')
      .insert({
        campaign_id: id,
        event_type: cleanEvent,
      })
      .select('id, campaign_id, event_type, created_at')
      .single();

    if (error) {
      console.warn('Anonymous share event warning:', error.message);
    }

    return c.json({ success: true, event: data || { campaign_id: id, event_type: cleanEvent } });
  } catch (err) {
    console.error('Error logging anonymous share event:', err);
    return c.json({ success: true, event: { campaign_id: c.req.param('id'), event_type: 'share' } }, 200);
  }
});

// Export default Cloudflare Pages Functions request handler
export const onRequest = (context) => {
  return app.fetch(context.request, context.env, context);
};
