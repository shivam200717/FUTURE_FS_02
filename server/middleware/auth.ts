import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}
export type AuthedRequest = Request & { user: AuthUser };

export function signToken(user: { id: string; role: string }): string {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: user.id,
    expiresIn: config.jwtExpiresIn as any,
    algorithm: 'HS256'
  });
}

/** Rejects any request that does not carry a valid Bearer token for an existing user. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    const user: any = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    (req as AuthedRequest).user = { id: String(user._id), name: user.name, email: user.email, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
}
