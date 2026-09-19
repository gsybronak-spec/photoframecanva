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
    service: 'YogFrame Portal API (Cloudflare Edge)',
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
    const supabase = getSupabase(c);

    // 1. Campaign counts by status
    const { data: campaigns, error: campErr } = await supabase
      .from('yogframe_campaigns')
      .select('id, status');

    if (campErr) throw campErr;

    const activeCount = campaigns.filter((camp) => camp.status === 'Active').length;
    const draftCount = campaigns.filter((camp) => camp.status === 'Draft').length;
    const pausedCount = campaigns.filter((camp) => camp.status === 'Paused').length;
    const archivedCount = campaigns.filter((camp) => camp.status === 'Archived').length;

    // 2. Total frames generated (anonymous count)
    const { count: framesCount, error: frameErr } = await supabase
      .from('yogframe_share_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'generate');

    if (frameErr) throw frameErr;

    // 3. Share events breakdown (non-generate events)
    const { data: shareEvents, error: shareErr } = await supabase
      .from('yogframe_share_events')
      .select('event_type')
      .neq('event_type', 'generate');

    if (shareErr) throw shareErr;

    const totalShares = shareEvents ? shareEvents.length : 0;
    const platformShares = {
      whatsapp: 0,
      facebook: 0,
      instagram: 0,
      link: 0,
      download: 0,
    };

    if (shareEvents) {
      shareEvents.forEach((evt) => {
        const type = (evt.event_type || '').toLowerCase();
        if (platformShares[type] !== undefined) {
          platformShares[type]++;
        } else {
          platformShares.link++;
        }
      });
    }

    return c.json({
      activeCampaigns: activeCount,
      draftCampaigns: draftCount,
      pausedCampaigns: pausedCount,
      archivedCampaigns: archivedCount,
      totalCampaigns: campaigns.length,
      totalFrames: framesCount || 0,
      totalShares,
      downloads: platformShares.download,
      whatsappShares: platformShares.whatsapp,
      facebookShares: platformShares.facebook,
      instagramShares: platformShares.instagram,
      linkShares: platformShares.link,
    });
  } catch (err) {
    console.error('Error fetching admin metrics:', err);
    return c.json({ error: err.message || 'Failed to fetch metrics' }, 500);
  }
});

