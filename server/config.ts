import 'dotenv/config';
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32 && !secret.startsWith('change-me')) return secret;
  if (isProduction) {
    console.error('FATAL: JWT_SECRET must be set to a random string of 32+ characters in production.');
    process.exit(1);
  }
  console.warn(
    '[config] JWT_SECRET is missing/weak - using a random one for this run. ' +
      'Logins will reset every restart. Set JWT_SECRET in .env (see .env.example).'
  );
  return crypto.randomBytes(48).toString('hex');
}

export const config = {
  isProduction,
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leadflow',
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminName: process.env.ADMIN_NAME || 'Admin',
  // Comma separated list of website origins allowed to POST to /api/contact-inbound ("*" = any)
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === 'true'
};
