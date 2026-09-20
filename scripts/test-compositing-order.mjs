import sharp from 'sharp';

async function testCompositing() {
  console.log('--- Testing Layer Compositing Order with Sharp ---');

  // 1. Create a 200x200 User Photo: Solid BLUE (0, 0, 255)
  const userPhoto = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 4,
      background: { r: 0, g: 0, b: 255, alpha: 1 }
    }
  }).png().toBuffer();

  // 2. Create a 200x200 Frame PNG with a RED border (255, 0, 0) and TRANSPARENT center
  // Generate raw RGBA buffer: outer border is red (255,0,0,255), center 100x100 is transparent (0,0,0,0)
  const frameBuffer = Buffer.alloc(200 * 200 * 4);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 200; x++) {
      const idx = (y * 200 + x) * 4;
      if (x >= 50 && x < 150 && y >= 50 && y < 150) {
        // Transparent center
        frameBuffer[idx] = 0;
        frameBuffer[idx + 1] = 0;
        frameBuffer[idx + 2] = 0;
        frameBuffer[idx + 3] = 0;
      } else {
        // Red frame border
        frameBuffer[idx] = 255;
        frameBuffer[idx + 1] = 0;
        frameBuffer[idx + 2] = 0;
        frameBuffer[idx + 3] = 255;
      }
    }
  }

  const frameArtwork = await sharp(frameBuffer, {
    raw: { width: 200, height: 200, channels: 4 }
  }).png().toBuffer();

  // 3. Composite with NEW order: USER PHOTO on bottom, FRAME on TOP
  const finalImage = await sharp(userPhoto)
    .composite([
      {
        input: frameArtwork,
        top: 0,
        left: 0,
        blend: 'over'
      }
    ])
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data } = finalImage;

  // Sample pixel at (10, 10) - This is the FRAME BORDER
  // Expected: RED (255, 0, 0), NOT Blue
  const borderIdx = (10 * 200 + 10) * 4;
  const borderR = data[borderIdx];
  const borderG = data[borderIdx + 1];
  const borderB = data[borderIdx + 2];
  const borderA = data[borderIdx + 3];
  console.log(`Border pixel (10,10): R=${borderR}, G=${borderG}, B=${borderB}, A=${borderA}`);

  // Sample pixel at (100, 100) - This is the TRANSPARENT CENTER
  // Expected: BLUE (0, 0, 255), showing through the transparent window
  const centerIdx = (100 * 200 + 100) * 4;
  const centerR = data[centerIdx];
  const centerG = data[centerIdx + 1];
  const centerB = data[centerIdx + 2];
  const centerA = data[centerIdx + 3];
  console.log(`Center pixel (100,100): R=${centerR}, G=${centerG}, B=${centerB}, A=${centerA}`);

  if (borderR === 255 && borderB === 0 && centerB === 255 && centerR === 0) {
    console.log('✓ PASS: Frame decorations remain on top of user photo, transparent window reveals user photo underneath!');
  } else {
    console.error('✗ FAIL: Layer compositing order incorrect.');
    process.exit(1);
  }
}

testCompositing().catch(err => {
  console.error(err);
  process.exit(1);
});
