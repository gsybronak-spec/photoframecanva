import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SESSION_SECRET = process.env.SESSION_SECRET || 'yogframe_secret_key_change_in_production_2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ronak@2207';

export function authenticateAdmin(password) {
  if (!password || password !== ADMIN_PASSWORD) {
    return { success: false, message: 'Invalid admin credentials' };
  }

  const token = jwt.sign(
    { role: 'admin', authenticated: true, issuedAt: Date.now() },
    SESSION_SECRET,
    { expiresIn: '7d' }
  );

  return { success: true, token };
}

export function verifyAdminToken(token) {
  try {
    if (!token) return null;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(cleanToken, SESSION_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
}

export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const cookieToken = req.cookies?.yogframe_admin_token;
  const token = authHeader || cookieToken;

  const session = verifyAdminToken(token);
  if (!session || !session.authenticated) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
  }

  req.adminUser = session;
  next();
}
