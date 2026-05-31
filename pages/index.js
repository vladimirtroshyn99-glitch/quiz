import { useState, useEffect, useRef } from 'react';

const TOPICS = [
  { id: 'money',     label: 'Деньги',         emoji: '💰' },
  { id: 'relations', label: 'Отношения',       emoji: '🌸' },
  { id: 'self',      label: 'Самореализация',  emoji: '✨' },
  { id: 'health',    label: 'Здоровье',        emoji: '🌿' },
];

const LOADING_MSGS = [
  'Изучаю твой запрос...',
  'Сверяюсь с паттернами рода...',
  'Ищу нити твоей истории...',
  'Готовлю вопросы для тебя...',
];

function detectInAppBrowser() {
  if (typeof navigator === 'undefined') return { isInApp: false, isAndroid: false, isIOS: false };
  const ua = navigator.userAgent || '';
  const isInApp   = /Instagram/i.test(ua) || /FBAN|FBAV/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isIOS     = /iPhone|iPad|iPod/i.test(ua);
  return { isInApp, isAndroid, isIOS };
}

function redirectAndroidToChrome() {
  const host = window.location.host;
  const path = window.location.pathname + window.location.search;
  window.location.href = 'intent://' + host + path + '#Intent;scheme=https;package=com.android.chrome;end';
}

