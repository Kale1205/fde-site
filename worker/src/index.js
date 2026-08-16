const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

function cors(origin, allowedOrigin) {
  const allow = origin && origin === allowedOrigin ? origin : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(data, status, origin, allowedOrigin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...cors(origin, allowedOrigin),
    },
  });
}

function clean(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function escapeHtml(value) {
  return clean(value, 20000)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function sendBrevo(env, payload) {
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': env.BREVO_API_KEY,
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`BREVO_${res.status}:${body.slice(0, 500)}`);
  }
  return res.json().catch(() => ({}));
}

function adminHtml(data) {
  const rows = [
    ['Name', data.name],
    ['Company', data.company],
    ['Country', data.country],
    ['Reply email', data.email],
    ['Product', data.product],
  ];
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#17231e;line-height:1.65"><h2>Kale’s FDE Inquiry</h2>${rows.map(([k,v])=>`<p><strong>${escapeHtml(k)}</strong><br>${escapeHtml(v)}</p>`).join('')}<p><strong>Message</strong><br>${escapeHtml(data.message).replaceAll('\n','<br>')}</p></body></html>`;
}

function autoReplyHtml(data) {
  const ja = data.lang === 'ja';
  if (ja) {
    return `<!doctype html><html><body style="font-family:Arial,'Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;color:#17231e;line-height:1.8"><p>${escapeHtml(data.name)} 様</p><p>Kale’s FDEへお問い合わせいただきありがとうございます。</p><p>以下の内容でお問い合わせを受け付けました。内容を確認のうえ、返信いたします。</p><hr><p><strong>製品</strong><br>${escapeHtml(data.product)}</p><p><strong>お問い合わせ内容</strong><br>${escapeHtml(data.message).replaceAll('\n','<br>')}</p><hr><p>このメールは自動返信です。</p><p>Baked Kale / Kale’s FDE</p></body></html>`;
  }
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#17231e;line-height:1.8"><p>Dear ${escapeHtml(data.name)},</p><p>Thank you for contacting Kale’s FDE.</p><p>We received your inquiry with the details below and will reply after reviewing it.</p><hr><p><strong>Product</strong><br>${escapeHtml(data.product)}</p><p><strong>Message</strong><br>${escapeHtml(data.message).replaceAll('\n','<br>')}</p><hr><p>This is an automated confirmation email.</p><p>Baked Kale / Kale’s FDE</p></body></html>`;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://kale1205.github.io';

    if (request.method === 'OPTIONS') {
      if (origin && origin !== allowedOrigin) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: cors(origin, allowedOrigin) });
    }
    if (request.method !== 'POST') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405, origin, allowedOrigin);
    if (origin && origin !== allowedOrigin) return json({ ok: false, error: 'ORIGIN_NOT_ALLOWED' }, 403, origin, allowedOrigin);

    let raw;
    try { raw = await request.json(); } catch { return json({ ok: false, error: 'INVALID_JSON' }, 400, origin, allowedOrigin); }

    const data = {
      name: clean(raw.name, 120),
      company: clean(raw.company, 160),
      country: clean(raw.country, 120),
      email: clean(raw.email, 254),
      product: clean(raw.product, 120),
      message: clean(raw.message, 8000),
      lang: clean(raw.lang, 10) || 'ja',
      website: clean(raw.website, 200),
    };

    if (data.website) return json({ ok: true }, 200, origin, allowedOrigin);
    if (!data.name || !data.company || !data.country || !data.email || !data.product || !data.message) {
      return json({ ok: false, error: 'MISSING_FIELDS' }, 400, origin, allowedOrigin);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return json({ ok: false, error: 'INVALID_EMAIL' }, 400, origin, allowedOrigin);

    const senderEmail = env.FROM_EMAIL;
    const senderName = env.FROM_NAME || "Kale’s FDE";
    const adminEmail = env.ADMIN_EMAIL || 'reyouinjune@gmail.com';
    if (!env.BREVO_API_KEY || !senderEmail) return json({ ok: false, error: 'SERVER_NOT_CONFIGURED' }, 500, origin, allowedOrigin);

    try {
      await sendBrevo(env, {
        sender: { email: senderEmail, name: senderName },
        to: [{ email: adminEmail, name: 'Baked Kale' }],
        replyTo: { email: data.email, name: data.name },
        subject: `Kale’s FDE Inquiry — ${data.product}`,
        htmlContent: adminHtml(data),
      });

      await sendBrevo(env, {
        sender: { email: senderEmail, name: senderName },
        to: [{ email: data.email, name: data.name }],
        subject: data.lang === 'ja' ? '【Kale’s FDE】お問い合わせを受け付けました' : 'Kale’s FDE — We received your inquiry',
        htmlContent: autoReplyHtml(data),
      });

      return json({ ok: true }, 200, origin, allowedOrigin);
    } catch (error) {
      console.error(error);
      return json({ ok: false, error: 'MAIL_SEND_FAILED' }, 502, origin, allowedOrigin);
    }
  },
};
