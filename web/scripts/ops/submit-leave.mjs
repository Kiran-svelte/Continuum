/**
 * Submits a leave request through the deployed API as a seeded demo account,
 * so approval/rejection UI can be exercised without re-driving the wizard.
 *
 *   node scripts/ops/submit-leave.mjs <email> <type> <start> <end> "<reason>"
 */
const BASE = process.env.BASE_URL || 'https://continuum.support';
const PASSWORD = 'Continuum@2026';

const [email, leaveType, startDate, endDate, ...reasonParts] = process.argv.slice(2);
const reason = reasonParts.join(' ') || 'Automated verification request';

if (!email || !leaveType || !startDate || !endDate) {
  console.error('usage: submit-leave.mjs <email> <type> <start> <end> "<reason>"');
  process.exit(1);
}

const signin = await fetch(`${BASE}/api/auth/signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: PASSWORD }),
});
if (!signin.ok) {
  console.error('signin failed', signin.status, await signin.text());
  process.exit(1);
}
const cookie = (signin.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');

const res = await fetch(`${BASE}/api/leaves/submit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie },
  body: JSON.stringify({
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    reason,
    is_half_day: false,
  }),
});

console.log('status:', res.status);
console.log(JSON.stringify(await res.json().catch(() => ({})), null, 2).slice(0, 1200));