export default function Home() {
  // ─── State ────────────────────────────────────────────────────────────��───
  // screens: 'start' | 'input' | 'loading' | 'clarification' | 'quiz_preview'
  const [screen, setScreen]                   = useState('start');
  const [topic, setTopic]                     = useState(null);
  const [text, setText]                       = useState('');
  const [clarificationText, setClarificationText] = useState('');
  const [aiQuestion, setAiQuestion]           = useState('');
  const [quizData, setQuizData]               = useState([]);
  const [loadingMsg, setLoadingMsg]           = useState(LOADING_MSGS[0]);
  const [isRecording, setIsRecording]         = useState(false);
  const [isTranscribing, setIsTranscribing]   = useState(false);
  const [showOverlay, setShowOverlay]         = useState(false);
  const [browser, setBrowser]                 = useState({ isInApp: false, isAndroid: false, isIOS: false });
  const mediaRecorderRef                      = useRef(null);
  const chunksRef                             = useRef([]);

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

  // ─── Цикличные сообщения на экране загрузки ───────────────────────────────
  useEffect(() => {
    if (screen !== 'loading') return;
    let i = 0;
    const iv = setInterval(() => {
      i = (i + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[i]);
    }, 2200);
    return () => clearInterval(iv);
  }, [screen]);

  // ─── Навигация ────────────────────────────────────────────────────────────
  function selectTopic(id) {
    setTopic(id);
    setText('');
    setScreen('input');
  }

  function goBack() {
    stopRecording();
    setIsTranscribing(false);
    if (screen === 'clarification') {
      setScreen('input');
    } else {
      setScreen('start');
    }
  }

  function goToStart() {
    stopRecording();
    setScreen('start');
    setTopic(null);
    setText('');
    setClarificationText('');
    setAiQuestion('');
    setQuizData([]);
  }

  // ─── Вызов Claude для анализа ─────────────────────────────────────────────
  async function callAnalyze(payload) {
    setLoadingMsg(LOADING_MSGS[0]);
    setScreen('loading');
    try {
      const res  = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.status === 'need_clarification') {
        setAiQuestion(data.ai_question);
        setClarificationText('');
        setScreen('clarification');
      } else if (data.status === 'ready_for_quiz') {
        setQuizData(data.quiz_data);
        setScreen('quiz_preview');
      }
    } catch (err) {
      alert(err.message || 'Что-то пошло не так. Попробуй ещё раз.');
      setScreen('input');
    }
  }

  function handleContinue() {
    const t = TOPICS.find(t => t.id === topic);
    callAnalyze({ sphere: t.label, query: text });
  }

  function handleClarificationAnswer() {
    const t = TOPICS.find(t => t.id === topic);
    callAnalyze({ sphere: t.label, query: text, clarification: clarificationText });
  }

  // ─── Голосовой ввод (MediaRecorder → Whisper) ─────────────────────────────
  async function startRecording(setter) {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await transcribeBlob(blob, mimeType, setter);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      alert('Не удалось получить доступ к микрофону. Проверь разрешения в браузере.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  async function transcribeBlob(blob, mimeType, setter) {
    setIsTranscribing(true);
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
      const res  = await fetch('/api/transcribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ audio: base64, mimeType }),
      });
      const data = await res.json();
      if (data.text) setter(prev => (prev ? prev + ' ' : '') + data.text.trim());
      if (data.error) alert(data.error);
    } catch {
      alert('Ошибка отправки аудио. Проверь соединение.');
    } finally {
      setIsTranscribing(false);
    }
  }

  // ─── Переиспользуемые элементы ────────────────────────────────────────────
  const topicObj = TOPICS.find(t => t.id === topic);

  // Кнопка микрофона — принимает setter (куда писать текст) и флаг активности кнопки Далее
  function MicRow({ setter }) {
    return (
      <div className="flex justify-center mt-4 mb-6">
        {isTranscribing ? (
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-400 text-sm">
            <span className="w-2 h-2 rounded-full bg-rose-300 animate-pulse inline-block" />
            Распознаём...
          </div>
        ) : !isRecording ? (
          <button onClick={() => startRecording(setter)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-stone-200 text-stone-500 text-sm font-medium shadow-sm hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-[0.97]">
            <span className="text-lg">🎙️</span>
            Надиктовать голосом
          </button>
        ) : (
          <button onClick={stopRecording}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-stone-100 border border-stone-200 text-stone-500 text-sm font-medium shadow-sm active:scale-[0.97]">
            <span className="w-3 h-3 rounded-sm bg-stone-400 inline-block flex-shrink-0" />
            Остановить и распознать
            <span className="w-2 h-2 rounded-full bg-rose-300 animate-pulse inline-block flex-shrink-0" />
          </button>
        )}
      </div>
    );
  }

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
        Рекомендуем открыть в браузере —
        нажмите <span className="font-semibold">•••</span> вверху и выберите «Открыть в браузере».
      </p>
    </div>
  );

  // ═════════════════════════���════════════════════════════════════════════════
  // ЭКРАН ЗАГРУЗКИ
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'loading') return (
    <main className="min-h-screen bg-[#fdf8f4] flex flex-col items-center justify-center px-5 text-center">
      <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mb-8 shadow-sm animate-pulse">
        <span className="text-4xl">🌷</span>
      </div>
      <p className="text-xl font-medium text-stone-600 mb-2 transition-all duration-500">
        {loadingMsg}
      </p>
      <p className="text-stone-400 text-sm mb-8">Это займёт несколько секунд</p>
      <div className="flex gap-2">
        <span className="w-2 h-2 rounded-full bg-rose-200 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-rose-200 animate-bounce" style={{ animationDelay: '180ms' }} />
        <span className="w-2 h-2 rounded-full bg-rose-200 animate-bounce" style={{ animationDelay: '360ms' }} />
      </div>
    </main>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН УТОЧНЕНИЯ
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'clarification') {
    const canAnswer = clarificationText.trim().length > 0 && !isRecording && !isTranscribing;
    return (
      <>
        {IOSOverlay}
        {InAppBanner}
        <main className="min-h-screen bg-[#fdf8f4] flex flex-col px-5 pt-8 pb-10">

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

          {/* Карточка с вопросом от ИИ */}
          <div className="w-full max-w-sm mx-auto bg-white rounded-3xl p-5 shadow-sm border border-rose-50 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🌷</span>
              <p className="text-stone-600 text-sm leading-relaxed">{aiQuestion}</p>
            </div>
          </div>

          <textarea
            value={clarificationText}
            onChange={e => setClarificationText(e.target.value)}
            placeholder="Напиши свой ответ..."
            className="w-full max-w-sm mx-auto rounded-3xl border border-stone-200 bg-white p-5 text-stone-700 text-sm leading-relaxed placeholder-stone-300 resize-none focus:outline-none focus:border-rose-200 shadow-sm min-h-[160px]"
          />

          <MicRow setter={setClarificationText} />

          <div className="w-full max-w-sm mx-auto mt-auto">
            <button
              onClick={handleClarificationAnswer}
              disabled={!canAnswer}
              className={[
                'w-full py-4 rounded-3xl font-semibold text-lg transition-all duration-200',
                canAnswer
                  ? 'bg-rose-400 text-white shadow-md shadow-rose-200 active:scale-[0.98]'
                  : 'bg-stone-100 text-stone-300 cursor-not-allowed',
              ].join(' ')}
            >
              Ответить →
            </button>
            {isRecording && (
              <p className="text-center text-xs text-stone-400 mt-2">Остановите запись перед ответом</p>
            )}
            {isTranscribing && (
              <p className="text-center text-xs text-stone-400 mt-2">Подождите, идёт распознавание...</p>
            )}
          </div>

        </main>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН ПРЕВЬЮ ТЕСТА
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'quiz_preview') return (
    <>
      {IOSOverlay}
      <main className="min-h-screen bg-[#fdf8f4] flex flex-col px-5 pt-8 pb-10">

        <div className="flex items-center justify-between mb-6">
          <button onClick={goToStart}
            className="text-stone-400 text-sm hover:text-stone-600 transition-colors">
            ← В начало
          </button>
          <div className="flex items-center gap-2 bg-white border border-rose-100 rounded-2xl px-3 py-1.5 shadow-sm">
            <span className="text-base">{topicObj?.emoji}</span>
            <span className="text-stone-600 text-sm font-medium">{topicObj?.label}</span>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto mb-6 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <span className="text-2xl">✨</span>
          </div>
          <h2 className="text-lg font-semibold text-stone-700">Твой персональный тест готов</h2>
          <p className="text-stone-400 text-xs mt-1">Предпросмотр вопросов — интерактивный тест будет на следующем этапе</p>
        </div>

        <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
          {quizData.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
              <p className="text-stone-700 text-sm font-medium mb-3 leading-snug">
                <span className="text-rose-300 font-bold mr-1">{idx + 1}.</span>
                {q.question}
              </p>
              <ul className="flex flex-col gap-2">
                {q.options.map((opt, i) => (
                  <li key={i}
                    className="text-stone-500 text-xs leading-snug bg-stone-50 rounded-2xl px-4 py-2 border border-stone-100">
                    {opt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="w-full max-w-sm mx-auto mt-8">
          <button onClick={goToStart}
            className="w-full py-4 rounded-3xl bg-white border border-stone-200 text-stone-500 font-medium text-sm shadow-sm active:scale-[0.98] transition-transform">
            ← В начало
          </button>
        </div>

      </main>
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН ВВОДА ЗАПРОСА
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'input') {
    const canContinue = text.trim().length > 0 && !isRecording && !isTranscribing;
    return (
      <>
        {IOSOverlay}
        {InAppBanner}
        <main className="min-h-screen bg-[#fdf8f4] flex flex-col px-5 pt-8 pb-10">

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

          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-5 shadow-sm mx-auto">
            <span className="text-2xl">🌷</span>
          </div>

          <p className="text-stone-600 text-center text-sm leading-relaxed mb-6 max-w-sm mx-auto">
            Я помогу тебе разобраться. Чем подробнее ты опишешь, что сейчас происходит
            в этой сфере, тем точнее ИИ сможет подсветить родовые сценарии. Можешь
            набрать текст руками или просто надиктовать голосом.
          </p>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Опиши свою ситуацию..."
            className="w-full max-w-sm mx-auto rounded-3xl border border-stone-200 bg-white p-5 text-stone-700 text-sm leading-relaxed placeholder-stone-300 resize-none focus:outline-none focus:border-rose-200 shadow-sm min-h-[180px]"
          />

          <MicRow setter={setText} />

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
            {(isRecording || isTranscribing) && (
              <p className="text-center text-xs text-stone-400 mt-2">
                {isRecording ? 'Остановите запись перед продолжением' : 'Подождите, идёт распознавание...'}
              </p>
            )}
          </div>

        </main>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН СТАРТА
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
