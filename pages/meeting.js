import { useState } from 'react';

const WHAT_ITEMS = [
  { icon: '📋', text: 'Специалист уже видел твой разбор - не нужно ничего объяснять заново, сразу к сути' },
  { icon: '🔍', text: 'Разберёт твою ситуацию глубже, чем смог квиз' },
  { icon: '🎯', text: 'Покажет, что именно держит тебя на месте' },
  { icon: '💬', text: 'Даст конкретные рекомендации именно под тебя и ответит на вопросы' },
];

const HOW_ITEMS = [
  { icon: '📹', label: 'Формат', text: 'Видеозвонок или обычный звонок - уточним при записи' },
  { icon: '⏱', label: 'Время', text: '20 минут, без воды и лишних слов' },
  { icon: '👤', label: 'Кто', text: 'Один на один с живым специалистом' },
  { icon: '🤝', label: 'Атмосфера', text: 'Без давления - помогаем разобраться, не навязываем' },
];

const FEARS = [
  { q: 'Это правда бесплатно?', a: 'Да, совсем. Никаких скрытых условий и обязательств.' },
  { q: 'Что если я передумаю?', a: 'Можно отменить или перенести в любой момент - без вопросов.' },
  { q: 'Будут ли что-то продавать?', a: 'Специалист на встрече помогает разобраться. Если захочешь продолжить - предложат варианты. Но давить не будут.' },
];

export default function Meeting() {
  const [showForm, setShowForm]     = useState(false);
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/vakas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, source: 'meeting-page' }),
      });
    } catch (_) {}
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-[#1a1410] flex flex-col items-center px-5 pt-10 pb-16">
      <div className="w-full max-w-sm mx-auto flex flex-col">

        {/* Заголовок */}
        <div className="text-center mb-8">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#c46a3e] mb-4">
            Бесплатная встреча
          </p>
          <h1 className="text-[26px] font-semibold text-[#f5ede3] leading-tight mb-3">
            Твоя встреча с родологом
          </h1>
          <p className="text-[#8b7b6f] text-sm leading-relaxed">
            20 минут разговора - и ты поймёшь, что именно мешает тебе двигаться вперёд
          </p>
        </div>

        {/* Блок "Что будет на встрече" */}
        <div className="bg-[#2a2318] rounded-3xl px-5 py-5 mb-4 border border-[#3d352a]">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#c46a3e] mb-4">
            Что тебя ждёт
          </p>
          <div className="flex flex-col gap-4">
            {WHAT_ITEMS.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0 leading-none mt-0.5">{item.icon}</span>
                <p className="text-[#f5ede3] text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Блок "Как это проходит" */}
        <div className="bg-[#2a2318] rounded-3xl px-5 py-5 mb-4 border border-[#3d352a]">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#c46a3e] mb-4">
            Как это проходит
          </p>
          <div className="flex flex-col gap-4">
            {HOW_ITEMS.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0 leading-none mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-[#8b7b6f] text-[11px] font-semibold uppercase tracking-wide mb-0.5">{item.label}</p>
                  <p className="text-[#f5ede3] text-sm leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Снятие страхов */}
        <div className="flex flex-col gap-3 mb-8">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#c46a3e] mt-2">
            Это ни к чему не обязывает
          </p>
          {FEARS.map((f, i) => (
            <div key={i} className="bg-[#221c14] rounded-2xl px-4 py-4 border border-[#3d352a]">
              <p className="text-[#f5ede3] text-sm font-semibold mb-1">{f.q}</p>
              <p className="text-[#8b7b6f] text-sm leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        {!submitted ? (
          <>
            {!showForm ? (
              <div className="text-center">
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-4 rounded-3xl bg-[#c46a3e] text-white font-semibold text-base shadow-lg active:scale-[0.98] transition-transform mb-2"
                >
                  Записаться на встречу →
                </button>
                <p className="text-[#6a5a50] text-xs">Выбери удобное время - уточним при звонке</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <p className="text-[#f5ede3] text-base font-semibold text-center mb-1">
                  Оставь контакты
                </p>
                <p className="text-[#8b7b6f] text-sm text-center mb-2">
                  Специалист свяжется с тобой и согласует время
                </p>
                <input
                  type="text"
                  placeholder="Твоё имя"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[#2a2318] border border-[#3d352a] rounded-2xl px-4 py-3 text-[#f5ede3] text-sm placeholder-[#6a5a50] outline-none focus:border-[#c46a3e] transition-colors"
                />
                <input
                  type="tel"
                  placeholder="Номер телефона"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-[#2a2318] border border-[#3d352a] rounded-2xl px-4 py-3 text-[#f5ede3] text-sm placeholder-[#6a5a50] outline-none focus:border-[#c46a3e] transition-colors"
                />
                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !phone.trim()}
                  className="w-full py-4 rounded-3xl bg-[#c46a3e] text-white font-semibold text-base shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50 mt-1"
                >
                  {submitting ? 'Отправляем...' : 'Отправить →'}
                </button>
                <p className="text-[#4a3f35] text-xs text-center">
                  Нажимая кнопку, ты соглашаешься с тем, что мы свяжемся с тобой
                </p>
              </form>
            )}
          </>
        ) : (
          <div className="bg-[#1e4012] border border-[#2a5a1a] rounded-3xl px-5 py-6 text-center">
            <p className="text-2xl mb-3">✓</p>
            <p className="text-[#6ecf47] font-semibold text-base mb-2">Заявка принята</p>
            <p className="text-[#8b7b6f] text-sm leading-relaxed">
              Специалист свяжется с тобой в ближайшее время и согласует удобное время встречи
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
