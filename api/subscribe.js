import { put, list } from '@vercel/blob';

// Each signup is stored as its own private blob: signups/<base64url(email)>.json
// The email is encoded in the file name so the export can be built from list() alone.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // Honeypot: real visitors never fill this hidden field.
  if (body.website) return res.status(200).json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email.' });
  }
  const source = String(body.source || 'site').slice(0, 40);
  const pathname = `signups/${Buffer.from(email).toString('base64url')}.json`;

  try {
    const existing = await list({ prefix: pathname, limit: 1 });
    if (existing.blobs.some(b => b.pathname === pathname)) {
      return res.status(200).json({ ok: true, already: true });
    }
    await put(pathname, JSON.stringify({ email, source, signedUpAt: new Date().toISOString() }), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('subscribe failed', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
}
