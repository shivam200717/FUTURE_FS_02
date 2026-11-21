// Optional demo data so the dashboard is not empty on first run.
//   npm run seed            -> only runs when there are no leads yet
//   npm run seed -- --reset -> deletes ALL leads and tasks first, then seeds
import mongoose from 'mongoose';
import { config } from './config.js';
import { Lead } from './models/Lead.js';
import { Task } from './models/Task.js';
import { User } from './models/User.js';
import { Counter } from './models/Counter.js';
import { priorityForValue, tierForValue } from './lib/validate.js';

const H = 3600_000;
const ago = (hours: number) => new Date(Date.now() - hours * H);

interface Demo {
  name: string; email: string; company: string; phone: string; source: string; subject: string; message: string;
  budget: string; value: number; hoursAgo: number; status: 'new' | 'contacted' | 'proposal' | 'converted' | 'lost';
  respondedAfterMin?: number; notes?: { type: 'call' | 'email' | 'meeting' | 'note'; content: string; hoursAfter: number; duration?: string }[];
}

const DEMO: Demo[] = [
  { name: 'Priya Nair', email: 'priya@brightpath.example', company: 'BrightPath Learning', phone: '+91 98100 11001', source: 'Hero Contact Form', subject: 'Website redesign', message: 'We need a new marketing site for our tutoring brand before the June intake.', budget: '$5,000 - $10,000', value: 7500, hoursAgo: 1.5, status: 'new' },
  { name: 'Marcus Webb', email: 'marcus@northwind.example', company: 'Northwind Logistics', phone: '+1 415 555 0132', source: 'Pricing Calculator', subject: 'Quote request', message: 'Calculated an estimate for 40 seats. Can someone walk us through onboarding?', budget: '$15,000 - $30,000', value: 22500, hoursAgo: 6, status: 'new' },
  { name: 'Elena Rossi', email: 'elena@rossidesign.example', company: 'Rossi Design Studio', phone: '+39 06 555 0148', source: 'Organic Search', subject: 'Brand + web package', message: 'Looking for a partner to build our portfolio site and brand identity.', budget: '$5,000 - $10,000', value: 7500, hoursAgo: 28, status: 'new' },
  { name: 'Tom Alvarez', email: 'tom@greenleaf.example', company: 'GreenLeaf Foods', phone: '+1 212 555 0170', source: 'Hero Contact Form', subject: 'E-commerce build', message: 'We sell organic snacks and want to move off marketplaces to our own store.', budget: '$10,000 - $20,000', value: 15000, hoursAgo: 52, status: 'contacted', respondedAfterMin: 18, notes: [{ type: 'call', content: 'Intro call. They want Shopify-style checkout, ~120 SKUs. Sending a scope doc.', hoursAfter: 1, duration: '14m 20s' }] },
  { name: 'Aisha Khan', email: 'aisha@clearview.example', company: 'ClearView Health', phone: '+44 20 7946 0958', source: 'Enterprise Demo Request', subject: 'Patient portal', message: 'We need a secure patient portal with appointment booking.', budget: '$30,000+', value: 30000, hoursAgo: 96, status: 'proposal', respondedAfterMin: 42, notes: [{ type: 'call', content: 'Discovery call with their CTO. HIPAA-style requirements, SSO needed.', hoursAfter: 1, duration: '31m 05s' }, { type: 'email', content: 'Sent proposal v1 (fixed price, 3 phases).', hoursAfter: 30 }] },
  { name: 'Daniel Okafor', email: 'daniel@sparkfit.example', company: 'SparkFit', phone: '+234 802 555 0191', source: 'Partner Referral', subject: 'Mobile app MVP', message: 'Referred by Lena. We have designs ready and need developers.', budget: '$10,000 - $20,000', value: 15000, hoursAgo: 190, status: 'converted', respondedAfterMin: 9, notes: [{ type: 'call', content: 'Great fit. Agreed on MVP scope and a 10-week timeline.', hoursAfter: 0.5, duration: '22m 10s' }, { type: 'meeting', content: 'Kick-off meeting held, contract signed.', hoursAfter: 72 }] },
  { name: 'Sofia Martins', email: 'sofia@casaluz.example', company: 'Casa Luz Hotels', phone: '+351 21 555 0123', source: 'Pricing Calculator', subject: 'Booking engine', message: 'Need a direct booking engine for 3 boutique hotels.', budget: '$20,000 - $30,000', value: 25000, hoursAgo: 260, status: 'converted', respondedAfterMin: 55, notes: [{ type: 'email', content: 'Sent case studies and a ballpark quote.', hoursAfter: 2 }, { type: 'call', content: 'Verbal yes. Contract going out tomorrow.', hoursAfter: 100, duration: '12m 40s' }] },
  { name: 'Liam Chen', email: 'liam@tidalpay.example', company: 'TidalPay', phone: '+65 6555 0190', source: 'Hero Contact Form', subject: 'Dashboard rebuild', message: 'Our internal dashboard is slow and ugly. Open to a full rebuild.', budget: '$15,000 - $25,000', value: 20000, hoursAgo: 320, status: 'lost', respondedAfterMin: 130, notes: [{ type: 'call', content: 'Budget was cut for this quarter. Will revisit in Q3.', hoursAfter: 3, duration: '7m 55s' }] },
  { name: 'Grace Mbeki', email: 'grace@kopano.example', company: 'Kopano Co-op', phone: '+27 21 555 0166', source: 'Organic Search', subject: 'Donation website', message: 'We are a small non-profit and need a simple site with online donations.', budget: '$2,000 - $5,000', value: 3500, hoursAgo: 410, status: 'contacted', respondedAfterMin: 25, notes: [{ type: 'email', content: 'Shared two options (WordPress vs custom). Waiting on their board decision.', hoursAfter: 1 }] },
  { name: 'Noah Fischer', email: 'noah@fischerlaw.example', company: 'Fischer & Partners', phone: '+49 30 555 0112', source: 'Enterprise Demo Request', subject: 'Client intake system', message: 'We want an intake form and case tracker for our law firm.', budget: '$10,000 - $20,000', value: 15000, hoursAgo: 480, status: 'proposal', respondedAfterMin: 20, notes: [{ type: 'meeting', content: 'Demo call with two partners. Asked for a data-privacy addendum.', hoursAfter: 26 }] },
  { name: 'Yuki Tanaka', email: 'yuki@mochiworks.example', company: 'Mochi Works', phone: '+81 3 5555 0177', source: 'Partner Referral', subject: 'Landing page + analytics', message: 'Launching a new product in November, need a fast landing page.', budget: '$3,000 - $6,000', value: 4500, hoursAgo: 560, status: 'converted', respondedAfterMin: 12, notes: [{ type: 'call', content: 'Confirmed scope and timeline, deposit received.', hoursAfter: 1, duration: '10m 02s' }] },
  { name: 'Carlos Mendes', email: 'carlos@vidaverde.example', company: 'Vida Verde', phone: '+55 11 5555 0144', source: 'Hero Contact Form', subject: 'Inventory app', message: 'Need an inventory tracker for our plant nursery chain.', budget: '$8,000 - $12,000', value: 10000, hoursAgo: 620, status: 'contacted', respondedAfterMin: 70, notes: [{ type: 'call', content: 'Left voicemail, then exchanged emails. Needs approval from the owner.', hoursAfter: 5, duration: '1m 10s' }] }
];

