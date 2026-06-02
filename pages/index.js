import { useState, useEffect, useRef } from 'react';

const TOPICS = [
  { id: 'money',     label: 'Деньги',         emoji: '💰' },
  { id: 'relations', label: 'Отношения',       emoji: '🌸' },
  { id: 'self',      label: 'Самореализация',  emoji: '✨' },
];

// Варианты ответов теперь динамические из question.options

const SCREEN_MESSAGES = {};

const LOADING_STAGES   = ['Анализ запроса', 'Изучаю похожие ситуации', 'Подбираю вопросы под тебя', 'Финальная проверка'];
const ANALYZING_STAGES = ['Анализ ответов', 'Ищу ключевую проблему', 'Собираю персональный разбор', 'Готовлю рекомендации'];

// estimatedMs — ожидаемое время ответа ИИ; aiDone — ИИ ответил; onComplete — колбэк когда кольцо добежало
function WaitScreen({ title, stages, estimatedMs = 12000, aiDone, onComplete, showReturn, onGoHome }) {
  const [progress, setProgress] = useState(0);
  const [showWaitMsg, setShowWaitMsg] = useState(false);
  const progressRef  = useRef(0);
  const completedRef = useRef(false);
  const aiDoneRef2   = useRef(aiDone);
  const onCompleteRef = useRef(onComplete);
  aiDoneRef2.current  = aiDone;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const startTime = Date.now();
    completedRef.current = false;

    const iv = setInterval(() => {
      if (completedRef.current) return;
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / estimatedMs, 1);
      // easeOutCubic: медленно замедляется при приближении к 88%
      const eased = 1 - Math.pow(1 - t, 3);

      let next;
      if (aiDoneRef2.current) {
        // ИИ ответил — добегаем быстро
        next = Math.min(progressRef.current + 0.025, 1);
      } else {
        // Плавно заполняем до 88% за estimatedMs
        next = Math.max(eased * 0.88, progressRef.current);
      }

      progressRef.current = next;
      setProgress(next);

      if (next >= 0.999 && !completedRef.current) {
        completedRef.current = true;
        setTimeout(() => onCompleteRef.current?.(), 250);
      }
    }, 80);

    return () => clearInterval(iv);
  }, [estimatedMs]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Не закрывай" — показываем когда бар завис у 88% (ИИ ещё думает) ИЛИ когда ИИ ответил и добегает
  useEffect(() => {
    if (progress >= 0.82 || aiDone) {
      setShowWaitMsg(true);
    }
  }, [progress >= 0.82, aiDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // stageIdx выводится из progress, а не из таймера
  const stageIdx = progress < 0.15 ? 0
    : progress < 0.40 ? 1
    : progress < 0.70 ? 2
    : progress < 0.93 ? 3
    : stages.length;

  const r    = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);

  return (
    <main className="min-h-screen bg-[#0f0c09] flex flex-col items-center justify-center px-5 text-center">
      <div className="relative mb-7">
        <svg viewBox="0 0 120 120" className="w-32 h-32">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#2a2318" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke="#c8922a"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.12s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl">🌷</span>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-[#f5ede3] mb-1">{title}</h2>
      <p className="text-[#6a5a50] text-sm mb-8">Это займет около 15-30 секунд</p>

      <div className="flex flex-col gap-3 w-full max-w-[260px] text-left">
        {stages.map((stage, i) => {
          const done    = i < stageIdx;
          const current = i === stageIdx;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all duration-300 ${
                done    ? 'bg-[#1e4012] text-[#6ecf47]' :
                current ? 'bg-[#3d2e1a]' : 'bg-[#221c14]'
              }`}>
                {done ? '✓' : current ? (
                  <span className="w-2 h-2 rounded-full bg-[#c8922a] animate-pulse block" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4a3f35] block" />
                )}
              </div>
              <span className={`text-sm transition-colors duration-300 ${
                done ? 'text-[#6ecf47]' : current ? 'text-[#f5ede3]' : 'text-[#4a3f35]'
              }`}>{stage}</span>
            </div>
          );
        })}
      </div>

      <div style={{ opacity: showWaitMsg ? 1 : 0, transition: 'opacity 1s ease', marginTop: '20px', minHeight: '20px' }}>
        <p className="text-[#4a3f35] text-sm text-center">Не закрывай страницу, ещё немного...</p>
      </div>

      {showReturn && (
        <button onClick={onGoHome} className="mt-6 text-[#6a5a50] text-xs underline underline-offset-2">
          В начало
        </button>
      )}
    </main>
  );
}

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
  const [screen, setScreen]                       = useState('promo');
  const [topic, setTopic]                         = useState(null);
  const [text, setText]                           = useState('');
  const [clarificationText, setClarificationText] = useState('');
  const [aiQuestion, setAiQuestion]               = useState('');
  const [quizData, setQuizData]                   = useState([]);
  const [quizIndex, setQuizIndex]                 = useState(0);
  const [answers, setAnswers]                     = useState([]);
  const [selectedAnswer, setSelectedAnswer]       = useState(null);
  const [multiSelected, setMultiSelected]         = useState(new Set());
  const [scaleValue, setScaleValue]               = useState(3);
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
  const [selectedQuestion, setSelectedQuestion]   = useState(null);
  const [leadName, setLeadName]                   = useState('');
  const [leadTelegram, setLeadTelegram]           = useState('');
  const [leadPhone, setLeadPhone]                 = useState('');
  const [consentData, setConsentData]             = useState(false);
  const [consentMarketing, setConsentMarketing]   = useState(false);
  const [leadSubmitting, setLeadSubmitting]       = useState(false);
  const [showActionStep, setShowActionStep]       = useState(false);
  const [loadingAiDone, setLoadingAiDone]         = useState(false);
  const [meetingFormOpen, setMeetingFormOpen]     = useState(false);
  const [meetingName, setMeetingName]             = useState('');
  const [meetingPhone, setMeetingPhone]           = useState('');
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [meetingSubmitted, setMeetingSubmitted]   = useState(false);
  const mediaRecorderRef                          = useRef(null);
  const chunksRef                                 = useRef([]);
  const messagesEndRef                            = useRef(null);
  const revealSectionRef                          = useRef(null);
  const loadingProceedRef                         = useRef(null);
  const leadFormRef                               = useRef(null);

  // Scroll to top on every screen change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  // WebView detection
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

  // Цикличные сообщения на лоадерах
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

  // ─── Скролл к форме при выборе вопроса ───────────────────────────────────
  useEffect(() => {
    if (selectedQuestion !== null) {
      setTimeout(() => leadFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
    }
  }, [selectedQuestion]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ─── Загрузка: сигналы для WaitScreen ────────────────────────────────────
  function startStages() {
    setLoadingAiDone(false);
    loadingProceedRef.current = null;
  }

  function signalAiDone(proceedFn) {
    loadingProceedRef.current = proceedFn;
    setLoadingAiDone(true);
  }

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
    setMultiSelected(new Set());
    setScaleValue(3);
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
  function advanceQuiz(newAnswer) {
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);
    setMultiSelected(new Set());
    setScaleValue(3);

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
  }

  function selectAnswer(optionIndex) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIndex);
    const question = quizData[quizIndex];
    setTimeout(() => {
      advanceQuiz({
        questionId:     question.id,
        question:       question.question_text,
        selectedOption: question.options[optionIndex],
      });
    }, 500);
  }

  function handleMultiNext() {
    const question = quizData[quizIndex];
    const selected = question.options.filter((_, i) => multiSelected.has(i));
    advanceQuiz({
      questionId:      question.id,
      question:        question.question_text,
      selectedOptions: selected,
    });
  }

  function handleScaleNext() {
    const question = quizData[quizIndex];
    advanceQuiz({
      questionId:  question.id,
      question:    question.question_text,
      scaleValue,
      scale_left:  question.scale_left,
      scale_right: question.scale_right,
    });
  }

  function goToPrevQuestion() {
    if (quizIndex === 0 || selectedAnswer !== null) return;
    setAnswers(prev => prev.slice(0, -1));
    setMultiSelected(new Set());
    setScaleValue(3);
    setQuizIndex(prev => prev - 1);
  }

  // ─── Claude: анализ запроса → квиз ───────────────────────────────────────
  async function callAnalyze(payload) {
    setScreen('loading');
    startStages();
    try {
      const res  = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.status === 'need_clarification') {
        signalAiDone(() => {
          setAiQuestion(data.ai_question);
          setClarificationText('');
          setScreen('clarification');
        });
      } else if (data.status === 'ready_for_quiz') {
        signalAiDone(() => {
          setQuizData(data.quiz_data);
          setQuizIndex(0);
          setAnswers([]);
          setScreen('quiz');
        });
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
    startStages();
    try {
      const res  = await fetch('/api/result', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      signalAiDone(() => {
        setResultData(data);
        setScreen('result');
      });
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
        body:    JSON.stringify({ name: leadName, telegram: leadTelegram, phone: leadPhone, sphere: topicLabel, query: text }),
      });
    } catch { /* fail silently */ }
    setLeadSubmitting(false);
    setShowActionStep(true);
    setTimeout(() => revealSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 800);
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
    setScreen('meeting');
  }

  // ─── Форма встречи ───────────────────────────────────────────────────────
  async function handleMeetingSubmit() {
    if (meetingSubmitting) return;
    setMeetingSubmitting(true);
    try {
      const topicLabel = TOPICS.find(t => t.id === topic)?.label;
      await fetch('/api/vakas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: meetingName, phone: meetingPhone, sphere: topicLabel, intent: 'meeting_booking' }),
      });
    } catch { /* fail silently */ }
    setMeetingSubmitting(false);
    setMeetingSubmitted(true);
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

  // ─── Генерация PDF разбора ────────────────────────────────────────────────
  function generateAndDownloadPDF() {
    if (!resultData) return;
    const rd = resultData;
    const topicLabel = TOPICS.find(t => t.id === topic)?.label || '';
    const block5html = showActionStep && rd.action_step ? `
      <h2>Куда копать</h2>
      ${rd.action_step?.psychology ? `<h3>С чем ты столкнулась</h3><p>${rd.action_step.psychology}</p>` : ''}
      ${rd.action_step?.path ? `<h3>Как с этим работать</h3><p>${rd.action_step.path}</p>` : ''}
      ${rd.action_step?.first_step ? `<p><strong>Первый шаг:</strong> ${rd.action_step.first_step}</p>` : ''}
    ` : '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Мой разбор - ${topicLabel}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 600px; margin: 40px auto; padding: 0 20px; color: #2d2520; line-height: 1.7; }
        h1 { color: #c46a3e; font-size: 22px; margin-bottom: 8px; }
        h2 { color: #c46a3e; font-size: 16px; margin-top: 32px; margin-bottom: 8px; border-bottom: 1px solid #e8dcd0; padding-bottom: 4px; }
        p { margin: 8px 0; font-size: 15px; }
        .meta { color: #8b7b6f; font-size: 13px; }
        @media print { body { margin: 20px; } }
      </style>
    </head><body>
      <h1>Мой разбор</h1>
      <p class="meta">Сфера: ${topicLabel}</p>
      <h2>Твоя ситуация сейчас</h2>
      ${(rd.block1_mirror?.points || []).map(p => `<p>${p.because || p.text || ''}</p>`).join('')}
      ${rd.block1_mirror?.conclusion ? `<p><em>${rd.block1_mirror.conclusion}</em></p>` : ''}
      <h2>Вот что тебя держит</h2>
      ${rd.block2_problem?.title ? `<p><strong>${rd.block2_problem.title}</strong></p>` : ''}
      <p>${rd.block2_problem?.mechanism || ''}</p>
      <h2>Чего ты на самом деле хочешь</h2>
      <p>${rd.block3_pointB?.text || ''}</p>
      ${rd.block4_lose ? `<h2>Цена бездействия</h2><p>${rd.block4_lose}</p>` : ''}
      ${block5html}
    </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  }

  // ─── Переиспользуемые блоки ───────────────────────────────────────────────
  const topicObj = TOPICS.find(t => t.id === topic);

  function MicRow({ setter }) {
    return (
      <div className="flex justify-center mt-4 mb-6">
        {isTranscribing ? (
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#fff9f4] border border-[#dcc9ba] text-[#8b7b6f] text-sm">
            <span className="w-2 h-2 rounded-full bg-[#d97a4e] animate-pulse inline-block" />
            Распознаём...
          </div>
        ) : !isRecording ? (
          <button onClick={() => startRecording(setter)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#fff9f4] border border-[#dcc9ba] text-stone-500 text-sm font-medium shadow-sm hover:bg-[#fff9f4] hover:border-[#c46a3e] transition-all active:scale-[0.97]">
            <span className="text-lg">🎙️</span>
            Надиктовать голосом
          </button>
        ) : (
          <button onClick={stopRecording}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#3d352a] border border-[#dcc9ba] text-stone-500 text-sm font-medium shadow-sm active:scale-[0.97]">
            <span className="w-3 h-3 rounded-sm bg-stone-400 inline-block flex-shrink-0" />
            Остановить и распознать
            <span className="w-2 h-2 rounded-full bg-[#d97a4e] animate-pulse inline-block flex-shrink-0" />
          </button>
        )}
      </div>
    );
  }

  const IOSOverlay = showOverlay && (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#fff9f4] p-6 shadow-2xl text-center">
        <p className="text-3xl mb-3">🌐</p>
        <p className="font-semibold text-stone-800 text-lg mb-2">Откройте в Safari</p>
        <p className="text-stone-500 text-sm leading-relaxed mb-5">
          Для корректной работы нажмите{' '}
          <span className="font-bold text-[#2d2520]">•••</span> вверху
          и выберите <span className="font-bold text-[#2d2520]">«Открыть в браузере»</span>.
        </p>
        <button onClick={() => setShowOverlay(false)}
          className="w-full py-3 rounded-2xl bg-[#fff9f4] text-rose-500 font-medium text-sm">
          Закрыть
        </button>
      </div>
    </div>
  );

  const InAppBanner = browser.isInApp && !browser.isAndroid && !showOverlay && (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3">
      <p className="text-amber-800 text-xs text-center leading-snug">
        Рекомендуем открыть в браузере
        нажмите <span className="font-semibold">•••</span> вверху и выберите «Открыть в браузере».
      </p>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ПРОМО-ЛЕНДИНГ
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'promo') {
    const steps = [
      'Выбери сферу, где чувствуешь затык',
      'Опиши ситуацию своими словами',
      '10 персональных вопросов под тебя',
      'Получи разбор прямо на экране',
    ];
    const benefits = [
      { icon: '🔎', text: 'Увидишь сценарий рода, который работает именно у тебя' },
      { icon: '🔗', text: 'Поймёшь связь между тем, что происходит сейчас, и тем, что было в семье' },
      { icon: '🧭', text: 'Получишь конкретный вектор: что с этим можно сделать' },
    ];
    return (
      <main className="min-h-screen bg-[#0f0c09] flex flex-col items-center px-5 pt-12 pb-14">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center">

          {/* Шапка эксперта */}
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-3 shadow-lg text-white font-bold text-xl"
            style={{ background: 'linear-gradient(145deg, #7C3069, #c46a3e)' }}
          >КМ</div>
          <h2 className="text-[17px] font-semibold text-[#f5ede3] mb-1">Ксения Мосунова</h2>
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#c46a3e] mb-8">
            Психогенеалог
          </p>

          {/* Заголовок */}
          <h1 className="text-[26px] font-semibold text-[#f5ede3] text-center leading-tight mb-3">
            Почему одно и то же повторяется{' '}
            <span className="text-[#c46a3e] italic">и что с этим делать</span>
          </h1>
          <p className="text-sm text-[#a89f94] text-center leading-relaxed mb-6">
            Разберём твою ситуацию через сценарии рода и найдём точку входа
          </p>

          {/* Теги */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {['4 шага', '5 минут', 'разбор сразу на экране'].map((tag) => (
              <span key={tag} className="px-4 py-1.5 rounded-full bg-[#2a2318] border border-[#3d352a] text-[#a89f94] text-xs">
                {tag}
              </span>
            ))}
          </div>

          {/* Как это работает */}
          <div className="w-full bg-[#2a2318] border border-[#3d352a] rounded-3xl px-5 py-5 mb-4">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#c46a3e] mb-4">
              Как это работает
            </p>
            <div className="flex flex-col gap-3">
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-[22px] h-[22px] rounded-full bg-[#c46a3e] flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold">
                    {i + 1}
                  </div>
                  <p className="text-[#d4cfc8] text-sm leading-snug">{s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Блоки пользы */}
          <div className="w-full flex flex-col gap-3 mb-10">
            {benefits.map((b, i) => (
              <div key={i} className="w-full bg-[#2a2318] border border-[#3d352a] rounded-2xl px-4 py-4 flex items-start gap-3">
                <span className="text-xl flex-shrink-0 leading-none">{b.icon}</span>
                <p className="text-[#a89f94] text-sm leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>

          {/* Кнопка */}
          <p className="text-[17px] font-semibold text-[#f5ede3] text-center leading-snug mb-4">
            Узнай, что тебя держит. И как это изменить
          </p>
          <button
            onClick={() => setScreen('start')}
            className="w-full py-4 rounded-3xl bg-[#c46a3e] text-white font-semibold text-base text-center shadow-lg active:scale-[0.98] transition-transform mb-3"
          >
            Получить разбор →
          </button>
          <p className="text-[11px] text-[#6a5a50] tracking-wide">
            Бесплатно · Без регистрации · 5 минут
          </p>

        </div>
      </main>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Загрузка: анализ запроса
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'loading') return (
    <WaitScreen
      title="Подбираем вопросы для тебя"
      stages={LOADING_STAGES}
      estimatedMs={20000}
      aiDone={loadingAiDone}
      onComplete={() => loadingProceedRef.current?.()}
    />
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
        <main className="min-h-screen bg-[#f9f5f0] flex flex-col px-5 pt-8 pb-10">
          <div className="flex items-center justify-between mb-8">
            <button onClick={goBack} className="text-[#8b7b6f] text-sm hover:text-[#5a4a42] transition-colors">
              ← Назад
            </button>
            <div className="flex items-center gap-2 bg-[#fff9f4] border border-rose-100 rounded-2xl px-3 py-1.5 shadow-sm">
              <span>{topicObj?.emoji}</span>
              <span className="text-[#5a4a42] text-sm font-medium">{topicObj?.label}</span>
            </div>
          </div>

          <div className="w-full max-w-sm mx-auto bg-[#fff9f4] rounded-3xl p-5 shadow-sm border border-rose-50 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🌷</span>
              <p className="text-[#5a4a42] text-sm leading-relaxed">{aiQuestion}</p>
            </div>
          </div>

          <textarea value={clarificationText} onChange={e => setClarificationText(e.target.value)}
            placeholder="Напиши свой ответ..."
            className="w-full max-w-sm mx-auto rounded-3xl border border-[#dcc9ba] bg-[#fff9f4] p-5 text-[#2d2520] text-sm leading-relaxed placeholder-stone-300 resize-none focus:outline-none focus:border-[#c46a3e] shadow-sm min-h-[160px]" />

          <MicRow setter={setClarificationText} />

          <div className="w-full max-w-sm mx-auto mt-auto">
            <button onClick={handleClarificationAnswer} disabled={!canAnswer}
              className={['w-full py-4 rounded-3xl font-semibold text-lg transition-all duration-200',
                canAnswer ? 'bg-[#c46a3e] text-white shadow-md shadow-[#dcc9ba] active:scale-[0.98]'
                          : 'bg-[#3d352a] text-[#9b8b7f] cursor-not-allowed'].join(' ')}>
              Ответить →
            </button>
          </div>
        </main>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Экран теста: пошаговый
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'quiz') {
    const question    = quizData[quizIndex];
    const total       = quizData.length;
    const progressPct = (quizIndex / total) * 100;
    const qtype       = question.type || 'single';

    return (
      <>
        {IOSOverlay}
        <main className="min-h-screen bg-[#0f0c09] flex flex-col px-5 pb-10" style={{ paddingTop: 'max(48px, env(safe-area-inset-top, 48px))' }}>
          {/* Шапка */}
          <div className="flex items-center justify-between mb-4">
            {quizIndex > 0
              ? <button onClick={goToPrevQuestion} className="text-[#a89f94] text-sm hover:text-[#d4cfc8] transition-colors">← Назад</button>
              : <div className="w-10" />}
            <span className="text-[#a89f94] text-sm">
              Вопрос <span className="font-medium text-[#d4cfc8]">{quizIndex + 1}</span> из {total}
            </span>
            <div className="w-10" />
          </div>

          {/* Прогресс-бар */}
          <div className="w-full h-1.5 bg-[#3d352a] rounded-full mb-8">
            <div className="h-full bg-[#c46a3e] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }} />
          </div>

          {/* Формат A — Single */}
          {qtype === 'single' && (
            <>
              <h2 className="text-xl font-semibold text-[#f5ede3] leading-snug mb-8 max-w-sm mx-auto w-full">
                {question.question_text}
              </h2>
              <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                {question.options.map((option, idx) => {
                  const isSelected = selectedAnswer === idx;
                  return (
                    <button key={idx} onClick={() => selectAnswer(idx)}
                      disabled={selectedAnswer !== null}
                      className={['w-full px-5 py-4 rounded-3xl text-left text-sm leading-snug transition-all duration-200 shadow-sm',
                        isSelected
                          ? 'bg-[#c46a3e] text-white shadow-md scale-[1.01]'
                          : 'bg-[#2a2318] text-[#d4cfc8] active:scale-[0.98]',
                        selectedAnswer !== null && !isSelected ? 'opacity-40' : '',
                      ].join(' ')}>
                      {option}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Формат B — Multi */}
          {qtype === 'multi' && (
            <>
              <p className="text-[#c46a3e] text-xs font-semibold uppercase tracking-widest mb-3 max-w-sm mx-auto w-full">
                Отметь всё, что про тебя
              </p>
              <h2 className="text-xl font-semibold text-[#f5ede3] leading-snug mb-6 max-w-sm mx-auto w-full">
                {question.question_text}
              </h2>
              <div className="flex flex-col gap-3 w-full max-w-sm mx-auto mb-8">
                {question.options.map((option, idx) => {
                  const checked = multiSelected.has(idx);
                  return (
                    <button key={idx}
                      onClick={() => {
                        setMultiSelected(prev => {
                          const next = new Set(prev);
                          next.has(idx) ? next.delete(idx) : next.add(idx);
                          return next;
                        });
                      }}
                      className={['w-full px-5 py-4 rounded-3xl text-left text-sm leading-snug transition-all duration-200 flex items-start gap-3',
                        checked
                          ? 'bg-[#2a1e14] border border-[#c46a3e] text-[#f5ede3]'
                          : 'bg-[#2a2318] border border-transparent text-[#d4cfc8] active:scale-[0.98]',
                      ].join(' ')}>
                      <span className={['mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border transition-colors',
                        checked ? 'bg-[#c46a3e] border-[#c46a3e]' : 'border-[#4a3f35]',
                      ].join(' ')}>
                        {checked && <span className="text-white text-xs font-bold">✓</span>}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
              <div className="w-full max-w-sm mx-auto">
                <button
                  onClick={handleMultiNext}
                  disabled={multiSelected.size === 0}
                  className="w-full py-4 rounded-3xl font-semibold text-sm transition-all duration-200 disabled:opacity-30 bg-[#c46a3e] text-white active:scale-[0.98]">
                  Дальше
                </button>
              </div>
            </>
          )}

          {/* Формат C — Scale */}
          {qtype === 'scale' && (
            <>
              <h2 className="text-xl font-semibold text-[#f5ede3] leading-snug mb-10 max-w-sm mx-auto w-full">
                {question.question_text}
              </h2>
              <div className="w-full max-w-sm mx-auto mb-10">
                {/* Метки краёв */}
                <div className="flex justify-between mb-5 gap-2">
                  <span className={['text-xs leading-tight max-w-[40%] transition-colors', scaleValue <= 2 ? 'text-[#c46a3e] font-medium' : 'text-[#6a5a50]'].join(' ')}>
                    {question.scale_left}
                  </span>
                  <span className={['text-xs leading-tight max-w-[40%] text-right transition-colors', scaleValue >= 4 ? 'text-[#c46a3e] font-medium' : 'text-[#6a5a50]'].join(' ')}>
                    {question.scale_right}
                  </span>
                </div>
                {/* Слайдер */}
                <input
                  type="range" min="1" max="5" step="1"
                  value={scaleValue}
                  onChange={e => setScaleValue(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full outline-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #c46a3e ${(scaleValue - 1) * 25}%, #3d352a ${(scaleValue - 1) * 25}%)`,
                  }}
                />
                {/* Точки */}
                <div className="flex justify-between mt-3 px-0.5">
                  {[1,2,3,4,5].map(v => (
                    <button key={v} onClick={() => setScaleValue(v)}
                      className={['w-7 h-7 rounded-full text-xs font-semibold transition-all duration-200',
                        scaleValue === v ? 'bg-[#c46a3e] text-white scale-110' : 'bg-[#2a2318] text-[#6a5a50]',
                      ].join(' ')}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-full max-w-sm mx-auto">
                <button
                  onClick={handleScaleNext}
                  className="w-full py-4 rounded-3xl bg-[#c46a3e] text-white font-semibold text-sm active:scale-[0.98] transition-all duration-200">
                  Дальше
                </button>
              </div>
            </>
          )}
        </main>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Загрузка: анализ ответов (с обработкой ошибок)
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'analyzing') {
    if (analyzeError) return (
      <main className="min-h-screen bg-[#f9f5f0] flex flex-col items-center justify-center px-5 text-center">
        <span className="text-5xl mb-5">🌿</span>
        <p className="text-[#2d2520] font-semibold text-lg mb-2">Что-то пошло не так</p>
        <p className="text-[#8b7b6f] text-sm leading-relaxed max-w-xs mb-8">{analyzeError}</p>
        <button onClick={() => { setAnalyzeError(null); startResultGeneration(resultPayload); }}
          className="w-full max-w-xs py-4 rounded-3xl bg-[#c46a3e] text-white font-semibold shadow-md shadow-[#dcc9ba] mb-4">
          Попробовать снова
        </button>
        <button onClick={goToStart} className="text-[#8b7b6f] text-sm">
          ← В начало
        </button>
      </main>
    );

    return (
      <WaitScreen
        title="Анализируем твои ответы"
        stages={ANALYZING_STAGES}
        estimatedMs={22000}
        aiDone={loadingAiDone}
        onComplete={() => loadingProceedRef.current?.()}
        showReturn={showReturnLink}
        onGoHome={goToStart}
      />
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН РЕЗУЛЬТАТОВ
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'result' && resultData) {
    const {
      block1_mirror, block2_problem, block3_pointB,
      block4_lose, questions, cta_button_targeted, action_step,
    } = resultData;
    const chart_root   = block2_problem?.chart_root  ?? {};
    const before_after = block3_pointB?.before_after ?? {};
    const canSubmitLead = leadName.trim() && (leadTelegram.trim() || leadPhone.trim()) && consentData && consentMarketing;

    return (
      <>
        {IOSOverlay}

        {/* ── Попап: ИИ-чат ─────────────────────────────────────────────── */}
        {showChatModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowChatModal(false); }}>
            <div className="w-full max-w-sm bg-[#f9f5f0] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: '82vh' }}>
              <div className="flex justify-between items-center px-5 py-4 border-b border-[#e8dcd0] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌷</span>
                  <span className="font-semibold text-[#2d2520] text-sm">ИИ-родолог</span>
                </div>
                <button onClick={() => setShowChatModal(false)}
                  className="w-8 h-8 rounded-full bg-[#3d352a] flex items-center justify-center text-[#8b7b6f] text-sm hover:bg-stone-200 transition-colors">
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {suggestedAnswers.length === 0 && (
                  <p className="text-[#8b7b6f] text-xs text-center mb-4">Нажми на вопрос, чтобы получить ответ</p>
                )}
                <div className="flex flex-col gap-2 mb-4">
                  {questions?.map((q, i) => {
                    const isAsked   = askedQuestions.has(i);
                    const isLoading = loadingQuestion === i;
                    return (
                      <button key={i} onClick={() => askSuggestedQuestion(q, i)}
                        disabled={isAsked || loadingQuestion !== null}
                        className={[
                          'w-full px-4 py-3.5 rounded-2xl text-left text-sm leading-snug transition-all border',
                          isAsked
                            ? 'bg-[#fff9f4] text-[#9b8b7f] border-[#e8dcd0] cursor-default'
                            : loadingQuestion !== null
                            ? 'bg-[#fff9f4] text-[#9b8b7f] border-[#e8dcd0] cursor-not-allowed'
                            : 'bg-[#fff9f4] text-[#5a4a42] border-[#dcc9ba] hover:bg-[#fff9f4] hover:border-[#c46a3e] active:scale-[0.98] shadow-sm',
                        ].join(' ')}>
                        {isLoading
                          ? <span className="flex items-center gap-2 text-[#c46a3e]"><span className="w-1.5 h-1.5 rounded-full bg-[#d97a4e] animate-pulse inline-block" />Думаю...</span>
                          : <span>💬 {q}</span>
                        }
                      </button>
                    );
                  })}
                </div>
                {suggestedAnswers.map((item, i) => (
                  <div key={i} className="bg-[#fff9f4] rounded-3xl rounded-tl-md p-4 border border-[#e8dcd0] shadow-sm mb-3">
                    <p className="text-xs text-[#c46a3e] mb-2 leading-snug">💬 {item.question}</p>
                    <p className="text-[#5a4a42] text-sm leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        )}


        {/* ── Основной экран ────────────────────────────────────────────── */}
        <main className="min-h-screen bg-[#f9f5f0] pb-20">

          {/* Шапка */}
          <div className="px-5 pt-8 flex items-center justify-between mb-8">
            <button onClick={goToStart} className="text-[#8b7b6f] text-sm hover:text-[#5a4a42] transition-colors">
              ← В начало
            </button>
            <div className="flex items-center gap-2 bg-[#fff9f4] border border-rose-100 rounded-2xl px-3 py-1.5 shadow-sm">
              <span>{topicObj?.emoji}</span>
              <span className="text-[#5a4a42] text-sm font-medium">{topicObj?.label}</span>
            </div>
          </div>

          {/* Заголовок разбора */}
          <div className="px-5 mb-10 max-w-sm mx-auto text-center">
            <div className="w-14 h-14 rounded-full bg-[#3d352a] flex items-center justify-center mx-auto mb-4 shadow-sm">
              <span className="text-3xl">🌷</span>
            </div>
            <h2 className="text-xl font-semibold text-stone-800 mb-1.5">Твой разбор готов</h2>
            <p className="text-[#8b7b6f] text-[13px]">Читай внимательно - это про тебя</p>
          </div>

          {/* Блок 1: Зеркало */}
          <div className="px-5 max-w-sm mx-auto mb-4">
            <div className="bg-[#fff9f4] rounded-3xl px-6 py-5 shadow-sm border border-[#e8dcd0]">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-[#f0ebe6] flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🪞</span>
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c46a3e] mb-0.5">Зеркало</p>
                  <h3 className="text-stone-800 font-semibold text-[15px] leading-snug">Твоя ситуация сейчас</h3>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                {block1_mirror?.points?.map((point, i) => (
                  <div key={i}>
                    {i > 0 && <div className="border-t border-dashed border-[#e8dcd0] mb-5" />}
                    {point.said ? (
                      <>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b7b6f]">Ты сказала</span>
                        </div>
                        <div className="bg-[#f0ebe6] border-l-2 border-[#8b7b6f] rounded-r-xl pl-4 pr-4 py-3 mb-3">
                          <p className="text-[#5a4a42] text-[14px] leading-[1.65] italic">"{point.said}"</p>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c46a3e] mb-1.5">Поэтому</p>
                        <p className="text-[#5a4a42] text-[15px] leading-[1.7]">{point.because}</p>
                      </>
                    ) : (
                      <p className="text-[#5a4a42] text-[15px] leading-[1.7]">{point.text}</p>
                    )}
                  </div>
                ))}
              </div>

              {block1_mirror?.conclusion && (
                <div className="mt-5 pt-4 border-t border-[#e8dcd0]">
                  <div className="bg-[#fff3ec] border border-[#dcc9ba] rounded-2xl px-4 py-3">
                    <p className="text-[#5a4a42] text-[14px] leading-[1.65]">{block1_mirror.conclusion}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Блок 2: Ключевая проблема */}
          <div className="px-5 max-w-sm mx-auto mb-6">
            <div className="bg-[#fff9f4] rounded-3xl px-6 py-5 shadow-sm border border-[#c46a3e]/30">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-[#3d352a] flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">⚓</span>
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c46a3e] mb-0.5">Почему пока не получается</p>
                  <h3 className="text-stone-800 font-semibold text-[15px] leading-snug">Вот что тебя держит</h3>
                </div>
              </div>

              {block2_problem?.title && (
                <div className="bg-[#fff3ec] border border-[#c46a3e]/40 rounded-2xl px-4 py-3.5 mb-4">
                  <p className="text-[#2d2520] font-semibold text-[16px] leading-snug">{block2_problem.title}</p>
                </div>
              )}

              <p className="text-[#5a4a42] text-[15px] leading-[1.7] mb-5">{block2_problem?.mechanism}</p>

              {chart_root.surface && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 h-px bg-[#e8dcd0]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b7b6f] flex-shrink-0">Как это устроено внутри</span>
                    <div className="flex-1 h-px bg-[#e8dcd0]" />
                  </div>
                  <div className="flex flex-col items-center gap-0">
                    <div className="w-full bg-white border border-[#e8dcd0] rounded-2xl px-4 py-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-stone-300 flex-shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b7b6f]">Снаружи</span>
                      </div>
                      <p className="text-stone-500 text-[14px] leading-snug">{chart_root.surface}</p>
                    </div>
                    <div className="w-px h-3 bg-gradient-to-b from-stone-200 to-[#d97a4e]" />
                    <div className="w-full bg-white border border-[#dcc9ba] rounded-2xl px-4 py-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-[#d97a4e] flex-shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c46a3e]">Глубже</span>
                      </div>
                      <p className="text-[#5a4a42] text-[14px] leading-snug">{chart_root.deep}</p>
                    </div>
                    <div className="w-px h-3 bg-gradient-to-b from-[#d97a4e] to-[#c46a3e]" />
                    <div className="w-full bg-[#2d2520] rounded-2xl px-4 py-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">🌱</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c46a3e]">Родовой корень</span>
                      </div>
                      <p className="text-[#f5ede3] text-[14px] font-semibold leading-snug">{chart_root.root}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Блок 3: Точка Б */}
          <div className="px-5 max-w-sm mx-auto mb-6">
            <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-3xl px-6 py-5 shadow-sm border border-rose-100">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-white/70 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">✨</span>
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-400 mb-0.5">Твоё желаемое</p>
                  <h3 className="text-rose-800 font-semibold text-[15px] leading-snug">Чего ты на самом деле хочешь</h3>
                </div>
              </div>

              <p className="text-[#5a4a42] text-[15px] leading-[1.7] mb-5">{block3_pointB?.text}</p>

              {block3_pointB?.superpower && (
                <div className="bg-[#fffbf0] border border-amber-200 rounded-2xl px-4 py-3.5 mb-5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-base">💛</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-500">Твоя суперсила</span>
                  </div>
                  <p className="text-[#5a4a42] text-[14px] leading-[1.65]">{block3_pointB.superpower}</p>
                </div>
              )}

              {before_after.now && before_after.want && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 h-px bg-rose-100" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-300 flex-shrink-0">Твой путь</span>
                    <div className="flex-1 h-px bg-rose-100" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="bg-white/60 border border-rose-100 rounded-2xl px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8b7b6f] mb-1">Сейчас</p>
                      <p className="text-[#5a4a42] text-[14px] leading-snug">{before_after.now}</p>
                    </div>
                    <div className="flex justify-center">
                      <span className="text-rose-300 text-lg">↓</span>
                    </div>
                    <div className="bg-white border border-rose-200 rounded-2xl px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-rose-400 mb-1">Хочу</p>
                      <p className="text-[#2d2520] text-[14px] leading-snug font-medium">{before_after.want}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Блок 4: без заголовка */}
          <div className="px-5 max-w-sm mx-auto mb-4">
            <div className="bg-[#fff9f4] rounded-3xl px-6 py-6 shadow-sm border border-[#e8dcd0]">
              <p className="text-[#5a4a42] text-[15px] leading-[1.8]">{block4_lose}</p>
            </div>
          </div>

          {/* Кнопка ИИ-чата скрыта, раскомментировать если нужно
          <div className="px-5 max-w-sm mx-auto mb-6 text-center">
            <button onClick={() => setShowChatModal(true)}
              className="inline-flex items-center gap-2 text-[#c46a3e] text-sm hover:text-rose-500 transition-colors">
              <span>💬</span>
              <span className="underline underline-offset-2">Задать вопрос ИИ-родологу</span>
            </button>
          </div>
          */}

          {/* Блок 5: Вопросы + форма + Куда копать */}
          <div className="px-5 max-w-sm mx-auto mb-8">

            {/* Шаг 1: Вопросы (скрываются после отправки формы) */}
            {!showActionStep && (
              <div className="mb-2">
                <p className="text-[#2d2520] font-semibold text-[17px] leading-snug mb-2">
                  Хочешь получить конкретный план, как это изменить?
                </p>
                <p className="text-[#8b7b6f] text-[14px] leading-relaxed mb-5">
                  Выбери вопрос, который волнует больше всего - я подготовлю подробные рекомендации и пошаговый план лично для тебя.
                </p>

                <div className="flex flex-col gap-3 mb-5">
                  {questions?.map((q, i) => {
                    const isSelected = selectedQuestion === i;
                    return (
                      <button key={i}
                        onClick={() => setSelectedQuestion(isSelected ? null : i)}
                        className={[
                          'w-full px-5 py-4 rounded-3xl text-left text-[15px] font-medium leading-snug transition-all active:scale-[0.98] border',
                          isSelected
                            ? 'bg-[#c46a3e] text-white border-[#c46a3e] shadow-md shadow-[#dcc9ba]'
                            : 'bg-[#fff9f4] text-[#2d2520] border-[#dcc9ba] shadow-sm hover:border-[#c46a3e]',
                        ].join(' ')}>
                        <span className="flex items-center justify-between gap-3">
                          <span>{q}</span>
                          <span className="text-lg flex-shrink-0">{isSelected ? '✓' : '→'}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Якорь скролла — статичный, всегда в DOM */}
                <div ref={leadFormRef} />

                {/* Шаг 2: Форма — раскрывается после выбора вопроса */}
                <div style={{
                  maxHeight: selectedQuestion !== null ? '700px' : '0px',
                  opacity:   selectedQuestion !== null ? 1 : 0,
                  overflow:  'hidden',
                  transition: 'max-height 0.5s ease-in-out, opacity 0.35s ease-in-out',
                }}>
                  <div className="bg-[#fff9f4] border border-[#e8dcd0] rounded-3xl px-5 py-5 flex flex-col gap-4">
                    <p className="text-[#5a4a42] text-[14px] leading-relaxed">
                      Заполни - и я подготовлю подробный разбор с конкретными шагами. А ещё передам твою анкету специалисту, чтобы на встрече не тратить время на объяснения.
                    </p>
                    <input type="text" value={leadName} onChange={e => setLeadName(e.target.value)}
                      placeholder="Твоё имя"
                      className="w-full px-4 py-3.5 rounded-2xl border border-[#dcc9ba] bg-white text-[#2d2520] text-sm focus:outline-none focus:border-[#c46a3e] placeholder-stone-300" />
                    <input type="text" value={leadTelegram} onChange={e => setLeadTelegram(e.target.value)}
                      placeholder="Телеграм (@username)"
                      className="w-full px-4 py-3.5 rounded-2xl border border-[#dcc9ba] bg-white text-[#2d2520] text-sm focus:outline-none focus:border-[#c46a3e] placeholder-stone-300" />
                    <input type="tel" value={leadPhone} onChange={e => setLeadPhone(e.target.value)}
                      placeholder="Или телефон"
                      className="w-full px-4 py-3.5 rounded-2xl border border-[#dcc9ba] bg-white text-[#2d2520] text-sm focus:outline-none focus:border-[#c46a3e] placeholder-stone-300" />
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={consentData} onChange={e => setConsentData(e.target.checked)}
                        className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#c46a3e]" />
                      <span className="text-[#8b7b6f] text-xs leading-relaxed">
                        Я даю <a href="https://ifpp-inc.ru/soglasie1" target="_blank" rel="noopener noreferrer" className="text-[#c46a3e] underline">согласие на обработку персональных данных</a> в соответствии с <a href="https://ifpp-inc.ru/politikanew" target="_blank" rel="noopener noreferrer" className="text-[#c46a3e] underline">Политикой</a>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={consentMarketing} onChange={e => setConsentMarketing(e.target.checked)}
                        className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#c46a3e]" />
                      <span className="text-[#8b7b6f] text-xs leading-relaxed">
                        Я даю <a href="https://ifpp-inc.ru/soglasie2" target="_blank" rel="noopener noreferrer" className="text-[#c46a3e] underline">согласие на получение рассылок</a>
                      </span>
                    </label>
                    <button onClick={submitLeadForm} disabled={!canSubmitLead || leadSubmitting}
                      className={[
                        'w-full py-4 rounded-3xl font-semibold text-base transition-all',
                        canSubmitLead && !leadSubmitting
                          ? 'bg-[#c46a3e] text-white shadow-md shadow-[#dcc9ba] active:scale-[0.98]'
                          : 'bg-[#e8dcd0] text-[#9b8b7f] cursor-not-allowed',
                      ].join(' ')}>
                      {leadSubmitting ? 'Отправляем...' : 'Получить план →'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Шаг 3: Куда копать — раскрывается после отправки формы */}
            <div ref={revealSectionRef} style={{
              maxHeight: showActionStep ? '1600px' : '0px',
              opacity:   showActionStep ? 1 : 0,
              overflow:  'hidden',
              transition: 'max-height 0.75s ease-in-out, opacity 0.5s ease-in-out 0.1s',
            }}>

              {/* Заголовок рекомендации */}
              <div style={{ animation: showActionStep ? 'unlockFadeUp 0.4s ease both' : 'none' }}
                className="mb-4 bg-[#fff3ec] border border-[#c46a3e]/30 rounded-2xl px-5 py-4 flex items-center gap-3">
                <div className="w-1 self-stretch bg-[#c46a3e] rounded-full flex-shrink-0" />
                <div>
                  <p className="text-[#2d2520] font-semibold text-[15px] leading-snug">Твои рекомендации готовы</p>
                  <p className="text-[#8b7b6f] text-xs mt-0.5">Персональный разбор специально для тебя</p>
                </div>
              </div>

              <div style={{ animation: showActionStep ? 'unlockFadeUp 0.4s ease 0.15s both' : 'none' }}
                className="flex flex-col gap-4 mb-4">

                {/* Блок 1: С чем ты столкнулась */}
                {action_step?.psychology && (
                  <div className="bg-[#fff9f4] rounded-3xl px-6 py-5 shadow-sm border border-[#e8dcd0]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c46a3e] mb-2">С чем ты столкнулась</p>
                    <p className="text-[#5a4a42] text-[15px] leading-[1.8]">{action_step.psychology}</p>
                  </div>
                )}

                {/* Блок 2: Как с этим работать */}
                {action_step?.path && (
                  <div className="bg-[#fff9f4] rounded-3xl px-6 py-5 shadow-sm border border-[#e8dcd0]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c46a3e] mb-2">Как с этим работать</p>
                    <p className="text-[#5a4a42] text-[15px] leading-[1.8]">{action_step.path}</p>
                  </div>
                )}

                {/* Блок 3: Первый шаг */}
                {action_step?.first_step && (
                  <div className="bg-[#fff3ec] border border-[#c46a3e]/40 rounded-3xl px-6 py-5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c46a3e] mb-2">Первый шаг к изменениям</p>
                    <p className="text-[#2d2520] text-[15px] font-semibold leading-snug">{action_step.first_step}</p>
                  </div>
                )}
              </div>

              <div className="bg-[#fff9f4] rounded-3xl px-6 py-5 border border-[#e8dcd0] shadow-sm">
                {action_step?.transition && (
                  <p className="text-[#5a4a42] text-[14px] leading-relaxed mb-5">{action_step.transition}</p>
                )}
                <div className="flex flex-col gap-3">
                  <button onClick={handleYesConsultation}
                    className="w-full py-4 rounded-3xl bg-[#c46a3e] text-white font-semibold text-base shadow-md shadow-[#dcc9ba] active:scale-[0.98] transition-transform">
                    Записаться на встречу →
                  </button>
                  <button onClick={() => setScreen('telegram')}
                    className="w-full py-3 rounded-3xl text-[#8b7b6f] text-sm active:scale-[0.98] transition-transform">
                    Перейти в телеграм-канал
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
      <main className="h-screen bg-[#f9f5f0] flex flex-col overflow-hidden">

        {/* Шапка */}
        <div className="flex-shrink-0 px-5 pt-8 pb-4 flex items-center justify-between border-b border-[#e8dcd0] bg-[#f9f5f0]">
          <button onClick={() => setScreen('result')}
            className="text-[#8b7b6f] text-sm hover:text-[#5a4a42] transition-colors">
            ← Назад
          </button>
          <div className="flex items-center gap-2 bg-[#fff9f4] border border-rose-100 rounded-2xl px-3 py-1.5 shadow-sm">
            <span>{topicObj?.emoji}</span>
            <span className="text-[#5a4a42] text-sm font-medium">{topicObj?.label}</span>
          </div>
        </div>

        {/* Аватар */}
        <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 border-b border-[#e8dcd0] bg-[#f9f5f0]">
          <div className="w-10 h-10 rounded-full bg-[#3d352a] flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-xl">🌷</span>
          </div>
          <div>
            <p className="text-[#2d2520] text-sm font-medium">ИИ-ассистент</p>
            <p className="text-[#8b7b6f] text-xs">Родовой разбор</p>
          </div>
        </div>

        {/* Лента сообщений */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={[
                'max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-[#c46a3e] text-white rounded-3xl rounded-tr-md'
                  : 'bg-[#fff9f4] text-[#5a4a42] border border-[#e8dcd0] shadow-sm rounded-3xl rounded-tl-md',
              ].join(' ')}>
                {msg.content}
              </div>
            </div>
          ))}

          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-[#fff9f4] border border-[#e8dcd0] shadow-sm px-5 py-4 rounded-3xl rounded-tl-md flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-[#e8dcd0] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#e8dcd0] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#e8dcd0] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* CTA после 3 вопросов */}
        {showCta && (
          <div className="flex-shrink-0 px-5 pt-2 pb-3 bg-[#f9f5f0]">
            <button
              onClick={() => setScreen('offer')}
              className="w-full py-4 rounded-3xl bg-[#c46a3e] text-white font-semibold text-base shadow-md shadow-[#dcc9ba] active:scale-[0.98] transition-transform"
            >
              Узнать, что делать дальше →
            </button>
          </div>
        )}

        {/* Поле ввода */}
        <div className="flex-shrink-0 px-4 py-3 bg-[#fff9f4] border-t border-[#e8dcd0]">
          {limitReached ? (
            <div className="w-full px-4 py-3 rounded-2xl bg-[#fff9f4] text-[#9b8b7f] text-sm text-center border border-[#e8dcd0]">
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
                className="flex-1 px-4 py-3 rounded-2xl border border-[#dcc9ba] bg-[#fff9f4] text-[#2d2520] text-sm resize-none focus:outline-none focus:border-[#c46a3e] placeholder-stone-300 disabled:opacity-40 max-h-28 overflow-y-auto"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || isChatLoading}
                className="w-11 h-11 rounded-2xl bg-[#c46a3e] text-white flex items-center justify-center flex-shrink-0 shadow-sm active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
      <main className="min-h-screen bg-[#f9f5f0] flex flex-col px-5 pt-8 pb-10">
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => setScreen('chat')}
            className="text-[#8b7b6f] text-sm hover:text-[#5a4a42] transition-colors">
            ← Назад
          </button>
          <div className="flex items-center gap-2 bg-[#fff9f4] border border-rose-100 rounded-2xl px-3 py-1.5 shadow-sm">
            <span>{topicObj?.emoji}</span>
            <span className="text-[#5a4a42] text-sm font-medium">{topicObj?.label}</span>
          </div>
        </div>

        <div className="flex flex-col max-w-sm mx-auto w-full flex-1">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#3d352a] flex items-center justify-center mx-auto mb-5 shadow-sm">
              <span className="text-3xl">🌱</span>
            </div>
            <h2 className="text-2xl font-semibold text-[#2d2520] leading-snug mb-4">
              Твой родовой сценарий<br />поддаётся проработке
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed">
              ИИ подсветил лишь верхушку айсберга. Чтобы навсегда убрать этот блок из жизни, нужен точечный разбор со специалистом.
            </p>
          </div>

          {resultData?.ancestral_block && (
            <div className="bg-[#fff9f4] rounded-3xl p-5 shadow-sm border border-rose-50 mb-8">
              <p className="text-xs text-[#8b7b6f] uppercase tracking-wide mb-3">Что стоит за твоей ситуацией</p>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">🔗</span>
                <p className="text-[#5a4a42] text-sm leading-relaxed italic">
                  «{resultData.ancestral_block.split('.')[0]}»
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-auto">
            <button onClick={() => setScreen('assistant')}
              className="w-full py-4 rounded-3xl bg-[#c46a3e] text-white font-semibold text-base shadow-md shadow-[#dcc9ba] active:scale-[0.98] transition-transform leading-snug">
              Записаться на разбор<br />к ассистенту эксперта →
            </button>
            <button onClick={() => setScreen('telegram')}
              className="w-full py-4 rounded-3xl bg-[#fff9f4] text-stone-500 font-medium text-sm border border-[#dcc9ba] active:scale-[0.98] transition-transform shadow-sm">
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
  // ══════════════════════════════════════════════════════════════════════════
  // ЭКРАН ВСТРЕЧИ
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'meeting') {
    const WHAT_ITEMS = [
      { icon: '📋', text: 'Специалист уже видел твой разбор - не нужно ничего объяснять заново, сразу к сути' },
      { icon: '🔍', text: 'Разберёт твою ситуацию глубже, чем смог квиз' },
      { icon: '🎯', text: 'Покажет, что именно держит тебя на месте' },
      { icon: '💬', text: 'Даст конкретные рекомендации именно под тебя и ответит на вопросы' },
    ];
    const HOW_ITEMS = [
      { icon: '📹', label: 'Формат', text: 'Видеозвонок или обычный звонок. Уточним при записи' },
      { icon: '⏱', label: 'Время', text: '20 минут, без воды и лишних слов' },
      { icon: '👤', label: 'Кто', text: 'Один на один с живым специалистом' },
      { icon: '🤝', label: 'Атмосфера', text: 'Без давления - помогаем разобраться, не навязываем' },
    ];
    const FEARS = [
      { q: 'Это правда бесплатно?', a: 'Да, совсем. Никаких скрытых условий и обязательств.' },
      { q: 'Что если я передумаю?', a: 'Можно отменить или перенести в любой момент - без вопросов.' },
      { q: 'Будут ли что-то продавать?', a: 'Специалист на встрече помогает разобраться. Если захочешь продолжить - предложат варианты. Но давить не будут.' },
    ];

    return (
      <>
        {IOSOverlay}
        <main className="min-h-screen bg-[#0f0c09] flex flex-col px-5 pb-16" style={{ paddingTop: 'max(32px, env(safe-area-inset-top, 32px))' }}>
          <div className="flex items-center mb-8">
            <button onClick={() => setScreen('result')} className="text-[#6a5a50] text-sm">
              ← Назад
            </button>
          </div>

          <div className="w-full max-w-sm mx-auto flex flex-col">

            {/* Блок подтверждения */}
            <div className="bg-[#1a2e14] border border-[#2a4a1e] rounded-3xl px-5 py-5 mb-8 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#2a4a1e] flex items-center justify-center flex-shrink-0 text-[#6ecf47] font-bold text-lg">
                ✓
              </div>
              <div>
                <p className="text-[#f5ede3] font-semibold text-[17px] leading-snug mb-1">Вы записались на встречу!</p>
                <p className="text-[#7a9e72] text-sm leading-relaxed">С вами свяжется специалист, чтобы выбрать удобное время и ответить на ваши вопросы. А пока посмотрите, как проходит встреча.</p>
              </div>
            </div>

            {/* Заголовок */}
            <div className="text-center mb-8">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#c46a3e] mb-4">
                Бесплатная встреча
              </p>
              <h1 className="text-[26px] font-semibold text-[#f5ede3] leading-tight mb-3">
                Твоя встреча с родологом
              </h1>
              <p className="text-[#8b7b6f] text-sm leading-relaxed">
                20 минут разговора. Ты поймёшь, что именно мешает двигаться вперёд
              </p>
            </div>

            {/* Что будет */}
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

            {/* Как проходит */}
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

            {/* Страхи */}
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

            {/* Кнопки действий */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setScreen('result')}
                className="w-full py-4 rounded-3xl bg-[#c46a3e] text-white font-semibold text-base shadow-lg active:scale-[0.98] transition-transform"
              >
                Поняла, вернуться к разбору →
              </button>
              <button
                onClick={generateAndDownloadPDF}
                className="w-full py-4 rounded-3xl bg-[#2a2318] border border-[#3d352a] text-[#d4cfc8] font-medium text-sm active:scale-[0.98] transition-transform"
              >
                Сохранить разбор в PDF
              </button>
            </div>

          </div>
        </main>
      </>
    );
  }

  if (screen === 'assistant') return (
    <>
      {IOSOverlay}
      <main className="min-h-screen bg-[#f9f5f0] flex flex-col px-5 pt-8 pb-10">
        <div className="flex items-center mb-10">
          <button onClick={() => setScreen(resultData ? 'result' : 'offer')}
            className="text-[#8b7b6f] text-sm hover:text-[#5a4a42] transition-colors">
            ← Назад
          </button>
        </div>

        <div className="flex flex-col items-center text-center max-w-sm mx-auto w-full flex-1">
          <div className="w-20 h-20 rounded-full bg-[#3d352a] flex items-center justify-center mb-6 shadow-sm">
            <span className="text-4xl">🌷</span>
          </div>
          <h2 className="text-2xl font-semibold text-[#2d2520] mb-3 leading-snug">
            Прекрасный выбор!
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed max-w-xs mb-5">
            Переходим в Telegram для связи с ассистентом эксперта.
          </p>

          <div className="bg-[#fff9f4] border border-rose-100 rounded-3xl px-5 py-4 mb-10 w-full text-left">
            <p className="text-[#5a4a42] text-sm leading-relaxed">
              Напиши в чат кодовое слово{' '}
              <span className="font-bold text-rose-500">«РОД»</span>,
              чтобы зафиксировать за собой место на бесплатный разбор.
            </p>
          </div>

          <div className="w-full flex flex-col gap-3 mt-auto">
            <a href="https://t.me/assistant_username_placeholder" target="_blank" rel="noopener noreferrer"
              className="w-full py-4 rounded-3xl bg-[#c46a3e] text-white font-semibold text-base shadow-md shadow-[#dcc9ba] active:scale-[0.98] transition-transform text-center block">
              Открыть Telegram ассистента →
            </a>
            <button onClick={goToStart} className="text-[#8b7b6f] text-sm py-2">
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
      <main className="min-h-screen bg-[#f9f5f0] flex flex-col px-5 pt-8 pb-10">
        <div className="flex items-center mb-10">
          <button onClick={() => setScreen(resultData ? 'result' : 'offer')}
            className="text-[#8b7b6f] text-sm hover:text-[#5a4a42] transition-colors">
            ← Назад
          </button>
        </div>

        <div className="flex flex-col items-center text-center max-w-sm mx-auto w-full flex-1">
          <div className="w-20 h-20 rounded-full bg-[#e8f4fd] flex items-center justify-center mb-6 shadow-sm">
            <span className="text-4xl">✈️</span>
          </div>
          <h2 className="text-2xl font-semibold text-[#2d2520] mb-3 leading-snug">
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
            <button onClick={goToStart} className="text-[#8b7b6f] text-sm py-2">
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
        <main className="min-h-screen bg-[#f9f5f0] flex flex-col px-5 pt-8 pb-10">
          <div className="flex items-center justify-between mb-8">
            <button onClick={goBack} className="text-[#8b7b6f] text-sm hover:text-[#5a4a42] transition-colors">← Назад</button>
            <div className="flex items-center gap-2 bg-[#fff9f4] border border-rose-100 rounded-2xl px-3 py-1.5 shadow-sm">
              <span>{topicObj?.emoji}</span>
              <span className="text-[#5a4a42] text-sm font-medium">{topicObj?.label}</span>
            </div>
          </div>

          <div className="w-12 h-12 rounded-full bg-[#3d352a] flex items-center justify-center mb-5 shadow-sm mx-auto">
            <span className="text-2xl">🌷</span>
          </div>

          <p className="text-[#5a4a42] text-center text-sm leading-relaxed mb-6 max-w-sm mx-auto">
            Я помогу тебе разобраться. Чем подробнее ты опишешь, что сейчас происходит
            в этой сфере, тем точнее ИИ сможет подсветить родовые сценарии.
          </p>

          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Опиши свою ситуацию..."
            className="w-full max-w-sm mx-auto rounded-3xl border border-[#dcc9ba] bg-[#fff9f4] p-5 text-[#2d2520] text-sm leading-relaxed placeholder-stone-300 resize-none focus:outline-none focus:border-[#c46a3e] shadow-sm min-h-[180px]" />

          <MicRow setter={setText} />

          <div className="w-full max-w-sm mx-auto mt-auto">
            <button onClick={handleContinue} disabled={!canContinue}
              className={['w-full py-4 rounded-3xl font-semibold text-lg transition-all duration-200',
                canContinue ? 'bg-[#c46a3e] text-white shadow-md shadow-[#dcc9ba] active:scale-[0.98]'
                            : 'bg-[#3d352a] text-[#9b8b7f] cursor-not-allowed'].join(' ')}>
              Продолжить →
            </button>
            {(isRecording || isTranscribing) && (
              <p className="text-center text-xs text-[#8b7b6f] mt-2">
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
      <main className="min-h-screen bg-[#f9f5f0] flex flex-col items-center px-5 pt-12 pb-10">
        <div className="w-16 h-16 rounded-full bg-[#3d352a] flex items-center justify-center mb-6 shadow-sm">
          <span className="text-3xl">🌷</span>
        </div>
        <h1 className="text-2xl font-semibold text-[#2d2520] text-center leading-snug mb-3">
          О чём ты думаешь чаще всего прямо сейчас?
        </h1>
        <p className="text-[#8b7b6f] text-sm text-center leading-relaxed mb-10 max-w-xs">
          Выбери ту сферу, куда мысли возвращаются снова и снова. Где есть тревога, застревание или ощущение, что что-то идёт не так. Не думай долго. Первый отклик самый точный.
        </p>
        <div className="w-full max-w-sm flex flex-col gap-4">
          {TOPICS.map((t) => (
            <button key={t.id} onClick={() => selectTopic(t.id)}
              className={['w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left transition-all duration-200 shadow-sm',
                topic === t.id
                  ? 'bg-[#c46a3e] text-white shadow-[#dcc9ba] shadow-md scale-[1.02]'
                  : 'bg-[#fff9f4] text-[#5a4a42] hover:bg-[#fff9f4] active:scale-[0.98]',
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
