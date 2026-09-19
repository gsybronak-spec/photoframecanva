import multer from 'multer';
import path from 'path';
import { supabase, BUCKET_NAME } from './db.js';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      return cb(new Error('Only PNG, JPG, JPEG, and WEBP image formats are supported'));
    }
    cb(null, true);
  },
});

export async function uploadArtworkToStorage(fileBuffer, originalname, mimetype, campaignId = 'general') {
  const ext = path.extname(originalname).toLowerCase() || '.png';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const safeFilename = `artwork_${timestamp}_${randomStr}${ext}`;
  const filePath = `campaigns/${campaignId}/artwork/${safeFilename}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: mimetype,
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload to Supabase storage: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    path: filePath,
    publicUrl: urlData.publicUrl,
  };
}
