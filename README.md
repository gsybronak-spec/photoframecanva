# YogFrame Portal — Admin Studio

A production-ready Campaign Studio and Management Portal for YogFrame. The platform enables administrators to manage 20+ active campaigns simultaneously, upload custom campaign artwork as the base layer, directly drag, resize, stretch (horizontally/vertically), and rotate artwork, configure dynamic Photo and Name areas, preview compositions, save full configurations to a Supabase PostgreSQL database, and track live campaign analytics.

---

## Visual & Interaction Model

Built to match the provided Canva visual reference:
- **Palette**: Forest Green (`#1f4a3f`, `#17362f`), Cream (`#faf6ed`), Sage (`#79987e`), Sand (`#e7d6bb`), Saffron (`#db9b35`), Clay (`#be6c45`), Line (`#e8dfcf`).
- **Typography**: `DM Sans`, `Playfair Display`, `Space Mono`.
- **Hero Surface**: Deep forest green gradient with subtle grain texture and gold brand badges.
- **Direct Manipulation Editor**: 8-handle transformation (`nw`, `n`, `ne`, `w`, `e`, `sw`, `s`, `se`) + drag body, free non-locked aspect-ratio stretching, rotation slider, two-way synchronized numeric controls.
- **Product Principle**: No predefined frames or sample templates. Uploaded artwork is the base layer. Photo Area and Name Area are created strictly on demand.

---

## Database Architecture (`yogframe_` schema prefix)

The database runs on Supabase PostgreSQL with dedicated tables:

### 1. `yogframe_campaigns`
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `slug` (TEXT, Unique)
- `description` (TEXT)
- `status` (`Draft`, `Active`, `Paused`, `Archived`)
- `campaign_image_url` (TEXT)
- `campaign_x` (DOUBLE PRECISION)
- `campaign_y` (DOUBLE PRECISION)
- `campaign_width` (DOUBLE PRECISION)
- `campaign_height` (DOUBLE PRECISION)
- `campaign_rotation` (DOUBLE PRECISION)
- `created_at`, `updated_at`, `activated_at` (TIMESTAMPTZ)

### 2. `yogframe_campaign_photo_config`
- `id` (UUID, Primary Key)
- `campaign_id` (UUID, Foreign Key → `yogframe_campaigns.id`)
- `enabled` (BOOLEAN)
- `shape` (`Circle`, `Square`)
- `x`, `y`, `width`, `height`, `rotation` (DOUBLE PRECISION)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3. `yogframe_campaign_name_config`
- `id` (UUID, Primary Key)
- `campaign_id` (UUID, Foreign Key → `yogframe_campaigns.id`)
- `enabled` (BOOLEAN)
- `x`, `y`, `width`, `height`, `rotation` (DOUBLE PRECISION)
- `font_family`, `font_color`, `font_weight`, `alignment` (TEXT)
- `font_size`, `letter_spacing` (DOUBLE PRECISION)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 4. `yogframe_generated_frames`
- `id` (UUID, Primary Key)
- `campaign_id` (UUID, Foreign Key → `yogframe_campaigns.id`)
- `user_name`, `source_photo_url`, `generated_image_url` (TEXT)
- `created_at` (TIMESTAMPTZ)

### 5. `yogframe_share_events`
- `id` (UUID, Primary Key)
- `campaign_id` (UUID, Foreign Key → `yogframe_campaigns.id`)
- `generated_frame_id` (UUID, Foreign Key → `yogframe_generated_frames.id`)
- `event_type` (`whatsapp`, `facebook`, `instagram`, `link`, `download`)
- `created_at` (TIMESTAMPTZ)
- `metadata` (JSONB)

### 6. Storage Bucket
- `yogframe-campaign-media` (Public bucket with path pattern `campaigns/{campaign_id}/artwork/...`)

---

## API Documentation

### Admin Endpoints (Protected by JWT Session)
- `POST /api/admin/login`: Authenticates administrator with session token.
- `GET /api/admin/me`: Verifies active session token.
- `POST /api/admin/logout`: Clears session token cookie.
- `GET /api/admin/metrics`: Aggregates real-time counts from database (Active, Drafts, Frames, Shares, Platform breakdown).
- `GET /api/admin/campaigns`: Lists campaigns with frame and share metrics. Supports filtering and search.
- `POST /api/admin/campaigns`: Creates a new campaign with unique auto-generated or custom slug.
- `GET /api/admin/campaigns/:id`: Fetches complete campaign composition including photo and name configs.
- `PUT /api/admin/campaigns/:id`: Persists all composition geometry, layer states, and typography to Supabase.
- `PATCH /api/admin/campaigns/:id/status`: Updates campaign status (`Active`, `Draft`, `Paused`, `Archived`).
- `DELETE /api/admin/campaigns/:id`: Deletes a campaign and cascades associated configs.
- `POST /api/admin/upload`: Uploads artwork directly to Supabase storage bucket `yogframe-campaign-media`.

### Public Endpoint (Foundation for User Side)
- `GET /api/campaigns/by-slug/:slug`: Strictly isolated endpoint returning **only** the requested campaign's public composition. Never returns or leaks other campaigns.

---

## Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and provide your credentials:
```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
ADMIN_PASSWORD=your-admin-password
SESSION_SECRET=your-random-session-secret
```

### 3. Development
Run server and client concurrently:
```bash
npm run dev
```

Or run separately:
```bash
npm run dev:server   # Node.js Express server on http://localhost:3001
npm run dev:client   # Vite React dev server on http://localhost:5173
```

### 4. Production Build & Run
```bash
npm run build        # Builds optimized frontend into dist/
npm start            # Runs Express server serving API + static frontend
```
