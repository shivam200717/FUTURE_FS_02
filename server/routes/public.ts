import { Router, type Request, type Response, type NextFunction } from 'express';
import { config } from '../config.js';
import { rateLimit } from '../lib/rateLimit.js';
import { createLeadRecord } from '../lib/leadFactory.js';
import { cleanString, parseBudget, validateLeadInput } from '../lib/validate.js';

export const publicRouter = Router();

/** CORS for the public webhook only, so external websites can post their contact forms here. */
function webhookCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const any = config.allowedOrigins.includes('*');
  if (origin && (any || config.allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', any ? '*' : origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many submissions from this address. Please try again later.'
});

// Public endpoint: no login required (it is how website visitors create leads), so it is
// validated, size-limited and rate-limited. It can only CREATE a lead - never read or change one.
publicRouter.post('/', webhookCors, limiter, async (req, res, next) => {
  try {
    // Honeypot: real visitors never see/fill this hidden field, bots usually do.
    if (cleanString(req.body?.website, 200) || cleanString(req.body?._gotcha, 200)) {
      return res.status(201).json({ success: true, message: 'Thank you! Your inquiry was received.' });
    }

    const parsed = validateLeadInput(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    const referer = cleanString(req.get('referer'), 300);
    const dealValue = parseBudget(parsed.data.declaredBudget, 0);

    const lead: any = await createLeadRecord({
      input: { ...parsed.data, sourcePage: parsed.data.sourcePage || referer },
      dealValue,
      ip: req.ip || '',
      referrer: referer,
      createdBy: 'Website form'
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your inquiry was received by our team.',
      formId: lead.formId
    });
  } catch (e) {
    next(e);
  }
});
