import { useState, useEffect, useRef } from 'react';

const TOPICS = [
  { id: 'money',     label: 'Деньги',         emoji: '💰' },
  { id: 'relations', label: 'Отношения',       emoji: '🌸' },
  { id: 'self',      label: 'Самореализация',  emoji: '✨' },
  { id: 'health',    label: 'Здоровье',        emoji: '🌿' },
];

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

function redirectAndroidToChrome() {
  const host = window.location.host;
  const path = window.location.pathname + window.location.search;
  window.location.href = 'intent://' + host + path + '#Intent;scheme=https;package=com.android.chrome;end';
}

export default function Home() {
  // ─── State ────────────────────────────────────────────────────────────────
  const [screen, setScreen]           = useState('start'); // 'start' | 'input' | 'result'
  const [topic, setTopic]             = useState(null);
  const [text, setText]               = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [browser, setBrowser]         = useState({ isInApp: false, isAndroid: false, isIOS: false });
  const recognitionRef                = useRef(null);
  const shouldRecordRef               = useRef(false);

  // ─── WebView detection ────────────────────────────────────────────────────
  useEffect(() => {
    const detected = detectInAppBrowser();
    setBrowser(detected);
    if (detected.isInApp) {
      if (detected.isAndroid) {
        redirectAndroidToChrome();
      } else if (detected.isIOS) {
        window.location.href = 'x-safari-' + window.location.href;
        const timer = setTimeout(() => setShowOverlay(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // ─── Навигация ────────────────────────────────────────────────────────────
  function selectTopic(id) {
    setTopic(id);
    setText('');
    setScreen('input');
  }

  function goBack() {
    stopRecording();
    setScreen('start');
  }

  function handleContinue() {
    console.log('Сфера:', TOPICS.find(t => t.id === topic)?.label, '| Запрос:', text);
    setScreen('result');
  }

  function goToStart() {
    setScreen('start');
    setTopic(null);
    setText('');
  }

  // ─── Голосовой ввод ───────────────────────────────────────────────────────
  function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Голосовой ввод не поддерживается в этом браузере. Попробуйте Chrome.');
      return;
    }

    shouldRecordRef.current = true;
    setIsRecording(true);

    function launch() {
      const recognition = new SpeechRecognition();
      recognition.lang           = 'ru-RU';
      recognition.continuous     = true;
      recognition.interimResults = false;

      recognition.onresult = (e) => {
        let chunk = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) chunk += e.results[i][0].transcript;
        }
        if (chunk) setText(prev => (prev ? prev + ' ' : '') + chunk.trim());
      };

      // onend срабатывает и при паузе, и при ручной остановке.
      // Если пользователь ещё не нажал «Стоп» — перезапускаем.
      recognition.onend = () => {
        if (shouldRecordRef.current) {
          setTimeout(() => { if (shouldRecordRef.current) launch(); }, 150);
        } else {
          setIsRecording(false);
        }
      };

      // 'aborted' — это мы сами вызвали .stop(), игнорируем.
      // 'no-speech' — тишина, onend перезапустит.
      // Остальные ошибки — реальная проблема, останавливаем.
      recognition.onerror = (e) => {
        if (e.error === 'aborted' || e.error === 'no-speech') return;
        shouldRecordRef.current = false;
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      try { recognition.start(); } catch (_) { /* already started */ }
    }

    launch();
  }

  function stopRecording() {
    shouldRecordRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  }

  // ─── Переиспользуемые блоки ───────────────────────────────────────────────
  const topicObj   = TOPICS.find(t => t.id === topic);
  const canContinue = text.trim().length > 0 && !isRecording;

  const IOSOverlay = showOverlay && (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
        <p className="text-3xl mb-3">🌐</p>
        <p className="font-semibold text-stone-800 text-lg mb-2">Откройте в Safari</p>
        <p className="text-stone-500 text-sm leading-relaxed mb-5">
          Для корректной работы нажмите{' '}
          <span className="font-bold text-stone-700">•••</span> вверху
          и выберите <span className="font-bold text-stone-700">«Открыть в браузере»</span>.
        </p>
        <button onClick={() => setShowOverlay(false)}
          className="w-full py-3 rounded-2xl bg-rose-50 text-rose-500 font-medium text-sm">
          Закрыть
        </button>
      </div>
    </div>
  );

  const InAppBanner = browser.isInApp && !browser.isAndroid && !showOverlay && (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3">
      <p className="text-amber-800 text-xs text-center leading-snug">
        Для корректной работы рекомендуем открыть в браузере —
        нажмите <span className="font-semibold">•••</span> вверху и выберите «Открыть в браузере».
      </p>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН 3 — Заглушка результата
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'result') return (
    <>
      {IOSOverlay}
      <main className="min-h-screen bg-[#fdf8f4] flex flex-col items-center justify-center px-5 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-6 shadow-sm">
          <span className="text-3xl">🌷</span>
        </div>
        <h2 className="text-2xl font-semibold text-stone-700 mb-3">Спасибо!</h2>
        <p className="text-stone-400 text-sm leading-relaxed max-w-xs mb-10">
          Данные приняты. Здесь скоро появится твой персональный разбор.
        </p>
        <button onClick={goToStart}
          className="px-8 py-3 rounded-2xl bg-white border border-stone-200 text-stone-500 font-medium text-sm shadow-sm active:scale-[0.98] transition-transform">
          ← В начало
        </button>
      </main>
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН 2 — Ввод запроса
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'input') return (
    <>
      {IOSOverlay}
      {InAppBanner}
      <main className="min-h-screen bg-[#fdf8f4] flex flex-col px-5 pt-8 pb-10">

        {/* Шапка: назад + индикатор сферы */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={goBack}
            className="text-stone-400 text-sm hover:text-stone-600 transition-colors">
            ← Назад
          </button>
          <div className="flex items-center gap-2 bg-white border border-rose-100 rounded-2xl px-3 py-1.5 shadow-sm">
            <span className="text-base">{topicObj?.emoji}</span>
            <span className="text-stone-600 text-sm font-medium">{topicObj?.label}</span>
          </div>
        </div>

        {/* Логотип */}
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-5 shadow-sm mx-auto">
          <span className="text-2xl">🌷</span>
        </div>

        {/* Инструкция */}
        <p className="text-stone-600 text-center text-sm leading-relaxed mb-6 max-w-sm mx-auto">
          Я помогу тебе разобраться. Чем подробнее ты опишешь, что сейчас происходит
          в этой сфере, тем точнее ИИ сможет подсветить родовые сценарии. Можешь
          набрать текст руками или просто надиктовать голосом.
        </p>

        {/* Поле ввода */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Опиши свою ситуацию..."
          className="w-full max-w-sm mx-auto rounded-3xl border border-stone-200 bg-white p-5 text-stone-700 text-sm leading-relaxed placeholder-stone-300 resize-none focus:outline-none focus:border-rose-200 shadow-sm min-h-[180px]"
        />

        {/* Кнопка микрофона */}
        <div className="flex justify-center mt-4 mb-8">
          {!isRecording ? (
            <button onClick={startRecording}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-stone-200 text-stone-500 text-sm font-medium shadow-sm hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-[0.97]">
              <span className="text-lg">🎙️</span>
              Надиктовать голосом
            </button>
          ) : (
            <button onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-stone-100 border border-stone-200 text-stone-500 text-sm font-medium shadow-sm active:scale-[0.97]">
              <span className="w-3 h-3 rounded-sm bg-stone-400 inline-block flex-shrink-0" />
              Остановить запись
              <span className="w-2 h-2 rounded-full bg-rose-300 animate-pulse inline-block flex-shrink-0" />
            </button>
          )}
        </div>

        {/* Кнопка Продолжить */}
        {/*
          canContinue = text.trim() > 0 AND NOT isRecording
          Логика блокировки:
          - пусто → disabled (нечего отправлять)
          - идёт запись → disabled (не прерывать диктовку на полуслове)
          - есть текст + запись остановлена → активна
        */}
        <div className="w-full max-w-sm mx-auto mt-auto">
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={[
              'w-full py-4 rounded-3xl font-semibold text-lg transition-all duration-200',
              canContinue
                ? 'bg-rose-400 text-white shadow-md shadow-rose-200 active:scale-[0.98]'
                : 'bg-stone-100 text-stone-300 cursor-not-allowed',
            ].join(' ')}
          >
            Продолжить →
          </button>
          {isRecording && (
            <p className="text-center text-xs text-stone-400 mt-2">
              Сначала остановите запись
            </p>
          )}
        </div>

      </main>
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН 1 — Стартовый
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <>
      {IOSOverlay}
      {InAppBanner}
      <main className="min-h-screen bg-[#fdf8f4] flex flex-col items-center px-5 pt-12 pb-10">

        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-6 shadow-sm">
          <span className="text-3xl">🌷</span>
        </div>

        <h1 className="text-2xl font-semibold text-stone-700 text-center leading-snug mb-2">
          [Здесь будет приветствие эксперта-родолога]
        </h1>
        <p className="text-stone-400 text-sm text-center mb-10">
          Выбери тему, которая тебя волнует сейчас
        </p>

        <div className="w-full max-w-sm flex flex-col gap-4">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTopic(t.id)}
              className={[
                'w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left transition-all duration-200 shadow-sm',
                topic === t.id
                  ? 'bg-rose-400 text-white shadow-rose-200 shadow-md scale-[1.02]'
                  : 'bg-white text-stone-600 hover:bg-rose-50 active:scale-[0.98]',
              ].join(' ')}
            >
              <span className="text-2xl">{t.emoji}</span>
              <span className="text-lg font-medium">{t.label}</span>
              {topic === t.id && <span className="ml-auto text-white opacity-80 text-xl">✓</span>}
            </button>
          ))}
        </div>

      </main>
    </>
  );
}
