export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { telegram, phone, sphere, query } = req.body;

    const webhookUrl = process.env.VAKAS_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ telegram, phone, sphere, query, source: 'quiz' }),
      });
    } else {
      console.warn('VAKAS_WEBHOOK_URL not set — skipping webhook');
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Vakas error:', err);
    res.status(500).json({ error: 'Ошибка отправки.' });
  }
}
