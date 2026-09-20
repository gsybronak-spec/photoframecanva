import express from 'express';
import { supabase } from '../db.js';
import { authenticateAdmin, requireAdminAuth } from '../auth.js';
import { uploadMiddleware, uploadArtworkToStorage } from '../storage.js';

const router = express.Router();

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

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
router.post('/login', (req, res) => {
  const { password } = req.body;
  const result = authenticateAdmin(password);
  if (!result.success) {
    return res.status(401).json({ error: result.message });
  }

  // Set HTTP-only cookie for convenience
  res.cookie('yogframe_admin_token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({ success: true, token: result.token });
});

router.post('/logout', (req, res) => {
  res.clearCookie('yogframe_admin_token');
  return res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', requireAdminAuth, (req, res) => {
  return res.json({ authenticated: true, user: req.adminUser });
});

// -------------------------------------------------------------
// Metrics Endpoint (Requirement 21)
// -------------------------------------------------------------
router.get('/metrics', requireAdminAuth, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    const [{ data: overall, error: overallErr }, { data: campaignMetrics, error: campErr }] =
      await Promise.all([
        supabase.rpc('get_admin_overall_metrics'),
        supabase.rpc('get_admin_campaign_analytics'),
      ]);

    if (overallErr) throw overallErr;
    if (campErr) throw campErr;

    return res.json({
      ...overall,
      campaigns: campaignMetrics || [],
    });
  } catch (err) {
    console.error('Error fetching admin metrics:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch metrics' });
  }
});

// -------------------------------------------------------------
// Campaign Management Endpoints (Requirement 16, 17, 19)
// -------------------------------------------------------------
router.get('/campaigns', requireAdminAuth, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const { status, district, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '25', 10)));
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
    const campaignIds = campaignList.map(c => c.id);
    let campMetricsMap = {};

    if (campaignIds.length > 0) {
      const { data: cMetrics } = await supabase.rpc('get_admin_campaign_analytics');
      if (cMetrics) {
        cMetrics.forEach(cm => {
          campMetricsMap[cm.id] = cm;
        });
      }
    }

    const enriched = campaignList.map(c => {
      const cm = campMetricsMap[c.id] || {};
      return {
        ...c,
        photo_config: Array.isArray(c.photo_config) ? c.photo_config[0] || null : c.photo_config,
        name_config: Array.isArray(c.name_config) ? c.name_config[0] || null : c.name_config,
        frames_count: Number(cm.generated_count || 0),
        downloads_count: Number(cm.downloads_count || 0),
        shares_count: Number(cm.shares_count || 0),
        whatsapp_count: Number(cm.whatsapp_count || 0),
        facebook_count: Number(cm.facebook_count || 0),
        instagram_count: Number(cm.instagram_count || 0),
        link_count: Number(cm.link_count || 0),
      };
    });

    const total = count != null ? count : enriched.length;
    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({
      campaigns: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('Error listing campaigns:', err);
    return res.status(500).json({ error: err.message || 'Failed to list campaigns' });
  }
});

router.post('/campaigns', requireAdminAuth, async (req, res) => {
  try {
    let { name, slug, district, description, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Campaign name is required' });
    }

    if (!slug || !slug.trim()) {
      slug = slugify(name);
    } else {
      slug = slugify(slug);
    }

    // Ensure slug uniqueness
    let finalSlug = slug;
    let counter = 1;
    while (true) {
      const { data: existing } = await supabase
        .from('yogframe_campaigns')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();

      if (!existing) break;
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const insertData = {
      name: name.trim(),
      slug: finalSlug,
      district: district && district.trim() ? district.trim() : null,
      description: description?.trim() || '',
      status: status || 'Draft',
      campaign_image_url: req.body.campaign_image_url || '',
      social_preview_image_url: req.body.social_preview_image_url || null,
      campaign_x: Number(req.body.campaign_x) || 0,
      campaign_y: Number(req.body.campaign_y) || 0,
      campaign_width: Number(req.body.campaign_width) || 100,
      campaign_height: Number(req.body.campaign_height) || 100,
      campaign_rotation: Number(req.body.campaign_rotation) || 0,
      canvas_width: Number(req.body.canvas_width) || 1080,
      canvas_height: Number(req.body.canvas_height) || 1350,
    };

    if (status === 'Active') {
      insertData.activated_at = new Date().toISOString();
    }

    const { data: campaign, error } = await supabase
      .from('yogframe_campaigns')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    // Create default config records (disabled by default)
    await supabase.from('yogframe_campaign_photo_config').insert({
      campaign_id: campaign.id,
      enabled: false,
      shape: 'Square',
      x: 32,
      y: 42,
      width: 35,
      height: 28,
      rotation: 0,
    });

    await supabase.from('yogframe_campaign_name_config').insert({
      campaign_id: campaign.id,
      enabled: false,
      x: 18,
      y: 78,
      width: 64,
      height: 10,
      rotation: 0,
      font_family: 'DM Sans',
      font_size: 26,
      font_color: '#fff8e9',
      font_weight: 'bold',
      alignment: 'center',
      letter_spacing: 1,
    });

    return res.status(201).json({ campaign });
  } catch (err) {
    console.error('Error creating campaign:', err);
    return res.status(500).json({ error: err.message || 'Failed to create campaign' });
  }
});

router.get('/campaigns/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

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
      return res.status(404).json({ error: 'Campaign not found' });
    }

    return res.json({
      campaign: {
        ...campaign,
        photo_config: Array.isArray(campaign.photo_config) ? campaign.photo_config[0] || null : campaign.photo_config,
        name_config: Array.isArray(campaign.name_config) ? campaign.name_config[0] || null : campaign.name_config,
      },
    });
  } catch (err) {
    console.error('Error fetching campaign:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch campaign' });
  }
});

