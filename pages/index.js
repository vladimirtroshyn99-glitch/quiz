import { useState, useEffect } from 'react';

// ─── Темы квиза ───────────────────────────────────────────────────────────────
const TOPICS = [
  { id: 'money',     label: 'Деньги',          emoji: '💰' },
  { id: 'relations', label: 'Отношения',        emoji: '🌸' },
  { id: 'self',      label: 'Самореализация',   emoji: '✨' },
  { id: 'health',    label: 'Здоровье',         emoji: '🌿' },
];

// ─── Определение Instagram/Facebook WebView ───────────────────────────────────
function detectInAppBrowser() {
  if (typeof navigator === 'undefined') return { isInApp: false, isAndroid: false, isIOS: false };
  const ua = navigator.userAgent || '';
  const isInstagram = /Instagram/i.test(ua);
  const isFacebook  = /FBAN|FBAV/i.test(ua);
  const isInApp     = isInstagram || isFacebook;
  const isAndroid   = /Android/i.test(ua);
  const isIOS       = /iPhone|iPad|iPod/i.test(ua);
  return { isInApp, isAndroid, isIOS };
}

// ─── Редирект на Android через Chrome intent ──────────────────────────────────
function redirectAndroidToChrome() {
  const url = window.location.href;
  const host = window.location.host;
  const path = window.location.pathname + window.location.search;
  window.location.href =
    'intent://' + host + path + '#Intent;scheme=https;package=com.android.chrome;end';
}

export default function Home() {
  const [selected, setSelected]     = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [browser, setBrowser]        = useState({ isInApp: false, isAndroid: false, isIOS: false });

  useEffect(() => {
    const detected = detectInAppBrowser();
    setBrowser(detected);

    if (detected.isInApp) {
      if (detected.isAndroid) {
        // Android — автоматический редирект в Chrome
        redirectAndroidToChrome();
      } else if (detected.isIOS) {
        // iOS — пробуем x-safari deeplink, если не сработает — показываем overlay
        const safariUrl = 'x-safari-' + window.location.href;
        window.location.href = safariUrl;
        // Если через 800мс страница всё ещё открыта — редирект не сработал, показываем оверлей
        const timer = setTimeout(() => setShowOverlay(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  function toggleTopic(id) {
    setSelected(prev => (prev === id ? null : id));
  }

  return (
    <>
      {/* ─── iOS overlay: открой в Safari ────────────────────────────────── */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
            <p className="text-3xl mb-3">🌐</p>
            <p className="font-semibold text-stone-800 text-lg mb-2">Откройте в Safari</p>
            <p className="text-stone-500 text-sm leading-relaxed mb-5">
              Для корректной работы квиза нажмите{' '}
              <span className="font-bold text-stone-700">•••</span> вверху экрана
              и выберите <span className="font-bold text-stone-700">«Открыть в браузере»</span>.
            </p>
            <button
              onClick={() => setShowOverlay(false)}
              className="w-full py-3 rounded-2xl bg-rose-50 text-rose-500 font-medium text-sm"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* ─── Banner: мягкое предупреждение (не Android и не iOS overlay) ─── */}
      {browser.isInApp && !browser.isAndroid && !showOverlay && (
        <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3">
          <p className="text-amber-800 text-xs text-center leading-snug">
            Для корректной работы квиза рекомендуем открыть в обычном браузере —
            нажмите <span className="font-semibold">•••</span> вверху и выберите «Открыть в браузере».
          </p>
        </div>
      )}

      {/* ─── Основной экран ───────────────────────────────────────────────── */}
      <main className="min-h-screen bg-[#fdf8f4] flex flex-col items-center px-5 pt-12 pb-10">

        {/* Логотип / декор */}
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-6 shadow-sm">
          <span className="text-3xl">🌷</span>
        </div>

        {/* Заголовок */}
        <h1 className="text-2xl font-semibold text-stone-700 text-center leading-snug mb-2">
          [Здесь будет приветствие эксперта-родолога]
        </h1>
        <p className="text-stone-400 text-sm text-center mb-10">
          Выберите тему, которая вас волнует сейчас
        </p>

        {/* Карточки-кнопки */}
        <div className="w-full max-w-sm flex flex-col gap-4">
          {TOPICS.map((topic) => {
            const isActive = selected === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => toggleTopic(topic.id)}
                className={[
                  'w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left transition-all duration-200 shadow-sm',
                  isActive
                    ? 'bg-rose-400 text-white shadow-rose-200 shadow-md scale-[1.02]'
                    : 'bg-white text-stone-600 hover:bg-rose-50 active:scale-[0.98]',
                ].join(' ')}
              >
                <span className="text-2xl">{topic.emoji}</span>
                <span className="text-lg font-medium">{topic.label}</span>
                {isActive && (
                  <span className="ml-auto text-white opacity-80 text-xl">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Кнопка «Далее» — появляется когда выбрана тема */}
        <div
          className={[
            'w-full max-w-sm mt-8 transition-all duration-300',
            selected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
          ].join(' ')}
        >
          <button
            onClick={() => alert(`Выбрана тема: ${TOPICS.find(t => t.id === selected)?.label}`)}
            className="w-full py-4 rounded-3xl bg-rose-400 text-white font-semibold text-lg shadow-md shadow-rose-200 active:scale-[0.98] transition-transform"
          >
            Далее →
          </button>
        </div>

      </main>
    </>
  );
}
