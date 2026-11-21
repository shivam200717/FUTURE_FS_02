// Usage: npm run create-admin -- you@example.com "a-strong-password" "Your Name"
// Creates an admin, or resets the password if that email already exists.
import mongoose from 'mongoose';
import { config } from './config.js';
import { upsertAdmin, passwordProblem } from './lib/admin.js';

const [email, password, name] = process.argv.slice(2).filter((a) => a !== '--prod');

async function run() {
  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> <password> ["Full Name"]');
    process.exit(1);
  }
  const problem = passwordProblem(password);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  const result = await upsertAdmin({ email, password, name: name || 'Admin', resetPassword: true });
  console.log(`Admin ${email} ${result}.`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
