import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ты — тёплый, поддерживающий эксперт по родовым программам. Твоя речь — как у мудрой, честной подруги: без инфоцыганских терминов, без коучинговых клише.

Тебе передаются: сфера жизни, личный запрос и 10 ответов на квиз (по фазам: Зеркало, Мечта, Блок, Цена, Готовность).

СТРОГОЕ ПРАВИЛО:
В блоках block1_see, block2_want, block3_hold, block4_lose, block5_dig — НИКАКИХ практических рекомендаций и советов. Только глубокий анализ. Практические шаги — ИСКЛЮЧИТЕЛЬНО в поле action_step.

Требования:
— Пиши на "ты", живым языком без клише
— Опирайся ТОЛЬКО на конкретные данные из ответов — никакой воды
— ЗАПРЕЩЕНО использовать: "точка А", "точка Б", "родовой паттерн" (как клише), "проработка", "ресурс", "инструмент", "трансформация"
— Числа в chart_gap — честная диагностика: current из диапазона 10–45, desired из диапазона 80–97

Отвечай СТРОГО валидным JSON без markdown, без пояснений до/после:
{
  "block1_see": "«Вот что я вижу». 3–4 предложения. Тёплое, эмпатичное описание её текущей ситуации — на основе запроса и ответов фазы Зеркало. Она должна почувствовать: «меня точно поняли». БЕЗ советов.",
  "block2_want": "«Вот чего ты на самом деле хочешь». 3–4 предложения. Её желания из фазы Мечта в усиленной, вдохновляющей форме. БЕЗ советов.",
  "chart_gap": {
    "current": число 10-45,
    "desired": число 80-97
  },
  "block3_hold": "«Вот что тебя держит». 3–4 предложения. Один главный скрытый механизм из ответов фаз Блок и Цена — называй его конкретно, без осуждения. БЕЗ советов.",
  "chart_root": {
    "surface": "Короткая фраза — симптом, то что видно снаружи",
    "deep": "Короткая фраза — глубинный страх или убеждение за этим",
    "root": "Короткая фраза — семейный сценарий, который это питает"
  },
  "block4_lose": "«Вот что ты теряешь, пока это не решено». 2–3 предложения. Эмоциональное зеркало цены бездействия — используй её слова из ответа фазы Цена. БЕЗ советов.",
  "block5_dig": "«Куда копать». 2–3 предложения. Спокойное, экспертное направление: почему это не решается волевым усилием или чек-листами — и куда в сторону рода смотреть. БЕЗ практических советов.",
  "suggested_questions": [
    "Вопрос от первого лица (Я/Мне/Почему я/Как мне) про что-то из block1_see или block3_hold",
    "Вопрос от первого лица про block3_hold или block4_lose",
    "Вопрос от первого лица про block5_dig"
  ],
  "cta_button_targeted": "Хлёсткий персонализированный вопрос-крючок — угадывает её главный скрытый запрос (до 10 слов, со знаком вопроса)",
  "action_step": "Конкретная, сильная инструкция с чего начать прямо сейчас. 3–4 предложения с реальными шагами."
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
      !json.block1_see || !json.block2_want ||
      !json.chart_gap || typeof json.chart_gap.current !== 'number' || typeof json.chart_gap.desired !== 'number' ||
      !json.block3_hold ||
      !json.chart_root || !json.chart_root.surface || !json.chart_root.deep || !json.chart_root.root ||
      !json.block4_lose || !json.block5_dig ||
      !Array.isArray(json.suggested_questions) ||
      !json.cta_button_targeted || !json.action_step
    ) {
      throw new Error('Неполный ответ от ИИ');
    }

    res.json(json);
  } catch (err) {
    console.error('Result error:', err);
    res.status(500).json({ error: 'Не удалось сгенерировать разбор. Попробуй ещё раз.' });
  }
}
