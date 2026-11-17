import { list } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

// GET /api/export?key=EXPORT_KEY  -> downloads all signups as CSV
// GET /api/export?key=EXPORT_KEY&format=count -> just the number of signups
function keyOk(given) {
  const want = process.env.EXPORT_KEY || '';
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(want);
  return want.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

const csvCell = v => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s;           // block spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default async function handler(req, res) {
  if (!keyOk(req.query.key)) return res.status(401).send('Unauthorized');

  const rows = [];
  let cursor;
  try {
    do {
      const page = await list({ prefix: 'signups/', cursor, limit: 1000 });
      for (const b of page.blobs) {
        const enc = b.pathname.slice('signups/'.length).replace(/\.json$/, '');
        let email;
        try { email = Buffer.from(enc, 'base64url').toString('utf8'); } catch { continue; }
        rows.push({ email, signedUpAt: new Date(b.uploadedAt).toISOString() });
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch (err) {
    console.error('export failed', err);
    return res.status(500).send('Export failed');
  }

  rows.sort((a, b) => a.signedUpAt.localeCompare(b.signedUpAt));
  res.setHeader('Cache-Control', 'no-store');

  if (req.query.format === 'count') return res.status(200).json({ count: rows.length });

  const csv = ['email,signed_up_at', ...rows.map(r => `${csvCell(r.email)},${csvCell(r.signedUpAt)}`)].join('\n') + '\n';
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="mr-snex-signups-${stamp}.csv"`);
  return res.status(200).send(csv);
}
