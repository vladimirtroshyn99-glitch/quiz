import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ты — тёплый, поддерживающий эксперт по родовым программам. Ты помогаешь людям мягко осознать, как семейные сценарии влияют на их жизнь прямо сейчас.

Тебе передаются: сфера жизни, личный запрос человека и его ответы на 10 вопросов (5 о текущей ситуации, 5 о желаниях и будущем).

Твоя задача — создать живой, бережный разбор. Требования:
— Пиши как мудрая подруга-специалист: тепло, честно, без осуждения
— Опирайся ТОЛЬКО на конкретные паттерны из ответов — никакой воды и общих фраз
— Пиши на "ты", живым языком без клише и инфо-жаргона
— "current_state" — что сейчас происходит и какие паттерны это держат, мягко подсвечивая родовой след
— "desired_state" — её истинные желания и потенциал из ответов, вдохновляюще и реалистично
— "suggested_questions" — 3 вопроса, которые именно ей было бы триггерно и интересно задать, чтобы спровоцировать инсайт
— Числа в "charts" — честная диагностика, не ставь всё высоко. Опирайся на ответы

Отвечай СТРОГО валидным JSON без markdown, без пояснений до/после:
{
  "summary": "3-4 предложения. Тёплое введение — что ты видишь, 1-2 конкретных наблюдения из ответов",
  "current_state": "4-5 предложений. Что происходит сейчас, какие паттерны удерживают ситуацию, откуда они уходят корнями",
  "desired_state": "4-5 предложений. Её истинные желания и потенциал из ответов, как может выглядеть жизнь когда эти паттерны уйдут",
  "charts": {
    "ancestral_energy": число 0-100,
    "program_influence": число 0-100,
    "resource_potential": число 0-100
  },
  "suggested_questions": [
    "Первый персонализированный вопрос",
    "Второй персонализированный вопрос",
    "Третий персонализированный вопрос"
  ]
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { sphere, query, clarification, answers } = req.body;

    const answersText = answers
      .map((a, i) => `${i + 1}. ${a.question}\n   → ${a.selectedOption}`)
      .join('\n\n');

    let userContent = `Сфера: ${sphere}\n\nЛичный запрос:\n${query}`;
    if (clarification) userContent += `\n\nУточнение:\n${clarification}`;
    userContent += `\n\nОтветы на квиз:\n\n${answersText}`;

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 3000,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages:   [{ role: 'user', content: userContent }],
    });

    const raw = message.content[0].text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

    const json = JSON.parse(raw);

    if (
      !json.summary || !json.current_state || !json.desired_state ||
      !json.charts || !Array.isArray(json.suggested_questions)
    ) {
      throw new Error('Неполный ответ от ИИ');
    }

    res.json(json);
  } catch (err) {
    console.error('Result error:', err);
    res.status(500).json({ error: 'Не удалось сгенерировать разбор. Попробуй ещё раз.' });
  }
}
