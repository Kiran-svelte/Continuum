/**
 * Dumps the most recent emails Resend actually delivered, so we can inspect the
 * real subject/from/links instead of guessing from the template source.
 *
 *   node scripts/ops/resend-recent.mjs [count]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '../..');

function loadEnvFile(name) {
  const file = path.join(webRoot, name);
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[m[1]] = value.replace(/\\r/g, '').replace(/\\n/g, '').trim();
  }
}

loadEnvFile('.env.prod');

const key = process.env.RESEND_API_KEY;
if (!key) {
  console.error('RESEND_API_KEY missing');
  process.exit(1);
}

const listRes = await fetch('https://api.resend.com/emails', {
  headers: { Authorization: `Bearer ${key}` },
});
if (!listRes.ok) {
  console.error('list failed', listRes.status, await listRes.text());
  process.exit(1);
}
const list = await listRes.json();
const items = (list.data ?? []).slice(0, Number(process.argv[2] || 6));

for (const item of items) {
  const detailRes = await fetch(`https://api.resend.com/emails/${item.id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const d = await detailRes.json();
  console.log('─'.repeat(70));
  console.log('id      :', d.id);
  console.log('created :', d.created_at);
  console.log('from    :', d.from);
  console.log('to      :', d.to);
  console.log('subject :', d.subject);
  console.log('status  :', d.last_event);
  const hrefs = [...String(d.html || '').matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  console.log('links   :', hrefs);
}
