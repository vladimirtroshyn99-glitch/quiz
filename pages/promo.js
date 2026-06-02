import Link from 'next/link';

const STEPS = [
  'Выбери сферу, где чувствуешь затык',
  'Опиши ситуацию своими словами',
  '10 персональных вопросов под тебя',
  'Получи разбор прямо на экране',
];

const BENEFITS = [
  {
    icon: '🔎',
    text: 'Увидишь сценарий рода, который работает именно у тебя. По деньгам, отношениям или самореализации',
  },
  {
    icon: '🔗',
    text: 'Поймёшь связь между тем, что происходит сейчас, и тем, что было в семье',
  },
  {
    icon: '🧭',
    text: 'Получишь конкретный вектор: что с этим можно сделать',
  },
];

export default function Promo() {
  return (
    <main className="min-h-screen bg-[#f9f5f0] flex flex-col items-center px-5 pt-12 pb-14">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center">

        {/* Шапка эксперта */}
        <div
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-3 shadow-md text-white font-bold text-xl"
          style={{ background: 'linear-gradient(145deg, #7C3069, #c46a3e)' }}
        >
          КМ
        </div>
        <h2 className="text-[17px] font-semibold text-[#2d2520] mb-1">Ксения Мосунова</h2>
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#c46a3e] mb-8">
          Психогенеалог
        </p>

        {/* Заголовок */}
        <h1 className="text-[26px] font-semibold text-[#2d2520] text-center leading-tight mb-3">
          Почему одно и то же повторяется{' '}
          <span className="text-[#c46a3e] italic">и что с этим делать</span>
        </h1>
        <p className="text-sm text-[#8b7b6f] text-center leading-relaxed mb-6">
          Разберём твою ситуацию через сценарии рода и найдём точку входа
        </p>

        {/* Теги */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {['4 шага', '5 минут', 'разбор сразу на экране'].map((tag) => (
            <span
              key={tag}
              className="px-4 py-1.5 rounded-full bg-[#fff9f4] border border-[#e8dcd0] text-[#8b7b6f] text-xs"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Блок "Как это работает" */}
        <div className="w-full bg-[#1a1410] rounded-3xl px-5 py-5 mb-4 shadow-sm">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#c46a3e] mb-4">
            Как это работает
          </p>
          <div className="flex flex-col gap-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-[22px] h-[22px] rounded-full bg-[#c46a3e] flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold">
                  {i + 1}
                </div>
                <p className="text-[#f5ede3] text-sm leading-snug">{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Блоки пользы */}
        <div className="w-full flex flex-col gap-3 mb-10">
          {BENEFITS.map((b, i) => (
            <div
              key={i}
              className="w-full bg-[#fff9f4] border border-[#e8dcd0] rounded-2xl px-4 py-4 flex items-start gap-3 shadow-sm"
            >
              <span className="text-xl flex-shrink-0 leading-none">{b.icon}</span>
              <p className="text-[#5a4a42] text-sm leading-relaxed">{b.text}</p>
            </div>
          ))}
        </div>

        {/* Нижний блок с кнопкой */}
        <p className="text-[17px] font-semibold text-[#2d2520] text-center leading-snug mb-4">
          Узнай, что тебя держит. И как это изменить
        </p>

        <Link
          href="/"
          className="w-full py-4 rounded-3xl bg-[#c46a3e] text-white font-semibold text-base text-center shadow-md shadow-[#dcc9ba] active:scale-[0.98] transition-transform block mb-3"
        >
          Получить разбор →
        </Link>

        <p className="text-[11px] text-[#8b7b6f] tracking-wide">
          Бесплатно · Без регистрации · 5 минут
        </p>

      </div>
    </main>
  );
}
