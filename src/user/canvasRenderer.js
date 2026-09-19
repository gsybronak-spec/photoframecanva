/**
 * High-Resolution Canvas Compositor for Final YogFrame Generation
 * Combines Layer 1 (Admin Artwork), Layer 2 (User Photo with Mask), Layer 3 (User Name with Typography)
 */

const imagePromiseCache = new Map();

export function loadImage(src, isArtwork = false) {
  if (!src) {
    const errorMsg = isArtwork
      ? 'Campaign artwork could not be loaded. Please refresh and try again.'
      : 'User photo could not be loaded. Please select a photo again.';
    return Promise.reject(new Error(errorMsg));
  }

  // Reuse existing promise for artwork URL to prevent duplicate network loads
  if (isArtwork && imagePromiseCache.has(src)) {
    return imagePromiseCache.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const handleError = () => {
      if (isArtwork) imagePromiseCache.delete(src);
      const errorMsg = isArtwork
        ? 'Campaign artwork could not be loaded. Please refresh and try again.'
        : 'User photo could not be loaded. Please select a photo again.';
      reject(new Error(errorMsg));
    };

    img.onload = async () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        return handleError();
      }
      if (typeof img.decode === 'function') {
        try {
          await img.decode();
        } catch (err) {
          // Decode failed or unsupported, image is still valid from onload
        }
      }
      resolve(img);
    };

    img.onerror = handleError;
    img.src = src;
  });

  if (isArtwork) {
    imagePromiseCache.set(src, promise);
  }

  return promise;
}

export async function compositeFinalYogFrame({
  campaign,
  photoConfig,
  nameConfig,
  userName,
  userPhotoUrl,
  photoPan = { x: 0, y: 0 },
  photoZoom = 1,
}) {
  // Load artwork image
  const artworkImg = await loadImage(campaign.campaign_image_url, true);

  // Target output canvas dimensions directly from campaign configuration
  const targetWidth = Number(campaign.canvas_width) || 1080;
  const targetHeight = Number(campaign.canvas_height) || 1350;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = '#faf6ed';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // -----------------------------------------------------------------
  // LAYER 1: Admin Campaign Artwork (Respecting Geometry & Rotation)
  // -----------------------------------------------------------------
  const campW = (targetWidth * (campaign.campaign_width ?? 100)) / 100;
  const campH = (targetHeight * (campaign.campaign_height ?? 100)) / 100;
  const campX = (targetWidth * (campaign.campaign_x ?? 0)) / 100;
  const campY = (targetHeight * (campaign.campaign_y ?? 0)) / 100;
  const campRot = ((campaign.campaign_rotation ?? 0) * Math.PI) / 180;

  ctx.save();
  ctx.translate(campX + campW / 2, campY + campH / 2);
  if (campRot !== 0) ctx.rotate(campRot);
  ctx.drawImage(artworkImg, -campW / 2, -campH / 2, campW, campH);
  ctx.restore();

  // -----------------------------------------------------------------
  // LAYER 2: User Photo Mask & Adjustment (Respecting Photo Geometry)
  // -----------------------------------------------------------------
  if (photoConfig?.enabled && userPhotoUrl) {
    const userImg = await loadImage(userPhotoUrl, false);

    const pw = (targetWidth * (photoConfig.width ?? 35)) / 100;
    const ph = (targetHeight * (photoConfig.height ?? 28)) / 100;
    const px = (targetWidth * (photoConfig.x ?? 32)) / 100;
    const py = (targetHeight * (photoConfig.y ?? 42)) / 100;
    const photoRot = ((photoConfig.rotation ?? 0) * Math.PI) / 180;

    ctx.save();
    // Move to center of Photo Area
    ctx.translate(px + pw / 2, py + ph / 2);
    if (photoRot !== 0) ctx.rotate(photoRot);

    // Apply Clipping Mask according to shape
    ctx.beginPath();
    if (photoConfig.shape === 'Circle') {
      const radius = Math.min(pw, ph) / 2;
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
    } else {
      // Rounded Square / Rectangle
      const radius = Math.min(18 * (targetWidth / 450), Math.min(pw, ph) / 6);
      if (ctx.roundRect) {
        ctx.roundRect(-pw / 2, -ph / 2, pw, ph, radius);
      } else {
        ctx.rect(-pw / 2, -ph / 2, pw, ph);
      }
    }
    ctx.clip();

    // Calculate user photo scale inside the mask
    // Base cover size
    const imgRatio = userImg.naturalWidth / userImg.naturalHeight;
    const maskRatio = pw / ph;
    let drawW, drawH;

    if (imgRatio > maskRatio) {
      drawH = ph;
      drawW = ph * imgRatio;
    } else {
      drawW = pw;
      drawH = pw / imgRatio;
    }

    // Apply user zoom and pan
    drawW *= photoZoom;
    drawH *= photoZoom;

    // Convert normalized pan (-50 to +50% of mask) to canvas pixels
    const panPxX = (photoPan.x / 100) * pw;
    const panPxY = (photoPan.y / 100) * ph;

    ctx.drawImage(
      userImg,
      -drawW / 2 + panPxX,
      -drawH / 2 + panPxY,
      drawW,
      drawH
    );

    ctx.restore();
  }

  // -----------------------------------------------------------------
  // LAYER 3: User Name Overlay (Respecting Exact Typography & Rotation)
  // -----------------------------------------------------------------
  if (nameConfig?.enabled && userName) {
    const nw = (targetWidth * (nameConfig.width ?? 64)) / 100;
    const nh = (targetHeight * (nameConfig.height ?? 10)) / 100;
    const nx = (targetWidth * (nameConfig.x ?? 18)) / 100;
    const ny = (targetHeight * (nameConfig.y ?? 78)) / 100;
    const nameRot = ((nameConfig.rotation ?? 0) * Math.PI) / 180;

    // Scale font size proportionally from reference stage (450px) to high-res canvas
    const fontScale = targetWidth / 450;
    const baseFontSize = Number(nameConfig.font_size) || 26;
    const scaledFontSize = Math.round(baseFontSize * fontScale);
    const fontFamily = nameConfig.font_family || 'DM Sans';
    const fontWeight = nameConfig.font_weight === 'bold' ? 'bold' : 'normal';

    ctx.save();
    ctx.translate(nx + nw / 2, ny + nh / 2);
    if (nameRot !== 0) ctx.rotate(nameRot);

    ctx.font = `${fontWeight} ${scaledFontSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = nameConfig.font_color || '#fff8e9';
    ctx.textBaseline = 'middle';

    // Shadow for legibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 8 * fontScale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2 * fontScale;

    // Alignment
    let textX = 0;
    if (nameConfig.alignment === 'left') {
      ctx.textAlign = 'left';
      textX = -nw / 2 + 10 * fontScale;
    } else if (nameConfig.alignment === 'right') {
      ctx.textAlign = 'right';
      textX = nw / 2 - 10 * fontScale;
    } else {
      ctx.textAlign = 'center';
      textX = 0;
    }

    // Letter spacing if supported
    if (ctx.letterSpacing !== undefined) {
      ctx.letterSpacing = `${(nameConfig.letter_spacing ?? 1) * fontScale}px`;
    }

    ctx.fillText(userName.trim(), textX, 0);
    ctx.restore();
  }

  // Convert to high-quality PNG data URL
  return canvas.toDataURL('image/png');
}
