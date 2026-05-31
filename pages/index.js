import { useState, useEffect, useRef } from 'react';

const TOPICS = [
  { id: 'money',     label: 'Деньги',         emoji: '💰' },
  { id: 'relations', label: 'Отношения',       emoji: '🌸' },
  { id: 'self',      label: 'Самореализация',  emoji: '✨' },
  { id: 'health',    label: 'Здоровье',        emoji: '🌿' },
];

const QUIZ_OPTIONS = [
  'Прям в точку',
  'Отчасти',
  'Раньше было, сейчас меньше',
  'Не совсем про меня',
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
    'Ищу корневые нити...',
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
  // screens: 'start'|'input'|'loading'|'clarification'|'quiz'|'analyzing'|'result'|'chat'|'offer'|'assistant'|'telegram'
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
  const [askedQuestions, setAskedQuestions]       = useState(new Set());
  const [suggestedAnswers, setSuggestedAnswers]   = useState([]);
  const [loadingQuestion, setLoadingQuestion]     = useState(null);
  const [showChatModal, setShowChatModal]         = useState(false);
  const [showLeadModal, setShowLeadModal]         = useState(false);
  const [leadTelegram, setLeadTelegram]           = useState('');
  const [leadPhone, setLeadPhone]                 = useState('');
  const [consentData, setConsentData]             = useState(false);
  const [consentMarketing, setConsentMarketing]   = useState(false);
  const [leadSubmitting, setLeadSubmitting]       = useState(false);
  const [showActionStep, setShowActionStep]       = useState(false);
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
    setAskedQuestions(new Set());
    setSuggestedAnswers([]);
    setLoadingQuestion(null);
    setShowChatModal(false);
    setShowLeadModal(false);
    setLeadTelegram('');
    setLeadPhone('');
    setConsentData(false);
    setConsentMarketing(false);
    setLeadSubmitting(false);
    setShowActionStep(false);
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
        selectedOption: QUIZ_OPTIONS[optionIndex],
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

  // ─── Лид-форма: отправка в Vakas ─────────────────────────────────────────
  async function submitLeadForm() {
    if (leadSubmitting) return;
    setLeadSubmitting(true);
    try {
      const topicLabel = TOPICS.find(t => t.id === topic)?.label;
      await fetch('/api/vakas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ telegram: leadTelegram, phone: leadPhone, sphere: topicLabel, query: text }),
      });
    } catch { /* fail silently — не блокируем UX */ }
    setLeadSubmitting(false);
    setShowLeadModal(false);
    setShowActionStep(true);
  }

  // ─── "Да, хочу на разбор": уведомляем Vakas и переходим ─────────────────
  async function handleYesConsultation() {
    try {
      const topicLabel = TOPICS.find(t => t.id === topic)?.label;
      fetch('/api/vakas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          telegram: leadTelegram,
          phone:    leadPhone,
          sphere:   topicLabel,
          query:    text,
          intent:   'yes_consultation',
        }),
      });
    } catch { /* fail silently */ }
    setScreen('assistant');
  }

  // ─── Инлайн-вопросы на экране результатов ────────────────────────────────
  async function askSuggestedQuestion(question, idx) {
    if (askedQuestions.has(idx) || loadingQuestion !== null) return;
    setAskedQuestions(prev => new Set([...prev, idx]));
    setLoadingQuestion(idx);
    try {
      const topicLabel = TOPICS.find(t => t.id === topic)?.label;
      const ctx = { sphere: topicLabel, query: text, ...resultData };
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ history: [{ role: 'user', content: question }], context: ctx }),
      });
      const data = await res.json();
      setSuggestedAnswers(prev => [...prev, {
        question,
        answer: data.reply || 'Что-то пошло не так.',
      }]);
    } catch {
      setSuggestedAnswers(prev => [...prev, { question, answer: 'Ошибка. Попробуй ещё раз.' }]);
    } finally {
      setLoadingQuestion(null);
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
            {QUIZ_OPTIONS.map((option, idx) => {
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
    const {
      block1_see, block2_want, chart_gap,
      block3_hold, chart_root,
      block4_lose, block5_dig,
      suggested_questions, cta_button_targeted, action_step,
    } = resultData;
    const canSubmitLead = leadTelegram.trim() && leadPhone.trim() && consentData && consentMarketing;

    return (
      <>
        {IOSOverlay}

        {/* ── Попап: ИИ-чат ─────────────────────────────────────────────── */}
        {showChatModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowChatModal(false); }}>
            <div className="w-full max-w-sm bg-[#fdf8f4] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: '82vh' }}>
              <div className="flex justify-between items-center px-5 py-4 border-b border-stone-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌷</span>
                  <span className="font-semibold text-stone-700 text-sm">ИИ-родолог</span>
                </div>
                <button onClick={() => setShowChatModal(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 text-sm hover:bg-stone-200 transition-colors">
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {suggestedAnswers.length === 0 && (
                  <p className="text-stone-400 text-xs text-center mb-4">Нажми на вопрос, чтобы получить ответ</p>
                )}
                <div className="flex flex-col gap-2 mb-4">
                  {suggested_questions?.map((q, i) => {
                    const isAsked   = askedQuestions.has(i);
                    const isLoading = loadingQuestion === i;
                    return (
                      <button key={i} onClick={() => askSuggestedQuestion(q, i)}
                        disabled={isAsked || loadingQuestion !== null}
                        className={[
                          'w-full px-4 py-3.5 rounded-2xl text-left text-sm leading-snug transition-all border',
                          isAsked
                            ? 'bg-stone-50 text-stone-300 border-stone-100 cursor-default'
                            : loadingQuestion !== null
                            ? 'bg-white text-stone-300 border-stone-100 cursor-not-allowed'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-rose-50 hover:border-rose-200 active:scale-[0.98] shadow-sm',
                        ].join(' ')}>
                        {isLoading
                          ? <span className="flex items-center gap-2 text-rose-400"><span className="w-1.5 h-1.5 rounded-full bg-rose-300 animate-pulse inline-block" />Думаю...</span>
                          : <span>💬 {q}</span>
                        }
                      </button>
                    );
                  })}
                </div>
                {suggestedAnswers.map((item, i) => (
                  <div key={i} className="bg-white rounded-3xl rounded-tl-md p-4 border border-stone-100 shadow-sm mb-3">
                    <p className="text-xs text-rose-400 mb-2 leading-snug">💬 {item.question}</p>
                    <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* ── Попап: лид-форма ──────────────────────────────────────────── */}
        {showLeadModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowLeadModal(false); }}>
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
              style={{ maxHeight: '92vh', overflowY: 'auto' }}>
              <div className="flex justify-between items-center px-5 py-4 border-b border-stone-100">
                <h3 className="font-semibold text-stone-700">Получить рекомендацию</h3>
                {!leadSubmitting && (
                  <button onClick={() => setShowLeadModal(false)}
                    className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 text-sm">✕</button>
                )}
              </div>
              <div className="p-5 flex flex-col gap-4">
                <p className="text-stone-500 text-sm leading-relaxed">
                  Оставь контакты — и мы пришлём тебе конкретный первый шаг с чего начать
                </p>
                <input type="text" value={leadTelegram} onChange={e => setLeadTelegram(e.target.value)}
                  placeholder="Ваш ник в Telegram (@username)"
                  className="w-full px-4 py-3.5 rounded-2xl border border-stone-200 bg-stone-50 text-stone-700 text-sm focus:outline-none focus:border-rose-200 placeholder-stone-300" />
                <input type="tel" value={leadPhone} onChange={e => setLeadPhone(e.target.value)}
                  placeholder="Ваш телефон"
                  className="w-full px-4 py-3.5 rounded-2xl border border-stone-200 bg-stone-50 text-stone-700 text-sm focus:outline-none focus:border-rose-200 placeholder-stone-300" />
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={consentData} onChange={e => setConsentData(e.target.checked)}
                    className="mt-0.5 w-4 h-4 flex-shrink-0 accent-rose-400" />
                  <span className="text-stone-400 text-xs leading-relaxed">
                    Я даю <a href="https://ifpp-inc.ru/soglasie1" target="_blank" rel="noopener noreferrer" className="text-rose-400 underline">согласие на обработку персональных данных</a> в соответствии с <a href="https://ifpp-inc.ru/politikanew" target="_blank" rel="noopener noreferrer" className="text-rose-400 underline">Политикой обработки персональных данных</a>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={consentMarketing} onChange={e => setConsentMarketing(e.target.checked)}
                    className="mt-0.5 w-4 h-4 flex-shrink-0 accent-rose-400" />
                  <span className="text-stone-400 text-xs leading-relaxed">
                    Я даю <a href="https://ifpp-inc.ru/soglasie2" target="_blank" rel="noopener noreferrer" className="text-rose-400 underline">согласие на получение рекламных рассылок</a>
                  </span>
                </label>
                <button onClick={submitLeadForm} disabled={!canSubmitLead || leadSubmitting}
                  className={[
                    'w-full py-4 rounded-3xl font-semibold text-base transition-all',
                    canSubmitLead && !leadSubmitting
                      ? 'bg-rose-400 text-white shadow-md shadow-rose-200 active:scale-[0.98]'
                      : 'bg-stone-100 text-stone-300 cursor-not-allowed',
                  ].join(' ')}>
                  {leadSubmitting ? 'Отправляем...' : 'Получить рекомендацию →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Основной экран ────────────────────────────────────────────── */}
        <main className="min-h-screen bg-[#fdf8f4] pb-20">

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

          {/* Заголовок разбора */}
          <div className="px-5 mb-10 max-w-sm mx-auto text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <span className="text-3xl">🌷</span>
            </div>
            <h2 className="text-xl font-semibold text-stone-800 mb-1.5">Твой разбор готов</h2>
            <p className="text-stone-400 text-[13px]">Читай внимательно — это про тебя</p>
          </div>

          {/* Блок 1: Вот что я вижу */}
          <div className="px-5 max-w-sm mx-auto mb-4">
            <div className="bg-white rounded-3xl px-6 py-5 shadow-sm border border-stone-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🪞</span>
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-400 mb-0.5">Зеркало</p>
                  <h3 className="text-stone-800 font-semibold text-[15px] leading-snug">Вот что я вижу</h3>
                </div>
              </div>
              <p className="text-stone-600 text-[15px] leading-[1.7]">{block1_see}</p>
            </div>
          </div>

          {/* Блок 2: Вот чего ты на самом деле хочешь */}
          <div className="px-5 max-w-sm mx-auto mb-4">
            <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-3xl px-6 py-5 shadow-sm border border-rose-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-white/70 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">✨</span>
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-500 mb-0.5">Желание</p>
                  <h3 className="text-rose-700 font-semibold text-[15px] leading-snug">Вот чего ты на самом деле хочешь</h3>
                </div>
              </div>
              <p className="text-stone-600 text-[15px] leading-[1.7]">{block2_want}</p>
            </div>
          </div>

          {/* Визуализация «Разрыв» */}
          <div className="px-5 max-w-sm mx-auto mb-6">
            <div className="bg-white rounded-3xl px-6 py-5 shadow-sm border border-stone-100">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400 text-center mb-5">Разрыв между реальностью и желаемым</p>
              <div className="mb-4">
                <div className="flex justify-between text-[13px] mb-2">
                  <span className="text-stone-400">Где сейчас</span>
                  <span className="text-stone-500 font-semibold">{chart_gap.current}%</span>
                </div>
                <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-stone-200 to-stone-300 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: chartsVisible ? `${chart_gap.current}%` : '0%' }} />
                </div>
              </div>
              <div className="mb-5">
                <div className="flex justify-between text-[13px] mb-2">
                  <span className="text-rose-400">Где хочу быть</span>
                  <span className="text-rose-500 font-semibold">{chart_gap.desired}%</span>
                </div>
                <div className="w-full h-3 bg-rose-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-rose-300 to-rose-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: chartsVisible ? `${chart_gap.desired}%` : '0%', transitionDelay: '300ms' }} />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 pt-3 border-t border-stone-100">
                <span className="text-stone-400 text-[13px]">Разрыв:</span>
                <span className="text-xl font-bold text-rose-500">{chart_gap.desired - chart_gap.current}%</span>
              </div>
            </div>
          </div>

          {/* Блок 3: Вот что тебя держит */}
          <div className="px-5 max-w-sm mx-auto mb-4">
            <div className="bg-white rounded-3xl px-6 py-5 shadow-sm border border-stone-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">⚓</span>
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400 mb-0.5">Корень</p>
                  <h3 className="text-stone-800 font-semibold text-[15px] leading-snug">Вот что тебя держит</h3>
                </div>
              </div>
              <p className="text-stone-600 text-[15px] leading-[1.7]">{block3_hold}</p>
            </div>
          </div>

          {/* Визуализация «Корень» */}
          <div className="px-5 max-w-sm mx-auto mb-6">
            <div className="flex flex-col items-center">
              <div className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full bg-stone-300 flex-shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">Снаружи</span>
                </div>
                <p className="text-stone-500 text-[14px]">{chart_root.surface}</p>
              </div>
              <div className="w-px h-4 bg-gradient-to-b from-stone-200 to-rose-200" />
              <div className="w-full bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-300 flex-shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-400">Глубже</span>
                </div>
                <p className="text-stone-600 text-[14px]">{chart_root.deep}</p>
              </div>
              <div className="w-px h-4 bg-gradient-to-b from-rose-200 to-rose-400" />
              <div className="w-full bg-gradient-to-br from-rose-100 to-rose-50 border border-rose-200 rounded-2xl px-5 py-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🌱</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-500">Родовой корень</span>
                </div>
                <p className="text-stone-700 text-[14px] font-semibold">{chart_root.root}</p>
              </div>
            </div>
          </div>

          {/* Блок 4: Вот что ты теряешь */}
          <div className="px-5 max-w-sm mx-auto mb-4">
            <div className="bg-white rounded-3xl px-6 py-5 shadow-sm border border-amber-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">⏳</span>
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-400 mb-0.5">Цена</p>
                  <h3 className="text-stone-800 font-semibold text-[15px] leading-snug">Вот что ты теряешь</h3>
                </div>
              </div>
              <p className="text-stone-600 text-[15px] leading-[1.7]">{block4_lose}</p>
            </div>
          </div>

          {/* Кнопка ИИ-чата */}
          <div className="px-5 max-w-sm mx-auto mb-6 text-center">
            <button onClick={() => setShowChatModal(true)}
              className="inline-flex items-center gap-2 text-rose-400 text-sm hover:text-rose-500 transition-colors">
              <span>💬</span>
              <span className="underline underline-offset-2">Задать вопрос ИИ-родологу</span>
            </button>
          </div>

          {/* Главные CTA (скрыты после отправки формы) */}
          {!showActionStep && (
            <div className="px-5 max-w-sm mx-auto flex flex-col gap-3 mb-8">
              <button onClick={() => setShowLeadModal(true)}
                className="w-full py-4 rounded-3xl bg-white text-stone-600 font-medium text-sm border border-stone-200 active:scale-[0.98] transition-transform shadow-sm leading-snug text-left px-5">
                Как выйти из этой ситуации сегодня?
              </button>
              {cta_button_targeted && (
                <button onClick={() => setShowLeadModal(true)}
                  className="w-full py-4 rounded-3xl bg-rose-400 text-white font-semibold text-base shadow-md shadow-rose-200 active:scale-[0.98] transition-transform leading-snug px-5 text-left">
                  {cta_button_targeted}
                </button>
              )}
            </div>
          )}

          {/* Блок 5 + финальный оффер — плавно раскрываются после отправки лид-формы */}
          <div style={{
            maxHeight: showActionStep ? '1400px' : '0px',
            opacity:   showActionStep ? 1 : 0,
            overflow:  'hidden',
            transition: 'max-height 0.75s ease-in-out, opacity 0.5s ease-in-out 0.1s',
          }}>
            <div className="px-5 max-w-sm mx-auto mb-4 pt-2">
              <div className="bg-gradient-to-br from-stone-50 to-white rounded-3xl px-6 py-5 shadow-sm border border-stone-100">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-stone-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🔍</span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400 mb-0.5">Направление</p>
                    <h3 className="text-stone-800 font-semibold text-[15px] leading-snug">Куда копать</h3>
                  </div>
                </div>
                <p className="text-stone-600 text-[15px] leading-[1.7]">{block5_dig}</p>
              </div>
            </div>

            <div className="px-5 max-w-sm mx-auto mb-8">
              <div className="bg-white rounded-3xl px-6 py-5 border border-stone-100 shadow-sm">
                <p className="text-stone-700 font-semibold text-center text-[15px] mb-5">
                  Хотите записаться на разбор со специалистом?
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={handleYesConsultation}
                    className="w-full py-4 rounded-3xl bg-rose-400 text-white font-semibold text-base shadow-md shadow-rose-200 active:scale-[0.98] transition-transform">
                    Да, хочу →
                  </button>
                  <button onClick={() => { setAnswers([]); setScreen('telegram'); }}
                    className="w-full py-3 rounded-3xl text-stone-400 text-sm active:scale-[0.98] transition-transform">
                    Нет, удалите мои ответы
                  </button>
                </div>
              </div>
            </div>
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
  // ЭКРАН РАЗВИЛКИ
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'offer') return (
    <>
      {IOSOverlay}
      <main className="min-h-screen bg-[#fdf8f4] flex flex-col px-5 pt-8 pb-10">
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => setScreen('chat')}
            className="text-stone-400 text-sm hover:text-stone-600 transition-colors">
            ← Назад
          </button>
          <div className="flex items-center gap-2 bg-white border border-rose-100 rounded-2xl px-3 py-1.5 shadow-sm">
            <span>{topicObj?.emoji}</span>
            <span className="text-stone-600 text-sm font-medium">{topicObj?.label}</span>
          </div>
        </div>

        <div className="flex flex-col max-w-sm mx-auto w-full flex-1">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
              <span className="text-3xl">🌱</span>
            </div>
            <h2 className="text-2xl font-semibold text-stone-700 leading-snug mb-4">
              Твой родовой сценарий<br />поддаётся проработке
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed">
              ИИ подсветил лишь верхушку айсберга. Чтобы навсегда убрать этот блок из жизни, нужен точечный разбор со специалистом.
            </p>
          </div>

          {resultData?.ancestral_block && (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-rose-50 mb-8">
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-3">Что стоит за твоей ситуацией</p>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">🔗</span>
                <p className="text-stone-600 text-sm leading-relaxed italic">
                  «{resultData.ancestral_block.split('.')[0]}»
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-auto">
            <button onClick={() => setScreen('assistant')}
              className="w-full py-4 rounded-3xl bg-rose-400 text-white font-semibold text-base shadow-md shadow-rose-200 active:scale-[0.98] transition-transform leading-snug">
              Записаться на разбор<br />к ассистенту эксперта →
            </button>
            <button onClick={() => setScreen('telegram')}
              className="w-full py-4 rounded-3xl bg-white text-stone-500 font-medium text-sm border border-stone-200 active:scale-[0.98] transition-transform shadow-sm">
              Я пока хочу изучить тему самостоятельно
            </button>
          </div>
        </div>
      </main>
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН АССИСТЕНТА (запись к эксперту)
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'assistant') return (
    <>
      {IOSOverlay}
      <main className="min-h-screen bg-[#fdf8f4] flex flex-col px-5 pt-8 pb-10">
        <div className="flex items-center mb-10">
          <button onClick={() => setScreen(resultData ? 'result' : 'offer')}
            className="text-stone-400 text-sm hover:text-stone-600 transition-colors">
            ← Назад
          </button>
        </div>

        <div className="flex flex-col items-center text-center max-w-sm mx-auto w-full flex-1">
          <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mb-6 shadow-sm">
            <span className="text-4xl">🌷</span>
          </div>
          <h2 className="text-2xl font-semibold text-stone-700 mb-3 leading-snug">
            Прекрасный выбор!
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed max-w-xs mb-5">
            Переходим в Telegram для связи с ассистентом эксперта.
          </p>

          <div className="bg-rose-50 border border-rose-100 rounded-3xl px-5 py-4 mb-10 w-full text-left">
            <p className="text-stone-600 text-sm leading-relaxed">
              Напиши в чат кодовое слово{' '}
              <span className="font-bold text-rose-500">«РОД»</span>,
              чтобы зафиксировать за собой место на бесплатный разбор.
            </p>
          </div>

          <div className="w-full flex flex-col gap-3 mt-auto">
            <a href="https://t.me/assistant_username_placeholder" target="_blank" rel="noopener noreferrer"
              className="w-full py-4 rounded-3xl bg-rose-400 text-white font-semibold text-base shadow-md shadow-rose-200 active:scale-[0.98] transition-transform text-center block">
              Открыть Telegram ассистента →
            </a>
            <button onClick={goToStart} className="text-stone-400 text-sm py-2">
              ← В начало
            </button>
          </div>
        </div>
      </main>
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН TELEGRAM-КАНАЛА
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'telegram') return (
    <>
      {IOSOverlay}
      <main className="min-h-screen bg-[#fdf8f4] flex flex-col px-5 pt-8 pb-10">
        <div className="flex items-center mb-10">
          <button onClick={() => setScreen(resultData ? 'result' : 'offer')}
            className="text-stone-400 text-sm hover:text-stone-600 transition-colors">
            ← Назад
          </button>
        </div>

        <div className="flex flex-col items-center text-center max-w-sm mx-auto w-full flex-1">
          <div className="w-20 h-20 rounded-full bg-[#e8f4fd] flex items-center justify-center mb-6 shadow-sm">
            <span className="text-4xl">✈️</span>
          </div>
          <h2 className="text-2xl font-semibold text-stone-700 mb-3 leading-snug">
            Добро пожаловать<br />в сообщество
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed max-w-xs mb-10">
            Отличный выбор! В нашем сообществе мы регулярно разбираем родовые программы, делимся практиками и поддерживаем друг друга.
          </p>

          <div className="w-full flex flex-col gap-3 mt-auto">
            <a href="https://t.me/channel_username_placeholder" target="_blank" rel="noopener noreferrer"
              className="w-full py-4 rounded-3xl bg-[#229ED9] text-white font-semibold text-base shadow-md active:scale-[0.98] transition-transform text-center block">
              Войти в Telegram-канал →
            </a>
            <button onClick={goToStart} className="text-stone-400 text-sm py-2">
              ← В начало
            </button>
          </div>
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
