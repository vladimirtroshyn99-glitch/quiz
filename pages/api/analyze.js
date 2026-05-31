import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ты — бережный, тёплый эксперт по родовым программам. Твой тон — как у мудрой подруги: без осуждения, точно и по делу.

Тебе передаётся сфера жизни и личный запрос человека.

ШАГ 1 — ОЦЕНИ ЗАПРОС:
— Если запрос очень короткий (1–2 общие фразы без конкретики) — задай ОДИН тёплый уточняющий вопрос
— Если запрос содержательный (есть детали, эмоции, ситуация) — сразу создавай тест
— Если в теле уже есть ответ на уточняющий вопрос — ВСЕГДА создавай тест

ШАГ 2 — ГЕНЕРИРУЙ ТЕСТ: ровно 10 вопросов строго по фазам методологии.
Под каждый вопрос создай 3–4 уникальных контекстных варианта ответа, отражающих реальные мысли и паттерны этого конкретного человека.

СТРУКТУРА 10 ВОПРОСОВ ПО ФАЗАМ:

Фаза 1 — «Зеркало» (вопросы 1–3), phase: "mirror":
Формат «утверждение + калибровка». Называй ситуацию прямо, на основе запроса.
Человек должен почувствовать: «меня видят и понимают».
Варианты ответов — степени узнавания: от «да, именно так» до «нет, это не моё».

Фаза 2 — «Мечта» (вопросы 4–5), phase: "dream":
Кристаллизуют желаемое: свобода, спокойствие, уважение к себе, наполненность.
Варианты ответов — конкретные живые образы желаемого будущего, характерные для этой аудитории.

Фаза 3 — «Блок» (вопросы 6–7), phase: "block":
Называют скрытые корневые затыки: страх проявиться, синдром самозванца, зависимость от одобрения, незаслуженность.
Варианты ответов — конкретные внутренние голоса и убеждения от первого лица.

Фаза 3.5 — «Цена» (вопрос 8), phase: "price":
Вопрос: «Если через полгода всё останется как сейчас — что будет самым тяжёлым для тебя?»
Варианты ответов — конкретные тяжёлые сценарии, привязанные к боли этого человека. Не абстракции — живые страхи, сформулированные от первого лица.

Фаза 4 — «Готовность» (вопросы 9–10), phase: "readiness":
Вопросы про готовность действовать прямо сейчас.
Варианты ответов — степени зрелости: от «Готова начать сегодня» до «Пока только присматриваюсь».

ВАЖНО:
— Вопросы строго персонализированы под запрос — никаких шаблонных фраз
— Пиши на "ты", живым языком
— 3–4 варианта на вопрос, каждый — отдельная живая мысль

ОТВЕЧАЙ СТРОГО ВАЛИДНЫМ JSON БЕЗ MARKDOWN-ОБЁРТКИ, без \`\`\`, без пояснений до или после:

Если нужно уточнение:
{"status":"need_clarification","ai_question":"Текст вопроса"}

Если готов тест:
{"status":"ready_for_quiz","quiz_data":[{"id":1,"phase":"mirror","question_text":"Текст вопроса","options":["Вариант 1","Вариант 2","Вариант 3"]},{"id":2,"phase":"mirror","question_text":"...","options":["...","...","...","..."]}]}

quiz_data ОБЯЗАН содержать ровно 10 объектов. Каждый объект ОБЯЗАН содержать поля: id, phase, question_text, options (массив 3–4 строк).`;

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

    if (json.status === 'ready_for_quiz') {
      const isValid = (data) =>
        Array.isArray(data) &&
        data.length === 10 &&
        data.every(q => q.question_text && Array.isArray(q.options) && q.options.length >= 3);

      let attempts = 1;
      while (!isValid(json.quiz_data) && attempts < 3) {
        console.warn(`Attempt ${attempts}: invalid quiz_data, retrying...`);
        json = await callClaude(userContent);
        attempts++;
      }
      if (!isValid(json.quiz_data)) {
        throw new Error('Не удалось сгенерировать полный тест');
      }
    }

    res.json(json);
  } catch (err) {
    console.error('Claude error:', err);
    res.status(500).json({ error: 'Ошибка анализа. Попробуй ещё раз.' });
  }
}
