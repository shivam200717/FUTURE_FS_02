import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken, requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { rateLimit } from '../lib/rateLimit.js';
import { serializeRep } from '../lib/serialize.js';
import { cleanString } from '../lib/validate.js';
import { passwordProblem } from '../lib/admin.js';

export const authRouter = Router();

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `${req.ip}|${typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : ''}`,
  message: 'Too many login attempts. Please wait 15 minutes and try again.'
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    // Strings only: blocks NoSQL-injection payloads such as { "$gt": "" }
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user: any = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) return res.status(401).json({ error: 'Invalid email or password' });

    const id = String(user._id);
    res.json({ token: signToken({ id, role: user.role }), user: serializeRep(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: (req as AuthedRequest).user });
});

// Update own display name
authRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const name = cleanString(req.body?.name, 80);
    if (!name) return res.status(400).json({ error: 'Name cannot be empty' });
    const user: any = await User.findByIdAndUpdate((req as AuthedRequest).user.id, { $set: { name } }, { new: true });
    if (!user) return res.status(404).json({ error: 'Account not found' });
    res.json({ user: serializeRep(user) });
  } catch (err) {
    next(err);
  }
});

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `pw|${req.ip}`,
  message: 'Too many attempts. Please wait 15 minutes and try again.'
});

// Change own password (requires the current one)
authRouter.post('/password', requireAuth, passwordLimiter, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    const problem = passwordProblem(newPassword);
    if (problem) return res.status(400).json({ error: problem });
    if (newPassword === currentPassword) return res.status(400).json({ error: 'New password must be different from the current one' });

    const user: any = await User.findById((req as AuthedRequest).user.id).select('+passwordHash');
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
