import OpenAI from 'openai';

// Увеличиваем лимит тела запроса — аудио может весить несколько МБ
export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { audio, mimeType } = req.body;
    const buffer = Buffer.from(audio, 'base64');
    const ext    = mimeType.includes('mp4') ? 'm4a' : 'webm';

    const file = new File([buffer], `audio.${ext}`, { type: mimeType });

    const result = await openai.audio.transcriptions.create({
      file,
      model:    'whisper-1',
      language: 'ru',
    });

    res.json({ text: result.text });
  } catch (err) {
    console.error('Whisper error:', err);
    res.status(500).json({ error: 'Ошибка распознавания. Попробуй ещё раз.' });
  }
}