async function run() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  const reset = process.argv.includes('--reset');
  const existing = await Lead.countDocuments();
  if (existing > 0 && !reset) {
    console.log(`Database already has ${existing} leads - not seeding. Use "npm run seed -- --reset" to wipe and reseed.`);
    return;
  }
  if (reset) {
    await Promise.all([Lead.deleteMany({}), Task.deleteMany({}), Counter.deleteMany({})]);
  }
  const users: any[] = await User.find().sort({ _id: 1 });
  if (users.length === 0) throw new Error('Create an admin first (start the server once, or run: npm run create-admin).');

  let seq = 0;
  for (const [i, d] of DEMO.entries()) {
    seq += 1;
    const receivedAt = ago(d.hoursAgo);
    const rep = users[i % users.length];
    const firstContactedAt = d.respondedAfterMin != null ? new Date(receivedAt.getTime() + d.respondedAfterMin * 60_000) : null;
    const notes = (d.notes || []).map((n) => ({
      type: n.type, author: rep.name, content: n.content,
      metadata: n.type === 'call' ? { duration: n.duration, badge: 'Call Logged' } : undefined,
      createdAt: new Date(receivedAt.getTime() + n.hoursAfter * H)
    }));
    const activity: any[] = [
      { type: 'submission', title: 'Inquiry received', detail: `Captured from "${d.source}". Message: ${d.message}`, author: 'Website form', createdAt: receivedAt },
      { type: 'assigned', title: `Assigned to ${rep.name}`, detail: 'Round-robin lead routing.', author: 'System', createdAt: receivedAt },
      ...notes.map((n) => ({ type: 'note_logged', title: `${rep.name} logged a ${n.type}`, detail: n.content, author: rep.name, duration: n.metadata?.duration, createdAt: n.createdAt }))
    ];
    if (d.status !== 'new') {
      activity.push({ type: 'stage_change', title: `${rep.name} updated stage`, detail: `Stage changed from NEW to ${d.status.toUpperCase()}`, author: rep.name, fromStage: 'new', toStage: d.status, createdAt: firstContactedAt || receivedAt });
    }
    const lead: any = await Lead.create({
      formId: `#LF-${String(seq).padStart(4, '0')}`,
      name: d.name, email: d.email, company: d.company, phone: d.phone, source: d.source, sourcePage: '/contact',
      subject: d.subject, message: d.message, status: d.status, declaredBudget: d.budget, targetTimeline: '1-2 months',
      dealValue: d.value, priority: priorityForValue(d.value), tier: tierForValue(d.value), assignedTo: rep._id,
      receivedAt, firstContactedAt,
      convertedAt: d.status === 'converted' ? new Date(receivedAt.getTime() + 4 * 24 * H) : null,
      notes, activityHistory: activity
    });
    if (d.status === 'new' || d.status === 'contacted' || d.status === 'proposal') {
      const dueAt = new Date(Date.now() + (d.status === 'new' ? 1 : 24 + i * 6) * H);
      await Task.create({ lead: lead._id, leadName: d.name, company: d.company, title: `Follow up with ${d.name}`, description: d.subject, dueAt, isUrgent: d.status === 'new' && d.value >= 20000 });
      lead.nextFollowUpAt = dueAt;
      await lead.save();
    }
  }
  await Counter.findByIdAndUpdate('formId', { seq }, { upsert: true });
  console.log(`Seeded ${DEMO.length} demo leads.`);
}

run().catch((e) => { console.error(e.message || e); process.exitCode = 1; }).finally(() => mongoose.disconnect());
