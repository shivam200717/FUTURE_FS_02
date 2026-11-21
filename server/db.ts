import mongoose from 'mongoose';
import { config } from './config.js';
import { User } from './models/User.js';
import { upsertAdmin, passwordProblem } from './lib/admin.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  } catch (err: any) {
    console.error('\nCould not connect to MongoDB at', config.mongoUri.replace(/\/\/[^@]*@/, '//***@'));
    console.error(err?.message || err);
    console.error('\nStart a local MongoDB (https://www.mongodb.com/docs/manual/installation/) or put a MongoDB Atlas');
    console.error('connection string in MONGODB_URI inside your .env file.\n');
    process.exit(1);
  }
  console.log('[db] connected to MongoDB');
}

/** Makes sure at least one admin exists so the dashboard can be opened. */
export async function ensureAdmin() {
  const { adminEmail, adminPassword, adminName } = config;
  if (adminEmail && adminPassword) {
    const problem = passwordProblem(adminPassword);
    if (problem) {
      console.error(`FATAL: ADMIN_PASSWORD is too weak. ${problem}`);
      process.exit(1);
    }
    // Keep the configured environment credentials authoritative, including when an admin
    // record already exists with an older password. This lets the documented .env login work.
    const result = await upsertAdmin({ email: adminEmail, password: adminPassword, name: adminName, resetPassword: true });
    if (result === 'created') console.log(`[auth] created admin account ${adminEmail}`);
    return;
  }
  if ((await User.countDocuments()) === 0) {
    console.error('FATAL: no admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env (see .env.example) and restart.');
    process.exit(1);
  }
}
