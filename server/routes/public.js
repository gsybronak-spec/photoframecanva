import express from 'express';
import { supabase } from '../db.js';

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
      canvas_width: campaign.canvas_width || 1080,
      canvas_height: campaign.canvas_height || 1350,
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
 * Anonymous Frame Generation Counter Endpoint (Zero User Data Stored)
 * Records only an anonymous aggregate event in yogframe_share_events (event_type: 'generate').
 * Does NOT upload user images to storage.
 * Does NOT store user names or personal photos.
 */
router.post('/:id/generate', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify campaign exists
    const { data: campaign, error: campErr } = await supabase
      .from('yogframe_campaigns')
      .select('id')
      .eq('id', id)
      .single();

    if (campErr || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Record anonymous generation event (Zero Personal Data)
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

    return res.status(201).json({
      success: true,
      event: data || { campaign_id: id, event_type: 'generate' },
    });
  } catch (err) {
    console.error('Error in anonymous generate event:', err);
    return res.status(500).json({ error: 'Failed to record event' });
  }
});

/**
 * Anonymous Share & Download Events
 * Records only anonymous event_type + campaign_id in yogframe_share_events.
 * Zero personal identity, zero user image URLs, zero IP addresses stored.
 */
router.post('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const { eventType } = req.body;

    const validEvents = ['download', 'whatsapp', 'facebook', 'instagram', 'link', 'generate'];
    const cleanEvent = (eventType || '').toLowerCase();

    if (!validEvents.includes(cleanEvent)) {
      return res.status(400).json({ error: `Invalid event type: ${eventType}` });
    }

    const { data, error } = await supabase
      .from('yogframe_share_events')
      .insert({
        campaign_id: id,
        event_type: cleanEvent,
      })
      .select('id, campaign_id, event_type, created_at')
      .single();

    if (error) {
      throw error;
    }

    return res.json({ success: true, event: data });
  } catch (err) {
    console.error('Error logging anonymous share event:', err);
    return res.status(500).json({ error: err.message || 'Failed to log share event' });
  }
});

export default router;