// -------------------------------------------------------------
// Admin Campaign Management Endpoints
// -------------------------------------------------------------
app.get('/admin/campaigns', requireAdminAuth, async (c) => {
  try {
    const supabase = getSupabase(c);
    const status = c.req.query('status');
    const search = c.req.query('search');

    let query = supabase
      .from('yogframe_campaigns')
      .select(`
        *,
        photo_config:yogframe_campaign_photo_config(*),
        name_config:yogframe_campaign_name_config(*)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    if (search && search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    const { data: campaigns, error } = await query;
    if (error) throw error;

    const campaignIds = campaigns.map((camp) => camp.id);
    let framesMap = {};
    let sharesMap = {};

    if (campaignIds.length > 0) {
      const { data: eventsData } = await supabase
        .from('yogframe_share_events')
        .select('campaign_id, event_type')
        .in('campaign_id', campaignIds);

      if (eventsData) {
        eventsData.forEach((evt) => {
          if (evt.event_type === 'generate') {
            framesMap[evt.campaign_id] = (framesMap[evt.campaign_id] || 0) + 1;
          } else {
            sharesMap[evt.campaign_id] = (sharesMap[evt.campaign_id] || 0) + 1;
          }
        });
      }
    }

    const enrichedCampaigns = campaigns.map((camp) => ({
      ...camp,
      photo_config: Array.isArray(camp.photo_config)
        ? camp.photo_config[0] || null
        : camp.photo_config,
      name_config: Array.isArray(camp.name_config)
        ? camp.name_config[0] || null
        : camp.name_config,
      frames_count: framesMap[camp.id] || 0,
      shares_count: sharesMap[camp.id] || 0,
    }));

    return c.json({ campaigns: enrichedCampaigns });
  } catch (err) {
    console.error('Error fetching campaigns list:', err);
    return c.json({ error: err.message || 'Failed to fetch campaigns' }, 500);
  }
});

app.post('/admin/campaigns', requireAdminAuth, async (c) => {
  try {
    const supabase = getSupabase(c);
    const body = await c.req.json();
    const { name, description, status = 'Draft', campaign_image_url } = body;

    if (!name || !name.trim()) {
      return c.json({ error: 'Campaign name is required' }, 400);
    }

    let baseSlug = slugify(name);
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

    const { data: campaign, error: campErr } = await supabase
      .from('yogframe_campaigns')
      .insert({
        name: name.trim(),
        slug: uniqueSlug,
        description: description ? description.trim() : null,
        status,
        campaign_image_url: campaign_image_url || null,
        campaign_x: 0,
        campaign_y: 0,
        campaign_width: 800,
        campaign_height: 800,
        campaign_rotation: 0,
      })
      .select()
      .single();

    if (campErr) throw campErr;

    const { data: photoConfig, error: photoErr } = await supabase
      .from('yogframe_campaign_photo_config')
      .insert({
        campaign_id: campaign.id,
        enabled: true,
        shape: 'Circle',
        x: 275,
        y: 200,
        width: 250,
        height: 250,
        rotation: 0,
      })
      .select()
      .single();

    if (photoErr) throw photoErr;

    const { data: nameConfig, error: nameErr } = await supabase
      .from('yogframe_campaign_name_config')
      .insert({
        campaign_id: campaign.id,
        enabled: true,
        x: 200,
        y: 480,
        width: 400,
        height: 60,
        rotation: 0,
        font_family: 'Playfair Display',
        font_size: 32,
        font_color: '#1f4a3f',
        font_weight: '700',
        alignment: 'center',
        letter_spacing: 0,
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
    const { campaign, photoConfig, nameConfig } = body;

    if (campaign) {
      const { error: campErr } = await supabase
        .from('yogframe_campaigns')
        .update({
          name: campaign.name,
          slug: campaign.slug,
          description: campaign.description,
          status: campaign.status,
          campaign_image_url: campaign.campaign_image_url,
          campaign_x: campaign.campaign_x,
          campaign_y: campaign.campaign_y,
          campaign_width: campaign.campaign_width,
          campaign_height: campaign.campaign_height,
          campaign_rotation: campaign.campaign_rotation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (campErr) throw campErr;
    }

    if (photoConfig) {
      const { error: photoErr } = await supabase
        .from('yogframe_campaign_photo_config')
        .upsert(
          {
            campaign_id: id,
            enabled: photoConfig.enabled !== false,
            shape: photoConfig.shape || 'Circle',
            x: photoConfig.x ?? 275,
            y: photoConfig.y ?? 200,
            width: photoConfig.width ?? 250,
            height: photoConfig.height ?? 250,
            rotation: photoConfig.rotation ?? 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'campaign_id' }
        );

      if (photoErr) throw photoErr;
    }

    if (nameConfig) {
      const { error: nameErr } = await supabase
        .from('yogframe_campaign_name_config')
        .upsert(
          {
            campaign_id: id,
            enabled: nameConfig.enabled !== false,
            x: nameConfig.x ?? 200,
            y: nameConfig.y ?? 480,
            width: nameConfig.width ?? 400,
            height: nameConfig.height ?? 60,
            rotation: nameConfig.rotation ?? 0,
            font_family: nameConfig.font_family || 'Playfair Display',
            font_size: nameConfig.font_size ?? 32,
            font_color: nameConfig.font_color || '#1f4a3f',
            font_weight: nameConfig.font_weight || '700',
            alignment: nameConfig.alignment || 'center',
            letter_spacing: nameConfig.letter_spacing ?? 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'campaign_id' }
        );

      if (nameErr) throw nameErr;
    }

    return c.json({ success: true, message: 'Campaign composition saved successfully' });
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
    const file = formData.get('artwork');
    const campaignId = formData.get('campaignId') || 'general';

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No artwork file provided' }, 400);
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return c.json({ error: 'Only PNG, JPG, JPEG, and WEBP image formats are supported' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const ext = file.name ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '.png';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const safeFilename = `artwork_${timestamp}_${randomStr}${ext}`;
    const filePath = `campaigns/${campaignId}/artwork/${safeFilename}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return c.json({
      success: true,
      imageUrl: urlData.publicUrl,
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
        description,
        status,
        campaign_image_url,
        campaign_x,
        campaign_y,
        campaign_width,
        campaign_height,
        campaign_rotation,
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

    const formatted = {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description,
      status: campaign.status,
      campaign_image_url: campaign.campaign_image_url,
      campaign_x: campaign.campaign_x,
      campaign_y: campaign.campaign_y,
      campaign_width: campaign.campaign_width,
      campaign_height: campaign.campaign_height,
      campaign_rotation: campaign.campaign_rotation,
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
    const supabase = getSupabase(c);

    const { data: campaign, error: campErr } = await supabase
      .from('yogframe_campaigns')
      .select('id')
      .eq('id', id)
      .single();

    if (campErr || !campaign) {
      return c.json({ error: 'Campaign not found' }, 404);
    }

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
    return c.json({ error: 'Failed to record event' }, 500);
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

    const supabase = getSupabase(c);
    const { data, error } = await supabase
      .from('yogframe_share_events')
      .insert({
        campaign_id: id,
        event_type: cleanEvent,
      })
      .select('id, campaign_id, event_type, created_at')
      .single();

    if (error) throw error;

    return c.json({ success: true, event: data });
  } catch (err) {
    console.error('Error logging anonymous share event:', err);
    return c.json({ error: err.message || 'Failed to log share event' }, 500);
  }
});

// Export default Cloudflare Pages Functions request handler
export const onRequest = (context) => {
  return app.fetch(context.request, context.env, context);
};
