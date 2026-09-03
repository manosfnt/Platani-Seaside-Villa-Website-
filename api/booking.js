const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 12000;

// Throttling. This lives in the instance's memory, so it is not a hard global
// limit: Vercel may run several instances, and a cold start resets the counter.
// It still stops the common case - one client hammering the form - and costs
// nothing. Move to Vercel KV / Upstash if genuine distributed limiting is needed.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX_PER_IP = 5;
const RATE_MAX_TRACKED_IPS = 5000;
const recentByIp = new Map();

function clientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded.length) return String(forwarded[0]).trim();
  return request.headers['x-real-ip'] || request.socket?.remoteAddress || 'unknown';
}

// Returns false when this IP has already used up its allowance.
function withinRateLimit(ip) {
  const now = Date.now();

  for (const [key, stamps] of recentByIp) {
    const live = stamps.filter((t) => now - t < RATE_WINDOW_MS);
    if (live.length) recentByIp.set(key, live);
    else recentByIp.delete(key);
  }
  if (recentByIp.size > RATE_MAX_TRACKED_IPS) recentByIp.clear();

  const stamps = recentByIp.get(ip) || [];
  if (stamps.length >= RATE_MAX_PER_IP) return false;

  stamps.push(now);
  recentByIp.set(ip, stamps);
  return true;
}

function clean(value, maxLength) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const ip = clientIp(request);
  if (!withinRateLimit(ip)) {
    response.setHeader('Retry-After', String(RATE_WINDOW_MS / 1000));
    return response.status(429).json({
      error: 'Too many enquiries from this connection. Please try again later or email us directly.'
    });
  }

  const contentLength = Number(request.headers['content-length']) || 0;
  if (contentLength > MAX_BODY_BYTES) {
    return response.status(413).json({ error: 'Message is too large.' });
  }

  let body;
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
  } catch {
    return response.status(400).json({ error: 'Invalid request.' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return response.status(400).json({ error: 'Invalid request.' });
  }
  // A missing/forged Content-Length would slip past the check above.
  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    return response.status(413).json({ error: 'Message is too large.' });
  }
  if (body.website) return response.status(200).json({ ok: true });

  const name = clean(body.name, 100);
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 40);
  const message = clean(body.message, 3000);

  if (!name || !EMAIL_PATTERN.test(email) || !message) {
    return response.status(400).json({ error: 'Please complete your name, email and message.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_TO_EMAIL || 'plataniseasidevilla@gmail.com';
  const from = process.env.BOOKING_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error('Missing RESEND_API_KEY or BOOKING_FROM_EMAIL');
    return response.status(503).json({ error: 'Email service is not configured yet.' });
  }

  const html = `
    <!doctype html>
    <html lang="en">
      <body style="margin:0;background:#f5f1e8;font-family:Arial,sans-serif;color:#24342d">
        <div style="max-width:620px;margin:0 auto;padding:32px 20px">
          <div style="background:#fff;border:1px solid #ded7c8;border-radius:12px;padding:28px">
            <p style="margin:0 0 8px;color:#8a7657;font-size:13px;letter-spacing:.08em;text-transform:uppercase">Platani Seaside Villa</p>
            <h1 style="margin:0 0 24px;font-size:24px">New booking enquiry</h1>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
            <p><strong>Phone:</strong> ${escapeHtml(phone || 'Not provided')}</p>
            <hr style="border:0;border-top:1px solid #ded7c8;margin:24px 0">
            <p style="margin-bottom:8px"><strong>Message</strong></p>
            <p style="line-height:1.6;white-space:normal">${escapeHtml(message).replace(/\r?\n/g, '<br>')}</p>
          </div>
        </div>
      </body>
    </html>`;

  const text = [
    'New booking enquiry - Platani Seaside Villa',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || 'Not provided'}`,
    '',
    'Message:',
    message
  ].join('\n');

  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `New villa enquiry from ${name}`,
        html,
        text
      })
    });
    if (!emailResponse.ok) {
      console.error('Resend error', emailResponse.status, await emailResponse.text());
      return response.status(502).json({ error: 'Your message could not be sent right now.' });
    }
    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Booking email error', error);
    return response.status(502).json({ error: 'Your message could not be sent right now.' });
  }
};
