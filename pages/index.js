import { useState, useEffect, useRef } from 'react';

const TOPICS = [
  { id: 'money',     label: 'Деньги',         emoji: '💰' },
  { id: 'relations', label: 'Отношения',       emoji: '🌸' },
  { id: 'self',      label: 'Самореализация',  emoji: '✨' },
  { id: 'health',    label: 'Здоровье',        emoji: '🌿' },
];

// Сообщения для двух разных лоадеров
const SCREEN_MESSAGES = {
  loading: [
    'Изучаю твой запрос...',
    'Сверяюсь с паттернами рода...',
    'Ищу нити твоей истории...',
    'Готовлю вопросы для тебя...',
  ],
  analyzing: [
    'Анализирую твои ответы...',
    'Сопоставляю с родовыми сценариями...',
    'Формирую карту точек А и Б...',
    'Уже почти готово...',
  ],
};

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
  // ─── State ────────────────────────────────────────────────────────────────
  // screens: 'start' | 'input' | 'loading' | 'clarification' | 'quiz' | 'analyzing'
  const [screen, setScreen]                       = useState('start');
  const [topic, setTopic]                         = useState(null);
  const [text, setText]                           = useState('');
  const [clarificationText, setClarificationText] = useState('');
  const [aiQuestion, setAiQuestion]               = useState('');
  const [quizData, setQuizData]                   = useState([]);
  const [quizIndex, setQuizIndex]                 = useState(0);
  const [answers, setAnswers]                     = useState([]);
  const [selectedAnswer, setSelectedAnswer]       = useState(null); // индекс варианта, ожидающего авто-перехода
  const [displayMsg, setDisplayMsg]               = useState('');
  const [showReturnLink, setShowReturnLink]       = useState(false);
  const [isRecording, setIsRecording]             = useState(false);
  const [isTranscribing, setIsTranscribing]       = useState(false);
  const [showOverlay, setShowOverlay]             = useState(false);
  const [browser, setBrowser]                     = useState({ isInApp: false, isAndroid: false, isIOS: false });
  const mediaRecorderRef                          = useRef(null);
  const chunksRef                                 = useRef([]);

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

  // ─── Цикличные сообщения на экранах загрузки/анализа ─────────────────────
  useEffect(() => {
    const msgs = SCREEN_MESSAGES[screen];
    if (!msgs) return;
    setDisplayMsg(msgs[0]);
    let i = 0;
    const iv = setInterval(() => {
      i = (i + 1) % msgs.length;
      setDisplayMsg(msgs[i]);
    }, 2800);
    return () => clearInterval(iv);
  }, [screen]);

  // ─── Кнопка «В начало» на экране анализа появляется через 10 сек ─────────
  useEffect(() => {
    if (screen !== 'analyzing') { setShowReturnLink(false); return; }
    const timer = setTimeout(() => setShowReturnLink(true), 10000);
    return () => clearTimeout(timer);
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
    if (screen === 'clarification') setScreen('input');
    else setScreen('start');
  }

  function goToStart() {
    stopRecording();
    setScreen('start');
    setTopic(null);
    setText('');
    setClarificationText('');
    setAiQuestion('');
    setQuizData([]);
    setQuizIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
  }

  // ─── Логика теста ─────────────────────────────────────────────────────────
  function selectAnswer(optionIndex) {
    if (selectedAnswer !== null) return; // защита от двойного тапа
    setSelectedAnswer(optionIndex);

    setTimeout(() => {
      const question  = quizData[quizIndex];
      const newAnswer = {
        questionId:     question.id,
        question:       question.question,
        selectedOption: question.options[optionIndex],
      };
      const newAnswers = [...answers, newAnswer];
      setAnswers(newAnswers);
      setSelectedAnswer(null);

      if (quizIndex < quizData.length - 1) {
        setQuizIndex(prev => prev + 1);
      } else {
        // Последний вопрос — идём на экран анализа (Этап 5 сделает здесь API-запрос)
        console.log('Ответы:', newAnswers);
        setScreen('analyzing');
      }
    }, 380);
  }

  function goToPrevQuestion() {
    if (quizIndex === 0 || selectedAnswer !== null) return;
    setAnswers(prev => prev.slice(0, -1));
    setQuizIndex(prev => prev - 1);
  }

  // ─── Вызов Claude для анализа запроса ────────────────────────────────────
  async function callAnalyze(payload) {
    setDisplayMsg(SCREEN_MESSAGES.loading[0]);
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
        setQuizIndex(0);
        setAnswers([]);
        setScreen('quiz');
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

  // ─── Голосовой ввод ───────────────────────────────────────────────────────
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

  // ─── Переиспользуемые блоки ───────────────────────────────────────────────
  const topicObj = TOPICS.find(t => t.id === topic);

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

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН ЗАГРУЗКИ (анализ запроса перед тестом)
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'loading') return (
    <main className="min-h-screen bg-[#fdf8f4] flex flex-col items-center justify-center px-5 text-center">
      <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mb-8 shadow-sm animate-pulse">
        <span className="text-4xl">🌷</span>
      </div>
      <p className="text-xl font-medium text-stone-600 mb-2">{displayMsg}</p>
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
            <button onClick={handleClarificationAnswer} disabled={!canAnswer}
              className={[
                'w-full py-4 rounded-3xl font-semibold text-lg transition-all duration-200',
                canAnswer
                  ? 'bg-rose-400 text-white shadow-md shadow-rose-200 active:scale-[0.98]'
                  : 'bg-stone-100 text-stone-300 cursor-not-allowed',
              ].join(' ')}>
              Ответить →
            </button>
            {(isRecording || isTranscribing) && (
              <p className="text-center text-xs text-stone-400 mt-2">
                {isRecording ? 'Остановите запись перед ответом' : 'Подождите, идёт распознавание...'}
              </p>
            )}
          </div>

        </main>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН ТЕСТА — пошаговый
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'quiz') {
    const question    = quizData[quizIndex];
    const total       = quizData.length;
    const progressPct = (quizIndex / total) * 100;

    return (
      <>
        {IOSOverlay}
        <main className="min-h-screen bg-[#fdf8f4] flex flex-col px-5 pt-8 pb-10">

          {/* Шапка: назад + счётчик */}
          <div className="flex items-center justify-between mb-4">
            {quizIndex > 0 ? (
              <button onClick={goToPrevQuestion}
                className="text-stone-400 text-sm hover:text-stone-600 transition-colors">
                ← Назад
              </button>
            ) : (
              <div className="w-10" /> /* спейсер для выравнивания */
            )}
            <span className="text-stone-400 text-sm">
              Вопрос <span className="font-medium text-stone-600">{quizIndex + 1}</span> из {total}
            </span>
            <div className="w-10" /> {/* спейсер */}
          </div>

          {/* Прогресс-бар */}
          <div className="w-full h-1.5 bg-stone-100 rounded-full mb-8">
            <div
              className="h-full bg-rose-300 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Текст вопроса */}
          <h2 className="text-xl font-semibold text-stone-700 leading-snug mb-8 max-w-sm mx-auto">
            {question.question}
          </h2>

          {/* Варианты ответов */}
          <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
            {question.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  disabled={selectedAnswer !== null}
                  className={[
                    'w-full px-5 py-4 rounded-3xl text-left text-sm leading-snug transition-all duration-200 shadow-sm',
                    isSelected
                      ? 'bg-rose-400 text-white shadow-rose-200 shadow-md scale-[1.01]'
                      : 'bg-white text-stone-600 hover:bg-rose-50 active:scale-[0.98]',
                    selectedAnswer !== null && !isSelected ? 'opacity-50' : '',
                  ].join(' ')}
                >
                  {option}
                </button>
              );
            })}
          </div>

        </main>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН АНАЛИЗА ОТВЕТОВ (лоадер перед результатами)
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'analyzing') return (
    <main className="min-h-screen bg-[#fdf8f4] flex flex-col items-center justify-center px-5 text-center">
      {/* Пульсирующая иконка */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-rose-100 flex items-center justify-center shadow-sm">
          <span className="text-5xl">🌷</span>
        </div>
        {/* Кольца-пульс */}
        <div className="absolute inset-0 rounded-full border-2 border-rose-200 animate-ping opacity-40" />
        <div className="absolute inset-[-8px] rounded-full border border-rose-100 animate-ping opacity-20"
          style={{ animationDelay: '400ms' }} />
      </div>

      <p className="text-xl font-medium text-stone-600 mb-2">{displayMsg}</p>
      <p className="text-stone-400 text-sm mb-10">
        Твой персональный разбор формируется...
      </p>

      <div className="flex gap-2 mb-10">
        <span className="w-2 h-2 rounded-full bg-rose-200 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-rose-200 animate-bounce" style={{ animationDelay: '180ms' }} />
        <span className="w-2 h-2 rounded-full bg-rose-200 animate-bounce" style={{ animationDelay: '360ms' }} />
      </div>

      {/* Ссылка «В начало» появляется через 10 сек — на случай если что-то зависнет */}
      {showReturnLink && (
        <button onClick={goToStart}
          className="text-stone-300 text-xs underline underline-offset-2">
          В начало
        </button>
      )}
    </main>
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
            <button onClick={handleContinue} disabled={!canContinue}
              className={[
                'w-full py-4 rounded-3xl font-semibold text-lg transition-all duration-200',
                canContinue
                  ? 'bg-rose-400 text-white shadow-md shadow-rose-200 active:scale-[0.98]'
                  : 'bg-stone-100 text-stone-300 cursor-not-allowed',
              ].join(' ')}>
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
            <button key={t.id} onClick={() => selectTopic(t.id)}
              className={[
                'w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left transition-all duration-200 shadow-sm',
                topic === t.id
                  ? 'bg-rose-400 text-white shadow-rose-200 shadow-md scale-[1.02]'
                  : 'bg-white text-stone-600 hover:bg-rose-50 active:scale-[0.98]',
              ].join(' ')}>
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