router.put('/campaigns/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
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
      photo_config,
      name_config,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Campaign name is required' });
    }

    let finalSlug = slugify(slug || name);

    // Validate slug uniqueness against other campaigns
    const { data: slugCheck } = await supabase
      .from('yogframe_campaigns')
      .select('id')
      .eq('slug', finalSlug)
      .neq('id', id)
      .maybeSingle();

    if (slugCheck) {
      return res.status(400).json({ error: `Slug "${finalSlug}" is already taken by another campaign.` });
    }

    // Build update object
    const updateData = {
      name: name.trim(),
      slug: finalSlug,
      description: description !== undefined ? description : '',
      status: status || 'Draft',
      campaign_image_url: campaign_image_url || '',
      campaign_x: Number(campaign_x) || 0,
      campaign_y: Number(campaign_y) || 0,
      campaign_width: Number(campaign_width) || 100,
      campaign_height: Number(campaign_height) || 100,
      campaign_rotation: Number(campaign_rotation) || 0,
      canvas_width: Number(req.body.canvas_width) || 1080,
      canvas_height: Number(req.body.canvas_height) || 1350,
      updated_at: new Date().toISOString(),
    };

    if (district !== undefined) {
      updateData.district = district && district.trim() ? district.trim() : null;
    }

    if (req.body.social_preview_image_url !== undefined) {
      updateData.social_preview_image_url = req.body.social_preview_image_url || null;
    }

    if (status === 'Active') {
      const { data: current } = await supabase
        .from('yogframe_campaigns')
        .select('activated_at')
        .eq('id', id)
        .single();
      if (!current?.activated_at) {
        updateData.activated_at = new Date().toISOString();
      }
    }

    const { data: updatedCampaign, error: campErr } = await supabase
      .from('yogframe_campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (campErr) throw campErr;

    // Upsert Photo Config
    if (photo_config) {
      const photoData = {
        campaign_id: id,
        enabled: Boolean(photo_config.enabled),
        shape: photo_config.shape || 'Square',
        x: Number(photo_config.x) ?? 32,
        y: Number(photo_config.y) ?? 42,
        width: Number(photo_config.width) ?? 35,
        height: Number(photo_config.height) ?? 28,
        rotation: Number(photo_config.rotation) ?? 0,
        updated_at: new Date().toISOString(),
      };

      const { error: pErr } = await supabase
        .from('yogframe_campaign_photo_config')
        .upsert(photoData, { onConflict: 'campaign_id' });

      if (pErr) console.warn('Photo config update warning:', pErr.message);
    }

    // Upsert Name Config
    if (name_config) {
      const nameData = {
        campaign_id: id,
        enabled: Boolean(name_config.enabled),
        x: Number(name_config.x) ?? 18,
        y: Number(name_config.y) ?? 78,
        width: Number(name_config.width) ?? 64,
        height: Number(name_config.height) ?? 10,
        rotation: Number(name_config.rotation) ?? 0,
        font_family: name_config.font_family || 'DM Sans',
        font_size: Number(name_config.font_size) || 26,
        font_color: name_config.font_color || '#fff8e9',
        font_weight: name_config.font_weight || 'bold',
        alignment: name_config.alignment || 'center',
        letter_spacing: name_config.letter_spacing != null ? Number(name_config.letter_spacing) : 1,
        updated_at: new Date().toISOString(),
      };

      const { error: nErr } = await supabase
        .from('yogframe_campaign_name_config')
        .upsert(nameData, { onConflict: 'campaign_id' });

      if (nErr) console.warn('Name config update warning:', nErr.message);
    }

    return res.json({ success: true, campaign: updatedCampaign });
  } catch (err) {
    console.error('Error saving campaign:', err);
    return res.status(500).json({ error: err.message || 'Failed to save campaign' });
  }
});

router.patch('/campaigns/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Draft', 'Active', 'Paused', 'Archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'Active') {
      const { data: current } = await supabase
        .from('yogframe_campaigns')
        .select('activated_at')
        .eq('id', id)
        .single();
      if (!current?.activated_at) {
        updateData.activated_at = new Date().toISOString();
      }
    }

    const { data: campaign, error } = await supabase
      .from('yogframe_campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, campaign });
  } catch (err) {
    console.error('Error updating campaign status:', err);
    return res.status(500).json({ error: err.message || 'Failed to update campaign status' });
  }
});

router.delete('/campaigns/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('yogframe_campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (err) {
    console.error('Error deleting campaign:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete campaign' });
  }
});

// -------------------------------------------------------------
// Image Upload Endpoint (Requirement 22)
// -------------------------------------------------------------
router.post('/upload', requireAdminAuth, uploadMiddleware.fields([{ name: 'artwork', maxCount: 1 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
  try {
    const file = req.files?.['artwork']?.[0] || req.files?.['image']?.[0] || req.file;
    if (!file) {
      return res.status(400).json({ error: 'No artwork file provided' });
    }

    const campaignId = req.body.campaignId || 'general';
    const uploadResult = await uploadArtworkToStorage(
      file.buffer,
      file.originalname,
      file.mimetype,
      campaignId
    );

    return res.json({
      success: true,
      url: uploadResult.publicUrl,
      imageUrl: uploadResult.publicUrl,
      socialPreviewUrl: uploadResult.socialPreviewUrl,
      path: uploadResult.path,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Image upload failed' });
  }
});

export default router;
