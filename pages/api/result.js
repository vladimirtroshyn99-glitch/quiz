import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ты — ведущий эксперт-родолог и психогенеалог. Ты проводишь точечную диагностику на основе квиза и личного запроса человека.

Тебе передаются: сфера жизни, личный запрос человека своими словами и его ответы на 10 диагностических вопросов.

Твоя задача — создать глубокий, персонализированный разбор. Требования:
— Опирайся ТОЛЬКО на конкретные паттерны из ответов. Никакой воды и банальностей
— Тон: тёплый, поддерживающий, профессиональный. Пиши на "ты"
— Не повторяй вопросы и не пересказывай ответы дословно
— "pointA" и "pointB" должны ощущаться как два конкретных полюса одной истории
— "ancestral_block" — назови сценарий конкретно (например: "синдром самозванца", "сценарий раскулачивания", "программа 'не высовывайся'")
— Числа в "charts" — честная диагностика, не ставь всё высоко. Опирайся на ответы

Отвечай СТРОГО валидным JSON без markdown, без пояснений до/после:
{
  "summary": "3-4 предложения. Тёплое, точное введение — что ты увидел в ответах. Назови 1-2 конкретных наблюдения",
  "pointA": "4-5 предложений. Что происходит сейчас, почему болит, какие паттерны удерживают ситуацию",
  "pointB": "4-5 предложений. Конкретно и вдохновляюще — как будет, когда блок проработан. Реалистично, не сказочно",
  "ancestral_block": "2-3 предложения. Название и суть главного родового сценария с конкретным примером из рода",
  "charts": {
    "ancestral_energy": число 0-100 (активность родовой энергии в этой сфере),
    "program_influence": число 0-100 (сила неосознанных программ),
    "resource_potential": число 0-100 (скрытый потенциал для изменений)
  }
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

    // Базовая валидация
    if (!json.summary || !json.pointA || !json.pointB || !json.ancestral_block || !json.charts) {
      throw new Error('Неполный ответ от ИИ');
    }

    res.json(json);
  } catch (err) {
    console.error('Result error:', err);
    res.status(500).json({ error: 'Не удалось сгенерировать разбор. Попробуй ещё раз.' });
  }
}
