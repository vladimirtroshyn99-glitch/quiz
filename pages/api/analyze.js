import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ты — бережный, тёплый эксперт по родовым программам и психогенеалогии. Ты помогаешь людям мягко исследовать родовые сценарии, которые влияют на их жизнь. Твой тон — как у доброй, мудрой подруги, которая много знает, но никогда не осуждает.

Тебе передаётся сфера жизни (Деньги / Отношения / Самореализация / Здоровье) и то, что человек описал своими словами.

Твои действия:

1. ОЦЕНИ ГЛУБИНУ ЗАПРОСА.
   — Если запрос очень короткий или расплывчатый (1–2 общих фразы без конкретики, например "всё плохо с деньгами" или "не складываются отношения") — задай ОДИН тёплый, точечный уточняющий вопрос. Вопрос должен помочь понять суть ситуации глубже — не оценивать, а приглашать к размышлению.
   — Если запрос содержательный (есть конкретика, описание ситуации, эмоции, события) — сразу создавай тест.
   — Если в сообщении уже есть ответ на уточняющий вопрос — ВСЕГДА создавай тест, больше не уточняй.

2. ГЕНЕРИРУЙ ТЕСТ из РОВНО 10 вопросов — не больше, не меньше. quiz_data ОБЯЗАН содержать ровно 10 объектов. Вопросы должны:
   — Быть строго персонализированы под описанную ситуацию (не общие шаблонные вопросы)
   — Исследовать родовые паттерны: отношения с родителями, повторяющиеся сценарии в семье, унаследованные убеждения и ограничения, семейные табу
   — Быть написаны тепло, на "ты", без психологического жаргона
   — Иметь 4 варианта ответа: конкретные, жизненные, отражающие разный опыт (не просто "да/нет/иногда/часто")

ОТВЕЧАЙ СТРОГО ВАЛИДНЫМ JSON БЕЗ MARKDOWN-ОБЁРТКИ, без \`\`\`, без пояснений до или после:

Если нужно уточнение:
{"status":"need_clarification","ai_question":"Текст вопроса"}

Если готов тест:
{"status":"ready_for_quiz","quiz_data":[{"id":1,"question":"Текст вопроса","options":["Вариант А","Вариант Б","Вариант В","Вариант Г"]}]}`;

async function callClaude(userContent) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userContent }],
  });

  const raw = message.content[0].text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  return JSON.parse(raw);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { sphere, query, clarification } = req.body;

    let userContent = `Сфера: ${sphere}\n\nЧто описал человек:\n${query}`;
    if (clarification) {
      userContent += `\n\nТы уже задал уточняющий вопрос. Ответ человека:\n${clarification}\n\nТеперь обязательно генерируй тест.`;
    }

    let json = await callClaude(userContent);

    // Если тест пришёл неполным — перегенерируем до 2 раз, пользователь не видит
    if (json.status === 'ready_for_quiz') {
      let attempts = 1;
      while ((!Array.isArray(json.quiz_data) || json.quiz_data.length !== 10) && attempts < 3) {
        console.warn(`Attempt ${attempts}: got ${json.quiz_data?.length ?? 0} questions, retrying...`);
        json = await callClaude(userContent);
        attempts++;
      }
      if (!Array.isArray(json.quiz_data) || json.quiz_data.length !== 10) {
        throw new Error('Не удалось сгенерировать полный тест');
      }
    }

    res.json(json);
  } catch (err) {
    console.error('Claude error:', err);
    res.status(500).json({ error: 'Ошибка анализа. Попробуй ещё раз.' });
  }
}
