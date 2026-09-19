import express from 'express';
import { supabase, BUCKET_NAME } from '../db.js';

const router = express.Router();

/**
 * Public Campaign Endpoint (Requirement 17 & 18)
 * Strictly isolated: queries ONLY the single campaign matching the slug.
 * Does NOT return or expose any other campaign records.
 */
router.get('/by-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug || !slug.trim()) {
      return res.status(400).json({ error: 'Campaign slug is required' });
    }

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

    if (error) {
      throw error;
    }

    if (!campaign) {
      return res.status(404).json({ error: `Campaign "${slug}" not found` });
    }

    // Isolate & format response
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

    return res.json({ campaign: formatted });
  } catch (err) {
    console.error('Error in public campaign query:', err);
    return res.status(500).json({ error: 'Failed to retrieve campaign' });
  }
});

/**
 * Save Generated Frame Endpoint
 * Uploads high-res generated frame PNG to Supabase Storage and records in yogframe_generated_frames
 */
router.post('/:id/generate', async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, imageData, sourcePhotoUrl } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Missing generated image data' });
    }

    // Verify campaign exists
    const { data: campaign, error: campErr } = await supabase
      .from('yogframe_campaigns')
      .select('id, name')
      .eq('id', id)
      .single();

    if (campErr || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Convert base64 data to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const filename = `frame_${timestamp}_${randomStr}.png`;
    const storagePath = `campaigns/${id}/generated/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const generatedImageUrl = urlData.publicUrl;

    // Save record in yogframe_generated_frames
    const { data: frameRecord, error: dbError } = await supabase
      .from('yogframe_generated_frames')
      .insert({
        campaign_id: id,
        user_name: (userName || 'Anonymous').trim(),
        source_photo_url: sourcePhotoUrl || null,
        generated_image_url: generatedImageUrl,
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    return res.status(201).json({
      success: true,
      frame: frameRecord,
      imageUrl: generatedImageUrl,
    });
  } catch (err) {
    console.error('Error generating frame record:', err);
    return res.status(500).json({ error: err.message || 'Failed to save generated frame' });
  }
});

/**
 * Record Share & Download Events
 * Inserts real event records into yogframe_share_events
 */
router.post('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const { eventType, frameId, metadata } = req.body;

    const validEvents = ['download', 'whatsapp', 'facebook', 'instagram', 'link'];
    const cleanEvent = (eventType || '').toLowerCase();

    if (!validEvents.includes(cleanEvent)) {
      return res.status(400).json({ error: `Invalid event type: ${eventType}` });
    }

    const { data, error } = await supabase
      .from('yogframe_share_events')
      .insert({
        campaign_id: id,
        generated_frame_id: frameId || null,
        event_type: cleanEvent,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json({ success: true, event: data });
  } catch (err) {
    console.error('Error logging share event:', err);
    return res.status(500).json({ error: err.message || 'Failed to log share event' });
  }
});

export default router;
