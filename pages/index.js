import { useState, useEffect, useRef } from 'react';

const TOPICS = [
  { id: 'money',     label: 'Деньги',         emoji: '💰' },
  { id: 'relations', label: 'Отношения',       emoji: '🌸' },
  { id: 'self',      label: 'Самореализация',  emoji: '✨' },
  { id: 'health',    label: 'Здоровье',        emoji: '🌿' },
];

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
  // screens: 'start'|'input'|'loading'|'clarification'|'quiz'|'analyzing'|'result'|'chat'
  const [screen, setScreen]                       = useState('start');
  const [topic, setTopic]                         = useState(null);
  const [text, setText]                           = useState('');
  const [clarificationText, setClarificationText] = useState('');
  const [aiQuestion, setAiQuestion]               = useState('');
  const [quizData, setQuizData]                   = useState([]);
  const [quizIndex, setQuizIndex]                 = useState(0);
  const [answers, setAnswers]                     = useState([]);
  const [selectedAnswer, setSelectedAnswer]       = useState(null);
  const [resultData, setResultData]               = useState(null);
  const [resultPayload, setResultPayload]         = useState(null);
  const [analyzeError, setAnalyzeError]           = useState(null);
  const [chartsVisible, setChartsVisible]         = useState(false);
  const [displayMsg, setDisplayMsg]               = useState('');
  const [showReturnLink, setShowReturnLink]       = useState(false);
  const [isRecording, setIsRecording]             = useState(false);
  const [isTranscribing, setIsTranscribing]       = useState(false);
  const [showOverlay, setShowOverlay]             = useState(false);
  const [browser, setBrowser]                     = useState({ isInApp: false, isAndroid: false, isIOS: false });
  const [chatHistory, setChatHistory]             = useState([]);
  const [chatInput, setChatInput]                 = useState('');
  const [questionCount, setQuestionCount]         = useState(0);
  const [isChatLoading, setIsChatLoading]         = useState(false);
  const mediaRecorderRef                          = useRef(null);
  const chunksRef                                 = useRef([]);
  const messagesEndRef                            = useRef(null);

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

  // ─── Цикличные сообщения на лоадерах ─────────────────────────────────────
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

  // ─── Страховочная кнопка на экране анализа ────────────────────────────────
  useEffect(() => {
    if (screen !== 'analyzing') { setShowReturnLink(false); return; }
    const timer = setTimeout(() => setShowReturnLink(true), 12000);
    return () => clearTimeout(timer);
  }, [screen]);

  // ─── Анимация графиков при показе экрана результатов ─────────────────────
  useEffect(() => {
    if (screen !== 'result') { setChartsVisible(false); return; }
    const timer = setTimeout(() => setChartsVisible(true), 300);
    return () => clearTimeout(timer);
  }, [screen]);

  // ─── Авто-скролл в чате ───────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'chat') return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading, screen]);

  // ─── Открытие чата: загружаем приветственное сообщение ───────────────────
  useEffect(() => {
    if (screen !== 'chat' || chatHistory.length > 0) return;
    const topicLabel = TOPICS.find(t => t.id === topic)?.label;
    const ctx = { sphere: topicLabel, query: text, ...resultData };
    setIsChatLoading(true);
    fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ history: [], context: ctx }),
    })
      .then(r => r.json())
      .then(d => setChatHistory([{ role: 'assistant', content: d.reply || 'Привет! О чём хотелось бы поговорить?' }]))
      .catch(() => setChatHistory([{ role: 'assistant', content: 'Привет! О чём хотелось бы поговорить?' }]))
      .finally(() => setIsChatLoading(false));
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setResultData(null);
    setResultPayload(null);
    setAnalyzeError(null);
    setChatHistory([]);
    setChatInput('');
    setQuestionCount(0);
    setIsChatLoading(false);
  }

  // ─── Логика теста ─────────────────────────────────────────────────────────
  function selectAnswer(optionIndex) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIndex);

    setTimeout(() => {
      const question   = quizData[quizIndex];
      const newAnswer  = {
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
        const topicObj = TOPICS.find(t => t.id === topic);
        const payload  = {
          sphere:        topicObj.label,
          query:         text,
          clarification: clarificationText,
          answers:       newAnswers,
        };
        setResultPayload(payload);
        setAnalyzeError(null);
        setScreen('analyzing');
        startResultGeneration(payload);
      }
    }, 380);
  }

  function goToPrevQuestion() {
    if (quizIndex === 0 || selectedAnswer !== null) return;
    setAnswers(prev => prev.slice(0, -1));
    setQuizIndex(prev => prev - 1);
  }

  // ─── Claude: анализ запроса → квиз ───────────────────────────────────────
  async function callAnalyze(payload) {
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

  // ─── Claude: генерация разбора результатов ────────────────────────────────
  async function startResultGeneration(payload) {
    try {
      const res  = await fetch('/api/result', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResultData(data);
      setScreen('result');
    } catch (err) {
      setAnalyzeError(err.message || 'Не удалось получить разбор. Попробуй ещё раз.');
    }
  }

  // ─── Чат: отправка сообщения ──────────────────────────────────────────────
  async function sendChatMessage() {
    if (!chatInput.trim() || isChatLoading || questionCount >= 3) return;
    const newCount = questionCount + 1;
    const userMsg  = { role: 'user', content: chatInput.trim() };
    const newHist  = [...chatHistory, userMsg];
    setChatHistory(newHist);
    setChatInput('');
    setQuestionCount(newCount);
    setIsChatLoading(true);
    try {
      const topicLabel = TOPICS.find(t => t.id === topic)?.label;
      const ctx = { sphere: topicLabel, query: text, ...resultData };
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ history: newHist, context: ctx, isLast: newCount >= 3 }),
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: data.reply || 'Что-то пошло не так. Попробуй ещё раз.',
      }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Ошибка соединения. Попробуй ещё раз.' }]);
    } finally {
      setIsChatLoading(false);
    }
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
  // ЛОАДЕР — анализ запроса
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
            <button onClick={goBack} className="text-stone-400 text-sm hover:text-stone-600 transition-colors">
              ← Назад
            </button>
            <div className="flex items-center gap-2 bg-white border border-rose-100 rounded-2xl px-3 py-1.5 shadow-sm">
              <span>{topicObj?.emoji}</span>
              <span className="text-stone-600 text-sm font-medium">{topicObj?.label}</span>
            </div>
          </div>

          <div className="w-full max-w-sm mx-auto bg-white rounded-3xl p-5 shadow-sm border border-rose-50 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🌷</span>
              <p className="text-stone-600 text-sm leading-relaxed">{aiQuestion}</p>
            </div>
          </div>

          <textarea value={clarificationText} onChange={e => setClarificationText(e.target.value)}
            placeholder="Напиши свой ответ..."
            className="w-full max-w-sm mx-auto rounded-3xl border border-stone-200 bg-white p-5 text-stone-700 text-sm leading-relaxed placeholder-stone-300 resize-none focus:outline-none focus:border-rose-200 shadow-sm min-h-[160px]" />

          <MicRow setter={setClarificationText} />

          <div className="w-full max-w-sm mx-auto mt-auto">
            <button onClick={handleClarificationAnswer} disabled={!canAnswer}
              className={['w-full py-4 rounded-3xl font-semibold text-lg transition-all duration-200',
                canAnswer ? 'bg-rose-400 text-white shadow-md shadow-rose-200 active:scale-[0.98]'
                          : 'bg-stone-100 text-stone-300 cursor-not-allowed'].join(' ')}>
              Ответить →
            </button>
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
          <div className="flex items-center justify-between mb-4">
            {quizIndex > 0
              ? <button onClick={goToPrevQuestion} className="text-stone-400 text-sm hover:text-stone-600 transition-colors">← Назад</button>
              : <div className="w-10" />}
            <span className="text-stone-400 text-sm">
              Вопрос <span className="font-medium text-stone-600">{quizIndex + 1}</span> из {total}
            </span>
            <div className="w-10" />
          </div>

          <div className="w-full h-1.5 bg-stone-100 rounded-full mb-8">
            <div className="h-full bg-rose-300 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }} />
          </div>

          <h2 className="text-xl font-semibold text-stone-700 leading-snug mb-8 max-w-sm mx-auto">
            {question.question}
          </h2>

          <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
            {question.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              return (
                <button key={idx} onClick={() => selectAnswer(idx)}
                  disabled={selectedAnswer !== null}
                  className={['w-full px-5 py-4 rounded-3xl text-left text-sm leading-snug transition-all duration-200 shadow-sm',
                    isSelected
                      ? 'bg-rose-400 text-white shadow-rose-200 shadow-md scale-[1.01]'
                      : 'bg-white text-stone-600 hover:bg-rose-50 active:scale-[0.98]',
                    selectedAnswer !== null && !isSelected ? 'opacity-40' : '',
                  ].join(' ')}>
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
  // ЛОАДЕР — анализ ответов (с обработкой ошибок)
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'analyzing') {
    if (analyzeError) return (
      <main className="min-h-screen bg-[#fdf8f4] flex flex-col items-center justify-center px-5 text-center">
        <span className="text-5xl mb-5">🌿</span>
        <p className="text-stone-700 font-semibold text-lg mb-2">Что-то пошло не так</p>
        <p className="text-stone-400 text-sm leading-relaxed max-w-xs mb-8">{analyzeError}</p>
        <button onClick={() => { setAnalyzeError(null); startResultGeneration(resultPayload); }}
          className="w-full max-w-xs py-4 rounded-3xl bg-rose-400 text-white font-semibold shadow-md shadow-rose-200 mb-4">
          Попробовать снова
        </button>
        <button onClick={goToStart} className="text-stone-400 text-sm">
          ← В начало
        </button>
      </main>
    );

    return (
      <main className="min-h-screen bg-[#fdf8f4] flex flex-col items-center justify-center px-5 text-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full bg-rose-100 flex items-center justify-center shadow-sm">
            <span className="text-5xl">🌷</span>
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-rose-200 animate-ping opacity-40" />
          <div className="absolute inset-[-8px] rounded-full border border-rose-100 animate-ping opacity-20"
            style={{ animationDelay: '400ms' }} />
        </div>
        <p className="text-xl font-medium text-stone-600 mb-2">{displayMsg}</p>
        <p className="text-stone-400 text-sm mb-10">Твой персональный разбор формируется...</p>
        <div className="flex gap-2 mb-10">
          <span className="w-2 h-2 rounded-full bg-rose-200 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-rose-200 animate-bounce" style={{ animationDelay: '180ms' }} />
          <span className="w-2 h-2 rounded-full bg-rose-200 animate-bounce" style={{ animationDelay: '360ms' }} />
        </div>
        {showReturnLink && (
          <button onClick={goToStart} className="text-stone-300 text-xs underline underline-offset-2">
            В начало
          </button>
        )}
      </main>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН РЕЗУЛЬТАТОВ
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'result' && resultData) {
    const { summary, pointA, pointB, ancestral_block, charts } = resultData;

    function ChartBar({ label, value, colorFrom, colorTo }) {
      return (
        <div className="mb-5">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-stone-600 text-sm">{label}</span>
            <span className="text-stone-400 text-sm font-medium">{value}%</span>
          </div>
          <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${colorFrom} ${colorTo} rounded-full transition-all duration-1000 ease-out`}
              style={{ width: chartsVisible ? `${value}%` : '0%' }}
            />
          </div>
        </div>
      );
    }

    return (
      <>
        {IOSOverlay}
        <main className="min-h-screen bg-[#fdf8f4] pb-12">

          {/* Шапка */}
          <div className="px-5 pt-8 flex items-center justify-between mb-8">
            <button onClick={goToStart} className="text-stone-400 text-sm hover:text-stone-600 transition-colors">
              ← В начало
            </button>
            <div className="flex items-center gap-2 bg-white border border-rose-100 rounded-2xl px-3 py-1.5 shadow-sm">
              <span>{topicObj?.emoji}</span>
              <span className="text-stone-600 text-sm font-medium">{topicObj?.label}</span>
            </div>
          </div>

          {/* Вводный блок */}
          <div className="px-5 mb-8 max-w-sm mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-xl">🌷</span>
              </div>
              <h2 className="text-lg font-semibold text-stone-700">Твой разбор готов</h2>
            </div>
            <p className="text-stone-500 text-sm leading-relaxed">{summary}</p>
          </div>

          <div className="px-5 max-w-sm mx-auto flex flex-col gap-4 mb-8">
            {/* Точка А */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">📍</span>
                <h3 className="text-stone-700 font-semibold text-sm">Точка А — Сейчас</h3>
              </div>
              <p className="text-stone-500 text-sm leading-relaxed">{pointA}</p>
            </div>

            {/* Точка Б */}
            <div className="bg-gradient-to-br from-rose-50 to-white rounded-3xl p-5 shadow-sm border border-rose-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">✨</span>
                <h3 className="text-rose-500 font-semibold text-sm">Точка Б — Потенциал</h3>
              </div>
              <p className="text-stone-500 text-sm leading-relaxed">{pointB}</p>
            </div>

            {/* Родовой блок */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-violet-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🔗</span>
                <h3 className="text-violet-500 font-semibold text-sm">Родовой сценарий</h3>
              </div>
              <p className="text-stone-500 text-sm leading-relaxed">{ancestral_block}</p>
            </div>
          </div>

          {/* Диагностика */}
          <div className="px-5 max-w-sm mx-auto mb-10">
            <h3 className="text-stone-700 font-semibold text-sm mb-5">Диагностика рода</h3>
            <ChartBar
              label="Уровень родовой энергии"
              value={charts.ancestral_energy}
              colorFrom="from-rose-300"
              colorTo="to-rose-400"
            />
            <ChartBar
              label="Влияние неосознанных программ"
              value={charts.program_influence}
              colorFrom="from-violet-300"
              colorTo="to-violet-400"
            />
            <ChartBar
              label="Скрытый потенциал"
              value={charts.resource_potential}
              colorFrom="from-teal-300"
              colorTo="to-teal-400"
            />
          </div>

          {/* CTA */}
          <div className="px-5 max-w-sm mx-auto">
            <button
              onClick={() => { setChatHistory([]); setQuestionCount(0); setChatInput(''); setScreen('chat'); }}
              className="w-full py-4 rounded-3xl bg-rose-400 text-white font-semibold text-base shadow-md shadow-rose-200 active:scale-[0.98] transition-transform"
            >
              Обсудить разбор с ИИ-ассистентом →
            </button>
          </div>

        </main>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН ЧАТА
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'chat') {
    const limitReached = questionCount >= 3;
    const showCta      = limitReached && !isChatLoading;

    return (
      <main className="h-screen bg-[#fdf8f4] flex flex-col overflow-hidden">

        {/* Шапка */}
        <div className="flex-shrink-0 px-5 pt-8 pb-4 flex items-center justify-between border-b border-stone-100 bg-[#fdf8f4]">
          <button onClick={() => setScreen('result')}
            className="text-stone-400 text-sm hover:text-stone-600 transition-colors">
            ← Назад
          </button>
          <div className="flex items-center gap-2 bg-white border border-rose-100 rounded-2xl px-3 py-1.5 shadow-sm">
            <span>{topicObj?.emoji}</span>
            <span className="text-stone-600 text-sm font-medium">{topicObj?.label}</span>
          </div>
        </div>

        {/* Аватар */}
        <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 border-b border-stone-100 bg-[#fdf8f4]">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-xl">🌷</span>
          </div>
          <div>
            <p className="text-stone-700 text-sm font-medium">ИИ-ассистент</p>
            <p className="text-stone-400 text-xs">Родовой разбор</p>
          </div>
        </div>

        {/* Лента сообщений */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={[
                'max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-rose-400 text-white rounded-3xl rounded-tr-md'
                  : 'bg-white text-stone-600 border border-stone-100 shadow-sm rounded-3xl rounded-tl-md',
              ].join(' ')}>
                {msg.content}
              </div>
            </div>
          ))}

          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-stone-100 shadow-sm px-5 py-4 rounded-3xl rounded-tl-md flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-rose-200 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-rose-200 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-rose-200 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* CTA после 3 вопросов */}
        {showCta && (
          <div className="flex-shrink-0 px-5 pt-2 pb-3 bg-[#fdf8f4]">
            <button
              onClick={() => setScreen('offer')}
              className="w-full py-4 rounded-3xl bg-rose-400 text-white font-semibold text-base shadow-md shadow-rose-200 active:scale-[0.98] transition-transform"
            >
              Узнать, что делать дальше →
            </button>
          </div>
        )}

        {/* Поле ввода */}
        <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-stone-100">
          {limitReached ? (
            <div className="w-full px-4 py-3 rounded-2xl bg-stone-50 text-stone-300 text-sm text-center border border-stone-100">
              Лимит бесплатных вопросов исчерпан
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                placeholder="Задай вопрос по разбору..."
                disabled={isChatLoading}
                rows={1}
                className="flex-1 px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 text-stone-700 text-sm resize-none focus:outline-none focus:border-rose-200 placeholder-stone-300 disabled:opacity-40 max-h-28 overflow-y-auto"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || isChatLoading}
                className="w-11 h-11 rounded-2xl bg-rose-400 text-white flex items-center justify-center flex-shrink-0 shadow-sm active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          )}
        </div>

      </main>
    );
  }

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
            <button onClick={goBack} className="text-stone-400 text-sm hover:text-stone-600 transition-colors">← Назад</button>
            <div className="flex items-center gap-2 bg-white border border-rose-100 rounded-2xl px-3 py-1.5 shadow-sm">
              <span>{topicObj?.emoji}</span>
              <span className="text-stone-600 text-sm font-medium">{topicObj?.label}</span>
            </div>
          </div>

          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-5 shadow-sm mx-auto">
            <span className="text-2xl">🌷</span>
          </div>

          <p className="text-stone-600 text-center text-sm leading-relaxed mb-6 max-w-sm mx-auto">
            Я помогу тебе разобраться. Чем подробнее ты опишешь, что сейчас происходит
            в этой сфере, тем точнее ИИ сможет подсветить родовые сценарии.
          </p>

          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Опиши свою ситуацию..."
            className="w-full max-w-sm mx-auto rounded-3xl border border-stone-200 bg-white p-5 text-stone-700 text-sm leading-relaxed placeholder-stone-300 resize-none focus:outline-none focus:border-rose-200 shadow-sm min-h-[180px]" />

          <MicRow setter={setText} />

          <div className="w-full max-w-sm mx-auto mt-auto">
            <button onClick={handleContinue} disabled={!canContinue}
              className={['w-full py-4 rounded-3xl font-semibold text-lg transition-all duration-200',
                canContinue ? 'bg-rose-400 text-white shadow-md shadow-rose-200 active:scale-[0.98]'
                            : 'bg-stone-100 text-stone-300 cursor-not-allowed'].join(' ')}>
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
  // СТАРТОВЫЙ ЭКРАН
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
              className={['w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left transition-all duration-200 shadow-sm',
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
