import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

// Default is 10. It can be lowered for local testing with MIN_PASSWORD_LENGTH in .env (never below 6).
export const MIN_PASSWORD_LENGTH = Math.max(6, Number(process.env.MIN_PASSWORD_LENGTH) || 10);

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  return null;
}

export async function upsertAdmin(opts: { email: string; password: string; name: string; resetPassword?: boolean }) {
  const email = opts.email.trim().toLowerCase();
  const existing: any = await User.findOne({ email });
  const passwordHash = await bcrypt.hash(opts.password, 12);
  if (!existing) {
    await User.create({ email, name: opts.name, passwordHash, role: 'Admin' });
    return 'created' as const;
  }
  if (opts.resetPassword) {
    existing.passwordHash = passwordHash;
    existing.name = opts.name || existing.name;
    await existing.save();
    return 'updated' as const;
  }
  return 'exists' as const;
}
