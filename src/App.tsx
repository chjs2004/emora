import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  Heart,
  BarChart2,
  RotateCcw,
  Sparkles,
  BookOpen,
  Trash2,
} from "lucide-react";
import { analyzeEmotion, CheckInAnswers, EmotionReport } from "./lib/gemini.ts";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface SavedReport extends EmotionReport {
  answers: CheckInAnswers;
  date: string; // ISO
}

// ────────────────────────────────────────────────────────────
// Check-in step definitions
// ────────────────────────────────────────────────────────────
const BODY_OPTIONS = ["많이 피곤해요", "보통이에요", "활기차요"];
const MOOD_OPTIONS = ["슬픔", "불안", "무기력", "보통", "기쁨", "설렘"];
const NEED_OPTIONS = ["혼자만의 시간", "누군가와 대화", "휴식", "활동/움직임", "격려와 응원", "그냥 울고 싶어요"];

const MOOD_COLORS: Record<string, string> = {
  슬픔: "text-blue-400 border-blue-400",
  불안: "text-orange-400 border-orange-400",
  무기력: "text-gray-400 border-gray-400",
  보통: "text-text-dim border-text-dim",
  기쁨: "text-yellow-400 border-yellow-400",
  설렘: "text-pink-400 border-pink-400",
};

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────
function OptionButton({
  label,
  selected,
  onClick,
  colorClass,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  colorClass?: string;
}) {
  const base = "px-5 py-3 border rounded-full text-sm tracking-wide transition-all cursor-pointer select-none";
  const active = selected
    ? `bg-accent/10 border-accent text-accent`
    : `border-border-subtle text-text-dim hover:border-accent/50 hover:text-text-main`;
  return (
    <button onClick={onClick} className={`${base} ${colorClass && selected ? colorClass : active}`}>
      {label}
    </button>
  );
}

function IntensityBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value * 10}%` }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="h-full bg-gradient-to-r from-accent/60 to-accent rounded-full"
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main App
// ────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState<number>(0); // 0=intro, 1-5=questions, 6=analyzing, 7=report
  const [history, setHistory] = useState<SavedReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // answers
  const [bodyState, setBodyState] = useState("");
  const [mood, setMood] = useState("");
  const [emotionDescription, setEmotionDescription] = useState("");
  const [emotionCause, setEmotionCause] = useState("");
  const [currentNeed, setCurrentNeed] = useState("");

  const [report, setReport] = useState<EmotionReport | null>(null);

  useEffect(() => {
    const data = localStorage.getItem("emotion_history");
    if (data) setHistory(JSON.parse(data));
  }, []);

  const saveReport = (r: EmotionReport, answers: CheckInAnswers) => {
    const entry: SavedReport = { ...r, answers, date: new Date().toISOString() };
    const updated = [entry, ...history];
    setHistory(updated);
    localStorage.setItem("emotion_history", JSON.stringify(updated));
  };

  const deleteHistoryItem = (idx: number) => {
    const updated = history.filter((_, i) => i !== idx);
    setHistory(updated);
    localStorage.setItem("emotion_history", JSON.stringify(updated));
    if (historyIndex >= updated.length && updated.length > 0) setHistoryIndex(updated.length - 1);
  };

  const startAnalysis = async () => {
    setStep(6);
    setError(null);
    const answers: CheckInAnswers = { bodyState, mood, emotionDescription, emotionCause, currentNeed };
    try {
      const result = await analyzeEmotion(answers);
      setReport(result);
      saveReport(result, answers);
      setStep(7);
    } catch (e: any) {
      setError(e.message || "분석 중 오류가 발생했습니다.");
      setStep(5);
    }
  };

  const reset = () => {
    setStep(0);
    setBodyState("");
    setMood("");
    setEmotionDescription("");
    setEmotionCause("");
    setCurrentNeed("");
    setReport(null);
    setError(null);
    setShowHistory(false);
  };

  // ── Step validation ──
  const canProceed = () => {
    if (step === 1) return bodyState !== "";
    if (step === 2) return mood !== "";
    if (step === 3) return emotionDescription.trim().length >= 5;
    if (step === 4) return emotionCause.trim().length >= 5;
    if (step === 5) return currentNeed !== "";
    return true;
  };

  const totalSteps = 5;

  return (
    <div className="min-h-screen bg-bg text-text-main font-sans flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-5 flex items-center justify-between border-b border-border-subtle bg-bg/80 backdrop-blur-md">
        <button
          onClick={reset}
          className="font-serif italic text-xl tracking-widest text-accent"
        >
          Emora.
        </button>
        <div className="flex items-center gap-3">
          {step > 0 && step < 6 && (
            <span className="text-[11px] uppercase tracking-widest text-text-dim">
              {step} / {totalSteps}
            </span>
          )}
          <button
            onClick={() => { setShowHistory(!showHistory); setStep(0); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] uppercase tracking-widest transition-all ${showHistory ? "bg-accent text-black border-accent" : "border-border-subtle text-text-dim hover:border-accent hover:text-accent"}`}
          >
            <BookOpen size={13} />
            기록
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">

          {/* ── History View ── */}
          {showHistory && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-2xl"
            >
              <h2 className="font-serif italic text-3xl text-accent mb-8">감정 기록</h2>
              {history.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <BarChart2 size={48} className="mx-auto text-border-subtle" />
                  <p className="text-text-dim italic">아직 기록된 감정 체크인이 없어요.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.length > 1 && (
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => setHistoryIndex(Math.max(0, historyIndex - 1))} disabled={historyIndex === 0} className="p-2 border border-border-subtle rounded-full text-text-dim hover:border-accent hover:text-accent disabled:opacity-30 transition-all">
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-[11px] text-text-dim uppercase tracking-widest">
                        <span className="text-accent font-bold">{historyIndex + 1}</span> / {history.length}
                      </span>
                      <button onClick={() => setHistoryIndex(Math.min(history.length - 1, historyIndex + 1))} disabled={historyIndex === history.length - 1} className="p-2 border border-border-subtle rounded-full text-text-dim hover:border-accent hover:text-accent disabled:opacity-30 transition-all">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                  {(() => {
                    const entry = history[historyIndex];
                    return (
                      <motion.div
                        key={historyIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-surface border border-border-subtle p-8 space-y-6"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-text-dim mb-1">
                              {new Date(entry.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="text-2xl font-serif italic text-accent">{entry.coreEmotion}</div>
                          </div>
                          <button onClick={() => deleteHistoryItem(historyIndex)} className="p-2 text-text-dim hover:text-red-400 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <IntensityBar value={entry.emotionIntensity} />
                        <p className="text-[11px] text-text-dim uppercase tracking-widest">강도 {entry.emotionIntensity}/10</p>
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-accent mb-2">진단</div>
                          <p className="text-sm leading-relaxed text-text-dim font-serif italic">{entry.diagnosis}</p>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-accent mb-2">오늘의 확언</div>
                          <p className="text-sm text-text-main font-serif">{entry.affirmation}</p>
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Intro ── */}
          {!showHistory && step === 0 && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-md space-y-10"
            >
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-full border border-accent/30 flex items-center justify-center mx-auto bg-accent/5">
                  <Heart size={36} className="text-accent" />
                </div>
                <h1 className="font-serif italic text-5xl tracking-[3px] text-accent">Emora.</h1>
                <p className="text-text-dim text-sm leading-relaxed">
                  지금 이 순간의 감정을 함께 살펴봐요.<br />
                  5가지 질문으로 당신의 마음을 진단하고<br />
                  맞춤형 코칭을 제공해 드립니다.
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-3 px-10 py-4 bg-accent text-black text-[11px] uppercase tracking-[0.4em] font-bold hover:brightness-110 transition-all shadow-[0_10px_30px_rgba(212,175,55,0.25)]"
              >
                <Sparkles size={15} />
                감정 체크인 시작
              </button>
              {history.length > 0 && (
                <p className="text-[11px] text-text-dim/50 italic">
                  지금까지 {history.length}번의 체크인 기록이 있어요.
                </p>
              )}
            </motion.div>
          )}

          {/* ── Step 1: 몸 상태 ── */}
          {!showHistory && step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-lg space-y-8">
              <StepHeader step={1} total={totalSteps} title="지금 이 순간, 몸 상태는 어떤가요?" />
              <div className="flex flex-wrap gap-3">
                {BODY_OPTIONS.map(opt => (
                  <OptionButton key={opt} label={opt} selected={bodyState === opt} onClick={() => setBodyState(opt)} />
                ))}
              </div>
              <StepNav step={step} setStep={setStep} canProceed={canProceed()} />
            </motion.div>
          )}

          {/* ── Step 2: 기분 ── */}
          {!showHistory && step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-lg space-y-8">
              <StepHeader step={2} total={totalSteps} title="오늘 전반적인 기분은 어떤가요?" />
              <div className="flex flex-wrap gap-3">
                {MOOD_OPTIONS.map(opt => (
                  <OptionButton key={opt} label={opt} selected={mood === opt} onClick={() => setMood(opt)} colorClass={MOOD_COLORS[opt]} />
                ))}
              </div>
              <StepNav step={step} setStep={setStep} canProceed={canProceed()} />
            </motion.div>
          )}

          {/* ── Step 3: 감정 묘사 ── */}
          {!showHistory && step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-lg space-y-8">
              <StepHeader step={3} total={totalSteps} title="지금 느끼는 감정을 자유롭게 묘사해보세요." subtitle="어떤 표현도 괜찮아요. 단어, 문장, 상황 모두 좋습니다." />
              <textarea
                value={emotionDescription}
                onChange={e => setEmotionDescription(e.target.value)}
                placeholder="예: 이유 없이 마음이 무거운 느낌이에요..."
                rows={5}
                className="w-full bg-surface border border-border-subtle p-5 text-text-main font-serif italic placeholder:text-text-dim/30 outline-none focus:border-accent transition-all resize-none leading-relaxed text-base"
              />
              <StepNav step={step} setStep={setStep} canProceed={canProceed()} />
            </motion.div>
          )}

          {/* ── Step 4: 원인 ── */}
          {!showHistory && step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-lg space-y-8">
              <StepHeader step={4} total={totalSteps} title="그 감정의 원인이 무엇인 것 같나요?" subtitle="잘 모르겠어도 괜찮아요. 떠오르는 것을 적어보세요." />
              <textarea
                value={emotionCause}
                onChange={e => setEmotionCause(e.target.value)}
                placeholder="예: 오늘 친구와 다퉜는데 아직 연락을 못 했어요..."
                rows={5}
                className="w-full bg-surface border border-border-subtle p-5 text-text-main font-serif italic placeholder:text-text-dim/30 outline-none focus:border-accent transition-all resize-none leading-relaxed text-base"
              />
              <StepNav step={step} setStep={setStep} canProceed={canProceed()} />
            </motion.div>
          )}

          {/* ── Step 5: 필요한 것 ── */}
          {!showHistory && step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-lg space-y-8">
              <StepHeader step={5} total={totalSteps} title="지금 가장 필요한 것은 무엇인가요?" />
              <div className="flex flex-wrap gap-3">
                {NEED_OPTIONS.map(opt => (
                  <OptionButton key={opt} label={opt} selected={currentNeed === opt} onClick={() => setCurrentNeed(opt)} />
                ))}
              </div>
              {error && <p className="text-red-400 text-sm italic">{error}</p>}
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-2 px-5 py-3 border border-border-subtle text-text-dim hover:border-accent hover:text-accent transition-all text-sm"
                >
                  <ChevronLeft size={16} />
                  이전
                </button>
                <button
                  onClick={startAnalysis}
                  disabled={!canProceed()}
                  className="flex-1 flex items-center justify-center gap-3 py-4 bg-accent text-black text-[11px] uppercase tracking-[0.4em] font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles size={14} />
                  감정 분석하기
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Analyzing ── */}
          {!showHistory && step === 6 && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-8"
            >
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full border border-accent/20 animate-ping" />
                <div className="w-24 h-24 rounded-full border border-accent/40 flex items-center justify-center">
                  <Loader2 size={36} className="text-accent animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-serif italic text-xl text-accent">감정을 분석하는 중...</p>
                <p className="text-sm text-text-dim">당신의 마음을 깊이 들여다보고 있어요.</p>
              </div>
            </motion.div>
          )}

          {/* ── Report ── */}
          {!showHistory && step === 7 && report && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-2xl space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-3">
                <div className="text-[10px] uppercase tracking-[0.4em] text-text-dim">감정 리포트</div>
                <h2 className="font-serif italic text-5xl text-accent">{report.coreEmotion}</h2>
                <div className="text-[11px] text-text-dim uppercase tracking-widest">감정 강도 {report.emotionIntensity} / 10</div>
                <div className="max-w-xs mx-auto mt-3">
                  <IntensityBar value={report.emotionIntensity} />
                </div>
              </div>

              <div className="w-full h-[1px] bg-border-subtle" />

              {/* Diagnosis */}
              <ReportSection label="감정 진단">
                <p className="text-base leading-loose text-text-dim font-serif italic">{report.diagnosis}</p>
              </ReportSection>

              {/* Background */}
              <ReportSection label="감정 배경">
                <p className="text-base leading-loose text-text-dim font-serif italic">{report.background}</p>
              </ReportSection>

              {/* Coaching */}
              <ReportSection label="맞춤 코칭">
                <ol className="space-y-4">
                  {report.coaching.map((tip, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="text-accent font-bold text-sm mt-0.5 shrink-0">{i + 1}.</span>
                      <p className="text-sm leading-relaxed text-text-main">{tip}</p>
                    </li>
                  ))}
                </ol>
              </ReportSection>

              {/* Affirmation */}
              <div className="bg-accent/5 border border-accent/20 p-6 text-center space-y-2">
                <div className="text-[10px] uppercase tracking-[0.4em] text-accent/70">오늘의 확언</div>
                <p className="font-serif italic text-lg text-accent leading-relaxed">"{report.affirmation}"</p>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-2">
                <button
                  onClick={reset}
                  className="flex-1 flex items-center justify-center gap-2 py-4 border border-border-subtle text-text-dim text-[11px] uppercase tracking-widest hover:border-accent hover:text-accent transition-all"
                >
                  <RotateCcw size={14} />
                  처음으로
                </button>
                <button
                  onClick={() => { setShowHistory(true); setHistoryIndex(0); }}
                  className="flex items-center gap-2 px-6 py-4 border border-border-subtle text-text-dim text-[11px] uppercase tracking-widest hover:border-accent hover:text-accent transition-all"
                >
                  <BookOpen size={14} />
                  기록 보기
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-ping { animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite; }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function StepHeader({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${i < step ? "bg-accent" : "bg-border-subtle"}`} />
        ))}
      </div>
      <h2 className="font-serif text-2xl text-text-main leading-snug">{title}</h2>
      {subtitle && <p className="text-sm text-text-dim">{subtitle}</p>}
    </div>
  );
}

function StepNav({ step, setStep, canProceed }: { step: number; setStep: (n: number) => void; canProceed: boolean }) {
  return (
    <div className="flex items-center gap-4">
      {step > 1 && (
        <button
          onClick={() => setStep(step - 1)}
          className="flex items-center gap-2 px-5 py-3 border border-border-subtle text-text-dim hover:border-accent hover:text-accent transition-all text-sm"
        >
          <ChevronLeft size={16} />
          이전
        </button>
      )}
      <button
        onClick={() => setStep(step + 1)}
        disabled={!canProceed}
        className="flex-1 flex items-center justify-center gap-2 py-4 bg-accent text-black text-[11px] uppercase tracking-[0.3em] font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        다음
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function ReportSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-[0.4em] text-accent font-semibold">{label}</div>
      {children}
    </div>
  );
}
