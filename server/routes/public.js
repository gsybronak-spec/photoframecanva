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

export default router;
