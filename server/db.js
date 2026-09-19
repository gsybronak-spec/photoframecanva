import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('FATAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in environment variables!');
}

// Server-side Supabase client with service role key - NEVER expose to browser
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const BUCKET_NAME = 'yogframe-campaign-media';

/**
 * Verifies Supabase connection and ensures bucket exists
 */
export async function verifyConnection() {
  try {
    const { data, error } = await supabase
      .from('yogframe_campaigns')
      .select('id')
      .limit(1);

    if (error) {
      console.warn('Database check warning:', error.message);
    } else {
      console.log('Connected to Supabase PostgreSQL database successfully.');
    }

    // Check bucket existence
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (!bucketError) {
      const exists = buckets.some(b => b.id === BUCKET_NAME || b.name === BUCKET_NAME);
      if (!exists) {
        await supabase.storage.createBucket(BUCKET_NAME, { public: true });
        console.log(`Created public bucket "${BUCKET_NAME}".`);
      } else {
        console.log(`Storage bucket "${BUCKET_NAME}" is ready.`);
      }
    }
  } catch (err) {
    console.error('Error during Supabase verification:', err);
  }
}
