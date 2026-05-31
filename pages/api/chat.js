import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystem(ctx, isOpening, isLast) {
  let text = `Ты — бережный ИИ-ассистент, помогающий человеку глубже осознать его родовой разбор.

Контекст разбора:
— Сфера: ${ctx.sphere}
— Запрос: ${ctx.query}
— Что я вижу сейчас: ${ctx.block1_see}
— Чего она на самом деле хочет: ${ctx.block2_want}
— Что её держит: ${ctx.block3_hold}
— Куда копать: ${ctx.block5_dig}

Правила ответа:
— Давай ПРЯМЫЕ, глубокие ответы на вопрос — не задавай встречных вопросов и не расспрашивай
— Отвечай тепло, ёмко. Максимум 3–4 коротких абзаца
— Пиши на "ты", без психологического жаргона
— Опирайся на контекст разбора, развивай и углубляй его — не пересказывай дословно
— Подсвечивай родовые механики конкретно: что именно и почему так работает`;

  if (isOpening) {
    text += `\n\nЭто первое сообщение. Поприветствуй тепло, кратко отметь 1–2 наиболее значимых момента из разбора и пригласи задать вопросы.`;
  }

  if (isLast) {
    text += `\n\nЭто последний вопрос (лимит диалога исчерпан после этого ответа). Ответь на вопрос, затем мягко, без давления, покажи: ИИ-анализ — это только первый слой. Для настоящей трансформации нужна живая работа с родологом — там открываются вещи, которые ИИ не может уловить. Не продавай, а искренне покажи ограничения формата.`;
  }

  return text;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { history, context, isLast } = req.body;
    const isOpening = !history || history.length === 0;

    const systemText = buildSystem(context, isOpening, isLast);

    const messages = isOpening
      ? [{ role: 'user', content: 'Начни разговор' }]
      : history;

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
      messages,
    });

    res.json({ reply: message.content[0].text });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Ошибка. Попробуй ещё раз.' });
  }
}
