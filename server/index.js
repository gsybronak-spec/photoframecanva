import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { verifyConnection } from './db.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/campaigns', publicRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'YogBoardFrame Portal API',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('YogBoardFrame Portal API is running. Build frontend to view admin client.');
    }
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`===========================================`);
  console.log(`🧘 YogBoardFrame Portal Server running on http://localhost:${PORT}`);
  console.log(`===========================================`);
  await verifyConnection();
});
