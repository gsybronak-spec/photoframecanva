import sharp from 'sharp';
import { supabase, BUCKET_NAME } from '../server/db.js';

async function processCampaigns() {
  console.log('Fetching campaigns from database...');
  const { data: campaigns, error } = await supabase
    .from('yogframe_campaigns')
    .select('id, name, slug, campaign_image_url, social_preview_image_url');

  if (error) {
    console.error('Failed to fetch campaigns:', error);
    process.exit(1);
  }

  console.log(`Found ${campaigns.length} campaigns to check.`);

  for (const campaign of campaigns) {
    console.log(`\n-----------------------------------------`);
    console.log(`Processing campaign: "${campaign.name}" (${campaign.slug}) [${campaign.id}]`);
    
    if (!campaign.campaign_image_url) {
      console.log('No campaign_image_url set. Skipping.');
      continue;
    }

    console.log(`Original artwork URL: ${campaign.campaign_image_url}`);

    try {
      const response = await fetch(campaign.campaign_image_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch original image: ${response.status} ${response.statusText}`);
      }

      const originalBuffer = Buffer.from(await response.arrayBuffer());
      const originalSizeKb = (originalBuffer.length / 1024).toFixed(2);
      console.log(`Downloaded original image: ${originalSizeKb} KB (${originalBuffer.length} bytes)`);

      // Optimize image for WhatsApp and social link crawlers
      // 1080x1080 max, JPEG quality 80, white background flatten for transparency, mozjpeg compression
      const previewBuffer = await sharp(originalBuffer)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .resize(1080, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 80,
          mozjpeg: true,
        })
        .toBuffer();

      const previewSizeKb = (previewBuffer.length / 1024).toFixed(2);
      console.log(`Optimized social preview JPEG: ${previewSizeKb} KB (${previewBuffer.length} bytes)`);

      if (previewBuffer.length > 300 * 1024) {
        console.warn(`WARNING: Preview size is ${previewSizeKb} KB, which exceeds WhatsApp 300KB budget!`);
      } else {
        console.log(`✓ Size is strictly within WhatsApp limit (< 300 KB)`);
      }

      const timestamp = Date.now();
      const previewFilePath = `campaigns/${campaign.id}/social-preview/social-preview_${timestamp}.jpg`;

      console.log(`Uploading to Supabase Storage: ${previewFilePath}...`);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(previewFilePath, previewBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '31536000', // 1 year immutable cache since timestamped
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(previewFilePath);

      const socialPreviewUrl = urlData.publicUrl;
      console.log(`Social preview public URL: ${socialPreviewUrl}`);

      // Update database
      const { error: dbError } = await supabase
        .from('yogframe_campaigns')
        .update({
          social_preview_image_url: socialPreviewUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaign.id);

      if (dbError) {
        throw new Error(`Database update failed: ${dbError.message}`);
      }

      console.log(`✓ Successfully updated campaign with social_preview_image_url!`);
    } catch (err) {
      console.error(`Error processing campaign ${campaign.slug}:`, err);
    }
  }

  console.log('\nAll campaigns processed successfully!');
}

processCampaigns().then(() => {
  setTimeout(() => process.exit(0), 500);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
