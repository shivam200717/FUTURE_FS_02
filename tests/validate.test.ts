import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanString, isValidEmail, parseBudget, priorityForValue, tierForValue, validateLeadInput, parseDate } from '../server/lib/validate.ts';

test('cleanString trims, strips control characters and caps length', () => {
  assert.equal(cleanString('  hello\u0000 world  ', 50), 'hello world');
  assert.equal(cleanString('abcdef', 3), 'abc');
  assert.equal(cleanString({ $gt: '' }, 10), '');
  assert.equal(cleanString(undefined, 10), '');
});

test('isValidEmail', () => {
  assert.ok(isValidEmail('jane@example.com'));
  assert.ok(!isValidEmail('jane@example'));
  assert.ok(!isValidEmail('jane example@x.com'));
  assert.ok(!isValidEmail(''));
});

test('parseBudget turns free text into a deal value', () => {
  assert.equal(parseBudget('$15,000 – $30,000'), 22500);
  assert.equal(parseBudget('$5,000 - $15,000'), 10000);
  assert.equal(parseBudget('$30,000+'), 30000);
  assert.equal(parseBudget('Under $5,000'), 2500);
  assert.equal(parseBudget('to be discussed', 123), 123);
  assert.equal(parseBudget(undefined), 0);
  assert.equal(parseBudget(42 as any, 7), 7);
});

test('priority and tier thresholds', () => {
  assert.equal(priorityForValue(30000), 'high');
  assert.equal(priorityForValue(10000), 'standard');
  assert.equal(priorityForValue(1000), 'low');
  assert.equal(priorityForValue(0), 'standard');
  assert.equal(tierForValue(20000), 'Enterprise');
  assert.equal(tierForValue(500), 'Standard');
});

test('validateLeadInput requires name and a valid email and lowercases the email', () => {
  assert.deepEqual(validateLeadInput({ email: 'a@b.co' }), { ok: false, error: 'Name is required' });
  assert.equal((validateLeadInput({ name: 'A', email: 'nope' }) as any).ok, false);
  assert.equal((validateLeadInput(null) as any).ok, false);
  const r: any = validateLeadInput({ name: ' Jane ', email: 'JANE@Example.COM', budget: '$1,000', timeline: '1 month', message: 'hi' });
  assert.equal(r.ok, true);
  assert.equal(r.data.name, 'Jane');
  assert.equal(r.data.email, 'jane@example.com');
  assert.equal(r.data.declaredBudget, '$1,000');
  assert.equal(r.data.targetTimeline, '1 month');
  assert.equal(r.data.source, 'Website Contact Form');
});

test('validateLeadInput rejects object payloads used for NoSQL injection', () => {
  const r: any = validateLeadInput({ name: { $ne: '' }, email: { $gt: '' } });
  assert.equal(r.ok, false);
});

test('parseDate', () => {
  assert.ok(parseDate('2026-10-24T10:00:00.000Z'));
  assert.equal(parseDate('not a date'), null);
  assert.equal(parseDate(12345), null);
});
