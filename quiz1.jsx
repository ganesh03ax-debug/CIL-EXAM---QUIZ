const { useState, useEffect, useRef } = React;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const catColor = {
  "Electrical Machines":"bg-blue-100 text-blue-800","Power Systems":"bg-green-100 text-green-800",
  "Circuit Theory":"bg-purple-100 text-purple-800","Power Electronics":"bg-orange-100 text-orange-800",
  "Control Systems":"bg-red-100 text-red-800","Measurements":"bg-yellow-100 text-yellow-800",
  "Electrical Materials":"bg-teal-100 text-teal-800","Quantitative Aptitude":"bg-pink-100 text-pink-800",
  "Reasoning":"bg-indigo-100 text-indigo-800","English":"bg-cyan-100 text-cyan-800","CIL GK":"bg-amber-100 text-amber-800",
};
const lvlColor = { Easy:"text-green-600", Medium:"text-yellow-600", Hard:"text-red-600" };
const tagBg = {
  "🔴 MUST KNOW (CIL 2020)":"bg-red-50 border-red-300 text-red-700",
  "🔴 MUST KNOW (CIL 2017/2025)":"bg-red-50 border-red-300 text-red-700",
  "🔴 MUST KNOW (CIL 2017)":"bg-red-50 border-red-300 text-red-700",
  "🟡 LIKELY":"bg-yellow-50 border-yellow-300 text-yellow-700",
  "🟡 CIL-TRN":"bg-orange-50 border-orange-300 text-orange-700",
};
const fmt = (s) => s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`;

// ─── SMART SUGGESTIONS ENGINE ─────────────────────────────────────────────────
function generateSuggestions(attempt, history) {
  const suggestions = [];
  const { score, total, avgTime, levelBreakdown, tagBreakdown, topicName } = attempt;
  const pct = Math.round((score / total) * 100);
  const prevAttempts = history.filter(h => h.topicId === attempt.topicId);
  const prevPct = prevAttempts.length > 1
    ? Math.round((prevAttempts[prevAttempts.length - 2].score / prevAttempts[prevAttempts.length - 2].total) * 100)
    : null;

  // 1. Score-based
  if (pct === 100) suggestions.push({ type: "success", icon: "🏆", title: "Perfect Score!", body: "Outstanding! Move to the next topic or try a harder topic from the same subject." });
  else if (pct >= 80) suggestions.push({ type: "success", icon: "✅", title: "Strong performance", body: `${pct}% is exam-ready. Do one more attempt tomorrow to consolidate, then move to the next topic.` });
  else if (pct >= 60) suggestions.push({ type: "warning", icon: "📚", title: "Good but not exam-ready", body: `${pct}% is decent but CIL needs 70%+ per topic. Re-read the relevant section in your notes, then retry in 24 hours.` });
  else if (pct >= 40) suggestions.push({ type: "danger", icon: "⚠️", title: "Needs significant work", body: `${pct}% indicates concept gaps. Read the ${topicName} notes thoroughly before attempting again. Focus on the Quick-Revision Index first.` });
  else suggestions.push({ type: "danger", icon: "🔴", title: "Restart from basics", body: `${pct}% — please re-read the complete ${topicName} notes section before attempting again. Do not skip to mock tests yet.` });

  // 2. Trend-based
  if (prevPct !== null) {
    const diff = pct - prevPct;
    if (diff > 0) suggestions.push({ type: "success", icon: "📈", title: `Improved by ${diff}% from last attempt!`, body: `Keep this momentum. Consistency is more valuable than single high scores.` });
    else if (diff < -5) suggestions.push({ type: "warning", icon: "📉", title: `Score dropped ${Math.abs(diff)}% from last attempt`, body: "This can happen with Hard questions. Review explanations carefully and don't rush." });
    else suggestions.push({ type: "info", icon: "➡️", title: "Score is consistent", body: "Consistent performance is good. Push for 5% more on the next attempt." });
  }

  // 3. Difficulty-based
  const { Easy = {}, Medium = {}, Hard = {} } = levelBreakdown;
  if ((Easy.wrong || 0) > 0)
    suggestions.push({ type: "danger", icon: "🎯", title: `${Easy.wrong} Easy question(s) wrong`, body: "Easy questions are direct concept tests — getting these wrong means the fundamental definition/formula needs review. Re-read the basic concepts section." });
  if ((Hard.correct || 0) > 0 && (Hard.total || 0) > 0)
    suggestions.push({ type: "success", icon: "💪", title: `Got ${Hard.correct}/${Hard.total} Hard questions right`, body: "Excellent depth of understanding! Hard questions are rare in CIL but getting them gives a scoring edge." });
  if ((Hard.wrong || 0) > 1)
    suggestions.push({ type: "info", icon: "🔢", title: `${Hard.wrong} Hard numerical(s) wrong`, body: "Hard questions need step-by-step working. Practise the worked examples in your notes before the next attempt." });

  // 4. Tag-based
  const mustKnowWrong = Object.entries(tagBreakdown)
    .filter(([t]) => t.includes("MUST KNOW"))
    .reduce((s, [, v]) => s + (v.wrong || 0), 0);
  if (mustKnowWrong > 0)
    suggestions.push({ type: "danger", icon: "🔴", title: `${mustKnowWrong} MUST KNOW question(s) wrong — Critical!`, body: "These are CIL-confirmed PYQs. They WILL appear in the exam. Memorize these answers before the next attempt. No exceptions." });

  // 5. Speed-based
  if (avgTime > 90)
    suggestions.push({ type: "warning", icon: "⏱", title: `Average ${fmt(avgTime)} — over the 90s target`, body: "Speed needs work. Practise mental shortcuts from the Quick-Revision Index. Time pressure increases in the actual exam." });
  else if (avgTime <= 45)
    suggestions.push({ type: "success", icon: "⚡", title: `Average ${fmt(avgTime)} — excellent speed!`, body: "Great speed. Ensure accuracy doesn't suffer — fast and wrong scores zero." });

  // 6. Next action
  if (pct >= 80 && avgTime <= 90)
    suggestions.push({ type: "info", icon: "🚀", title: "Ready for next topic", body: `${topicName} is well-covered. Pick the next topic in your priority list and maintain daily practice.` });
  else if (pct < 60)
    suggestions.push({ type: "info", icon: "📖", title: "Recommended action", body: `1. Re-read ${topicName} notes (focus on 🔴 MUST KNOW sections). 2. Work through all Worked Examples. 3. Retry in 24 hours.` });

  return suggestions;
}

// ─── STORAGE KEY ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "cil_quiz_history";

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function App() {
  const [screen, setScreen]       = useState("home"); // home | quiz | results | history
  const [selectedTopic, setTopic] = useState(null);
  const [current, setCurrent]     = useState(0);
  const [answers, setAnswers]     = useState({});
  const [revealed, setRevealed]   = useState({});
  const [score, setScore]         = useState(null);
  const [filter, setFilter]       = useState("All");
  const [lastAttempt, setLast]    = useState(null);

  // Timer
  const [qTimes, setQTimes]       = useState({});
  const [curSec, setCurSec]       = useState(0);
  const [totalSec, setTotalSec]   = useState(0);
  const intervalRef               = useRef(null);
  const qStartRef                 = useRef(null);

  // History (persistent)
  const [history, setHistory]     = useState(() => {
    try {
      const raw = window.sessionStorage && window.sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const saveHistory = (h) => {
    setHistory(h);
    try { window.sessionStorage && window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(h)); } catch {}
  };

  const categories = ["All", ...new Set(TOPICS.map(t => t.category))];
  const filteredTopics = filter === "All" ? TOPICS : TOPICS.filter(t => t.category === filter);
  const questions = selectedTopic ? (QUESTION_BANK[selectedTopic.id] || []) : [];
  const attempted = Object.keys(answers).length;
  const revealedCount = Object.keys(revealed).length;

  // ── Timer helpers ────────────────────────────────────────────────────────
  const startQTimer = () => {
    clearInterval(intervalRef.current);
    qStartRef.current = Date.now();
    setCurSec(0);
    intervalRef.current = setInterval(() => {
      setCurSec(Math.floor((Date.now() - qStartRef.current) / 1000));
      setTotalSec(p => p + 1);
    }, 1000);
  };
  const stopQTimer = () => {
    clearInterval(intervalRef.current);
    return Math.floor((Date.now() - qStartRef.current) / 1000);
  };
  useEffect(() => () => clearInterval(intervalRef.current), []);

  // ── Navigation ───────────────────────────────────────────────────────────
  const goToQ = (idx) => {
    if (idx === current) return;
    if (!revealed[current]) {
      const el = stopQTimer();
      setQTimes(p => ({ ...p, [current]: (p[current] || 0) + el }));
    } else clearInterval(intervalRef.current);
    setCurrent(idx);
    setCurSec(0);
    if (!revealed[idx]) setTimeout(startQTimer, 50);
  };

  // ── Start quiz ───────────────────────────────────────────────────────────
  const startQuiz = (topic) => {
    if (!QUESTION_BANK[topic.id]) {
      alert(`"${topic.name}" questions coming soon! Currently available: Transformer (40Q), DC Motor (30Q), 3-Phase IM (30Q), Protection (34Q), Network Theorems (35Q), AC Circuits (30Q), Fault Analysis (30Q), SCR & Rectifiers (30Q), Synchronous Machines (20Q), Single-Phase IM (15Q).`); return;
    }
    setTopic(topic); setCurrent(0); setAnswers({}); setRevealed({});
    setScore(null); setQTimes({}); setTotalSec(0); setCurSec(0);
    setScreen("quiz"); setTimeout(startQTimer, 100);
  };

  // ── Answer & reveal ──────────────────────────────────────────────────────
  const selectAnswer = (qi, oi) => { if (!revealed[qi]) setAnswers(p => ({ ...p, [qi]: oi })); };
  const revealAnswer = (qi) => {
    if (answers[qi] === undefined) { alert("Select an answer first!"); return; }
    const el = stopQTimer();
    setQTimes(p => ({ ...p, [qi]: (p[qi] || 0) + el }));
    setRevealed(p => ({ ...p, [qi]: true }));
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const submitAll = () => {
    clearInterval(intervalRef.current);
    if (!revealed[current] && answers[current] !== undefined) {
      const el = stopQTimer();
      setQTimes(p => ({ ...p, [current]: (p[current] || 0) + el }));
    }

    let correct = 0;
    const levelBreakdown = {};
    const tagBreakdown   = {};

    questions.forEach((q, i) => {
      const ok = answers[i] === q.ans;
      if (ok) correct++;
      // level
      if (!levelBreakdown[q.level]) levelBreakdown[q.level] = { correct:0, wrong:0, total:0 };
      levelBreakdown[q.level].total++;
      ok ? levelBreakdown[q.level].correct++ : levelBreakdown[q.level].wrong++;
      // tag
      const t = q.tag;
      if (!tagBreakdown[t]) tagBreakdown[t] = { correct:0, wrong:0, total:0 };
      tagBreakdown[t].total++;
      ok ? tagBreakdown[t].correct++ : tagBreakdown[t].wrong++;
    });

    const allTimes = questions.map((_,i) => qTimes[i] || 0);
    const avgTime  = allTimes.length ? Math.round(allTimes.reduce((a,b)=>a+b,0)/allTimes.length) : 0;

    const attempt = {
      id:          Date.now(),
      topicId:     selectedTopic.id,
      topicName:   selectedTopic.name,
      category:    selectedTopic.category,
      date:        new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }),
      time:        new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }),
      score:       correct,
      total:       questions.length,
      attempted:   Object.keys(revealed).length,
      pct:         Object.keys(revealed).length > 0 ? Math.round((correct/Object.keys(revealed).length)*100) : 0,
      totalTime:   totalSec,
      avgTime,
      levelBreakdown,
      tagBreakdown,
      qTimes:      { ...qTimes },
      answers:     { ...answers },
    };

    const suggestions = generateSuggestions(attempt, history);
    attempt.suggestions = suggestions;

    const newHistory = [...history, attempt];
    saveHistory(newHistory);
    setScore(correct);
    setLast(attempt);
    setScreen("results");
  };

  // ── SCREEN: HOME ─────────────────────────────────────────────────────────
  if (screen === "home") return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-2xl p-5 mb-5 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">CIL MT Daily Practice</h1>
              <p className="text-blue-100 text-sm mt-1">Weighted Q-bank · Per-question timer · Smart suggestions</p>
            </div>
            {history.length > 0 && (
              <button onClick={() => setScreen("history")}
                className="bg-white bg-opacity-20 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-opacity-30">
                📊 History ({history.length})
              </button>
            )}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">🔴 MUST KNOW = CIL Confirmed</span>
            <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">⏱ Timer + Smart Feedback</span>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${filter===c?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200"}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Topic list */}
        <div className="grid gap-3">
          {filteredTopics.map(topic => {
            const available = !!QUESTION_BANK[topic.id];
            const topicHistory = history.filter(h => h.topicId === topic.id);
            const lastPct = topicHistory.length ? topicHistory[topicHistory.length-1].pct : null;
            return (
              <button key={topic.id} onClick={() => startQuiz(topic)}
                className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${available?"bg-white border-gray-200 hover:border-blue-400 hover:shadow-md":"bg-gray-50 border-gray-100 opacity-60"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-gray-400 w-6">{topic.id}</span>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{topic.name}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor[topic.category]||"bg-gray-100 text-gray-600"}`}>{topic.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lastPct !== null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lastPct>=80?"bg-green-100 text-green-700":lastPct>=60?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-600"}`}>
                      {lastPct}%
                    </span>
                  )}
                  {available
                    ? <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 font-medium">{QUESTION_BANK[topic.id]?.length}Q</span>
                        <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium">Start →</span>
                      </div>
                    : <span className="bg-gray-200 text-gray-500 text-xs px-2 py-1 rounded-full">Soon</span>}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Available: 13 Topics Ready — 389 Questions Total Total</p>
      </div>
    </div>
  );

  // ── SCREEN: QUIZ ─────────────────────────────────────────────────────────
  if (screen === "quiz") {
    const q = questions[current];
    const userAns = answers[current];
    const isRev = revealed[current];
    const isOk  = isRev && userAns === q.ans;
    const tcol  = curSec<=30?"text-green-600":curSec<=60?"text-yellow-600":curSec<=90?"text-orange-500":"text-red-600 font-bold";
    const correctSoFar = Object.keys(revealed).filter(i => answers[+i] === questions[+i]?.ans).length;

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={()=>{clearInterval(intervalRef.current);setScreen("home");}}
              className="text-blue-600 text-sm font-medium">← Topics</button>
            <div className="text-sm font-semibold text-gray-700 truncate mx-2">{selectedTopic.name}</div>
            <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
              <span>⏱ {fmt(totalSec)}</span>
              <span>{revealedCount}/{questions.length}</span>
            </div>
          </div>

          {/* Always-visible Submit bar — appears as soon as 1 question is answered */}
          {revealedCount > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 mb-3 flex items-center justify-between shadow-sm">
              <div className="text-xs text-gray-600">
                <span className="font-bold text-green-600">✅ {correctSoFar}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="font-bold text-gray-700">{revealedCount}</span>
                <span className="text-gray-400"> attempted</span>
                {revealedCount < questions.length && (
                  <span className="text-gray-400"> · {questions.length - revealedCount} left</span>
                )}
              </div>
              <button onClick={submitAll}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all active:scale-95">
                Submit & Results 🎯
              </button>
            </div>
          )}

          {/* Progress bar */}
          <div className="bg-gray-200 rounded-full h-1.5 mb-3">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{width:`${(revealedCount/questions.length)*100}%`}}/>
          </div>

          {/* Dot nav */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {questions.map((_,i)=>(
              <button key={i} onClick={()=>goToQ(i)}
                className={`w-8 h-8 rounded-full text-xs font-bold border-2 transition-all ${
                  i===current?"border-blue-600 bg-blue-600 text-white":
                  revealed[i]&&answers[i]===questions[i].ans?"border-green-500 bg-green-500 text-white":
                  revealed[i]?"border-red-500 bg-red-500 text-white":
                  answers[i]!==undefined?"border-blue-300 bg-blue-50 text-blue-600":
                  "border-gray-300 bg-white text-gray-500"}`}>
                {i+1}
              </button>
            ))}
          </div>

          {/* Question card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`text-xs font-bold ${lvlColor[q.level]}`}>{q.level}</span>
              <span className="text-gray-300">·</span>
              <span className={`text-xs px-2 py-0.5 rounded border ${tagBg[q.tag]||"bg-gray-50 border-gray-200 text-gray-600"}`}>{q.tag}</span>
              <span className="ml-auto flex items-center gap-2">
                {!isRev && <span className={`text-sm font-mono font-bold ${tcol}`}>⏱ {fmt(curSec)}</span>}
                {isRev  && <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">⏱ {fmt(qTimes[current]||0)}</span>}
                <span className="text-xs text-gray-400">Q{current+1}/{questions.length}</span>
              </span>
            </div>
            <p className="text-gray-800 font-medium leading-relaxed mb-5">{q.q}</p>
            <div className="grid gap-2.5">
              {q.opts.map((opt,i)=>{
                let s="border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50";
                if(!isRev&&userAns===i) s="border-blue-500 bg-blue-50 text-blue-800 font-medium";
                if(isRev&&i===q.ans)   s="border-green-500 bg-green-50 text-green-800 font-semibold";
                if(isRev&&userAns===i&&i!==q.ans) s="border-red-400 bg-red-50 text-red-700";
                return (
                  <button key={i} onClick={()=>selectAnswer(current,i)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left text-sm transition-all ${s} ${isRev?"cursor-default":"cursor-pointer"}`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isRev&&i===q.ans?"bg-green-500 text-white":
                      isRev&&userAns===i?"bg-red-400 text-white":
                      !isRev&&userAns===i?"bg-blue-500 text-white":
                      "bg-gray-200 text-gray-600"}`}>
                      {["A","B","C","D"][i]}
                    </span>
                    <span>{opt}</span>
                    {isRev&&i===q.ans&&<span className="ml-auto text-green-600">✓</span>}
                    {isRev&&userAns===i&&i!==q.ans&&<span className="ml-auto text-red-500">✗</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Explanation */}
          {isRev && (
            <div className={`rounded-xl p-4 mb-4 border-l-4 ${isOk?"bg-green-50 border-green-500":"bg-red-50 border-red-400"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{isOk?"✅":"❌"}</span>
                <span className="font-semibold text-sm">{isOk?"Correct!": `Wrong. Correct: ${["A","B","C","D"][q.ans]}`}</span>
                <span className="ml-auto text-xs font-bold text-gray-500">⏱ {fmt(qTimes[current]||0)}</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{q.exp}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={()=>goToQ(current-1)} disabled={current===0} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium text-sm disabled:opacity-40">← Prev</button>
            {!isRev
              ? <button onClick={()=>revealAnswer(current)} disabled={userAns===undefined} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50">Check Answer</button>
              : current<questions.length-1
                ? <button onClick={()=>goToQ(current+1)} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm">Next →</button>
                : <button onClick={submitAll} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm">View Results 🎯</button>
            }
          </div>

          {/* All answered — show final submit when all revealed */}
          {revealedCount === questions.length && current < questions.length - 1 && (
            <button onClick={submitAll}
              className="w-full mt-3 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm">
              All Done — View Full Results 🎯
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── SCREEN: RESULTS ───────────────────────────────────────────────────────
  if (screen === "results" && lastAttempt) {
    const { pct, avgTime, levelBreakdown, tagBreakdown, suggestions, totalTime, qTimes: qt } = lastAttempt;
    const isPartial = lastAttempt.attempted < lastAttempt.total;
    const emoji = pct===100?"🏆":pct>=80?"🎉":pct>=60?"👍":pct>=40?"📚":"💪";
    const allTimes = questions.map((_,i)=>qt[i]||0);
    const slowestIdx = allTimes.indexOf(Math.max(...allTimes));
    const nonZero = allTimes.filter(t=>t>0);
    const fastestIdx = nonZero.length ? allTimes.indexOf(Math.min(...nonZero)) : 0;

    const suggTypeStyle = {
      success:"bg-green-50 border-green-300 text-green-800",
      warning:"bg-yellow-50 border-yellow-300 text-yellow-800",
      danger: "bg-red-50 border-red-300 text-red-800",
      info:   "bg-blue-50 border-blue-300 text-blue-800",
    };

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">

          {/* Partial attempt banner */}
          {isPartial && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 mb-4 flex items-center gap-3">
              <span className="text-2xl">✋</span>
              <div>
                <p className="text-sm font-bold text-amber-800">Partial attempt — {lastAttempt.attempted} of {lastAttempt.total} questions</p>
                <p className="text-xs text-amber-600">Results below are based on attempted questions only. Resume later for remaining {lastAttempt.total - lastAttempt.attempted} questions.</p>
              </div>
            </div>
          )}

          {/* Score hero */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4 text-center">
            <div className="text-5xl mb-2">{emoji}</div>
            <div className="text-5xl font-bold text-gray-800 mb-1">
              {score}
              <span className="text-2xl text-gray-400">/{lastAttempt.attempted}</span>
              {isPartial && <span className="text-sm text-gray-400 block font-normal mt-1">of {lastAttempt.total} total questions</span>}
            </div>
            <div className="text-3xl font-bold mb-2" style={{color:pct>=80?"#16a34a":pct>=60?"#ca8a04":"#dc2626"}}>{pct}%</div>
            <p className="text-gray-500 text-xs">{lastAttempt.topicName} · {lastAttempt.date} {lastAttempt.time}</p>
            {history.filter(h=>h.topicId===selectedTopic?.id).length>1&&(()=>{
              const prev=history.filter(h=>h.topicId===selectedTopic.id);
              const diff=pct-prev[prev.length-2].pct;
              return <p className={`text-sm font-semibold mt-1 ${diff>0?"text-green-600":diff<0?"text-red-500":"text-gray-500"}`}>{diff>0?`▲ +${diff}% from last attempt`:diff<0?`▼ ${diff}% from last attempt`:"= Same as last attempt"}</p>;
            })()}
          </div>

          {/* Accuracy + Time side by side */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">Accuracy ({lastAttempt.attempted} attempted)</p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-green-600 font-bold">✅ {score}</span>
                <span className="text-red-500 font-bold">❌ {lastAttempt.attempted - score}</span>
              </div>
              <div className="bg-gray-100 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{width:`${pct}%`}}/>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-blue-200 p-4">
              <p className="text-xs text-gray-500 mb-1 font-medium">Time Analysis</p>
              <div className="text-xl font-bold text-blue-700">{fmt(avgTime)} <span className="text-xs text-gray-400 font-normal">avg/Q</span></div>
              <div className="text-xs text-gray-500">Total: {fmt(totalTime)} · Target: 90s</div>
              <div className={`text-xs font-semibold mt-1 ${avgTime<=90?"text-green-600":"text-orange-500"}`}>
                {avgTime<=45?"⚡ Excellent speed":avgTime<=90?"✅ On target":avgTime<=120?"⚠️ Slightly slow":"🐢 Too slow"}
              </div>
            </div>
          </div>

          {/* Difficulty breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            <p className="text-sm font-bold text-gray-700 mb-3">Difficulty Breakdown</p>
            <div className="grid grid-cols-3 gap-2">
              {["Easy","Medium","Hard"].map(lvl=>{
                const d=levelBreakdown[lvl]||{correct:0,wrong:0,total:0};
                if(!d.total) return null;
                const lPct=Math.round((d.correct/d.total)*100);
                return (
                  <div key={lvl} className={`rounded-xl p-3 text-center border ${lPct===100?"border-green-300 bg-green-50":lPct>=60?"border-yellow-300 bg-yellow-50":"border-red-300 bg-red-50"}`}>
                    <div className={`text-xs font-bold mb-1 ${lvlColor[lvl]}`}>{lvl}</div>
                    <div className="text-lg font-bold text-gray-800">{d.correct}/{d.total}</div>
                    <div className={`text-xs font-semibold ${lPct===100?"text-green-600":lPct>=60?"text-yellow-600":"text-red-500"}`}>{lPct}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tag breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            <p className="text-sm font-bold text-gray-700 mb-3">Tag Performance</p>
            {Object.entries(tagBreakdown).map(([tag,d])=>{
              const tPct=Math.round((d.correct/d.total)*100);
              return (
                <div key={tag} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-medium px-1.5 py-0.5 rounded border ${tagBg[tag]||"bg-gray-50 border-gray-200 text-gray-600"}`}>{tag}</span>
                    <span className={`font-bold ${tPct===100?"text-green-600":tPct>=60?"text-yellow-600":"text-red-500"}`}>{d.correct}/{d.total} ({tPct}%)</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${tPct===100?"bg-green-500":tPct>=60?"bg-yellow-400":"bg-red-400"}`} style={{width:`${tPct}%`}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Per-Q time bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            <p className="text-sm font-bold text-gray-700 mb-1">Per-Question Time</p>
            <div className="flex gap-2 text-xs text-gray-400 mb-3">
              <span>🟢 ≤45s</span><span>🔵 ≤90s</span><span>🟠 ≤120s</span><span>🔴 &gt;120s</span>
            </div>
            <div className="grid gap-1.5">
              {questions.map((q,i)=>{
                const t=allTimes[i]||0;
                const ok=answers[i]===q.ans;
                const bc=t<=45?"bg-green-400":t<=90?"bg-blue-400":t<=120?"bg-orange-400":"bg-red-400";
                const barW=Math.min(100,(t/120)*100);
                const highlight=i===slowestIdx?"🐢 Slowest":i===fastestIdx&&t>0?"⚡ Fastest":"";
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-4 ${ok?"text-green-600":"text-red-500"}`}>{ok?"✓":"✗"}</span>
                    <span className="text-xs text-gray-500 w-5">Q{i+1}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`${bc} h-2 rounded-full`} style={{width:`${barW}%`}}/>
                    </div>
                    <span className="text-xs font-mono text-gray-600 w-10 text-right">{fmt(t)}</span>
                    {highlight&&<span className="text-xs">{highlight}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── SMART SUGGESTIONS ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            <p className="text-base font-bold text-gray-800 mb-3">🎯 What To Improve — Smart Suggestions</p>
            <div className="grid gap-3">
              {suggestions.map((s,i)=>(
                <div key={i} className={`rounded-xl p-3.5 border ${suggTypeStyle[s.type]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{s.icon}</span>
                    <span className="font-bold text-sm">{s.title}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Wrong answers review */}
          {score < questions.length && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
              <p className="text-sm font-bold text-gray-800 mb-3">📋 Wrong Answers — Review</p>
              {questions.map((q,i)=>{
                if(answers[i]===q.ans) return null;
                return (
                  <div key={i} className="border-b border-gray-100 pb-3 mb-3 last:border-0 last:mb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-500">Q{i+1}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">⏱ {fmt(allTimes[i]||0)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${tagBg[q.tag]||""}`}>{q.tag}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-1">{q.q}</p>
                    <p className="text-xs text-red-500 mb-0.5">Your answer: {["A","B","C","D"][answers[i]]} — {q.opts[answers[i]]}</p>
                    <p className="text-xs text-green-600 mb-1">Correct: {["A","B","C","D"][q.ans]} — {q.opts[q.ans]}</p>
                    <p className="text-xs text-gray-500 bg-gray-50 rounded p-2 leading-relaxed">{q.exp}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pb-4">
            <button onClick={()=>{setCurrent(0);setAnswers({});setRevealed({});setScore(null);setQTimes({});setTotalSec(0);setCurSec(0);setScreen("quiz");setTimeout(startQTimer,100);}}
              className="flex-1 py-3 rounded-xl border-2 border-blue-600 text-blue-600 font-semibold text-sm">Retry Topic</button>
            <button onClick={()=>setScreen("history")} className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold text-sm">📊 History</button>
            <button onClick={()=>setScreen("home")} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm">New Topic</button>
          </div>
        </div>
      </div>
    );
  }

  // ── SCREEN: HISTORY ───────────────────────────────────────────────────────
  if (screen === "history") {
    const grouped = {};
    [...history].reverse().forEach(h => {
      if (!grouped[h.topicName]) grouped[h.topicName] = [];
      grouped[h.topicName].push(h);
    });

    // Overall stats
    const totalAttempts = history.length;
    const overallAvgPct = totalAttempts ? Math.round(history.reduce((s,h)=>s+h.pct,0)/totalAttempts) : 0;
    const bestScore = totalAttempts ? Math.max(...history.map(h=>h.pct)) : 0;
    const topicsAttempted = new Set(history.map(h=>h.topicId)).size;

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={()=>setScreen("home")} className="text-blue-600 text-sm font-medium">← Home</button>
            <h2 className="text-lg font-bold text-gray-800">📊 Performance History</h2>
            <button onClick={()=>{if(window.confirm("Clear all history?")) saveHistory([]);}} className="text-red-400 text-xs">Clear</button>
          </div>

          {/* Overall summary */}
          {totalAttempts > 0 && (
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-2xl p-4 mb-4 text-white">
              <p className="text-blue-100 text-xs mb-2">Overall Performance</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><div className="text-2xl font-bold">{totalAttempts}</div><div className="text-xs text-blue-100">Attempts</div></div>
                <div><div className="text-2xl font-bold">{overallAvgPct}%</div><div className="text-xs text-blue-100">Avg Score</div></div>
                <div><div className="text-2xl font-bold">{topicsAttempted}</div><div className="text-xs text-blue-100">Topics Done</div></div>
              </div>
            </div>
          )}

          {history.length === 0
            ? <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">📭</div><p>No attempts yet. Start a quiz!</p></div>
            : Object.entries(grouped).map(([topicName, attempts]) => {
                const best = Math.max(...attempts.map(a=>a.pct));
                const latest = attempts[0];
                const trend = attempts.length>1 ? latest.pct - attempts[1].pct : null;
                return (
                  <div key={topicName} className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{topicName}</p>
                        <p className="text-xs text-gray-400">{attempts.length} attempt{attempts.length>1?"s":""} · Best: {best}%</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${latest.pct>=80?"text-green-600":latest.pct>=60?"text-yellow-600":"text-red-500"}`}>{latest.pct}%</div>
                        {trend!==null&&<div className={`text-xs font-semibold ${trend>0?"text-green-500":trend<0?"text-red-400":"text-gray-400"}`}>{trend>0?`▲+${trend}`:trend<0?`▼${trend}`:"="}</div>}
                      </div>
                    </div>
                    {/* Sparkline */}
                    <div className="flex items-end gap-1 h-10 mb-2">
                      {[...attempts].reverse().map((a,i)=>(
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className={`w-full rounded-t ${a.pct>=80?"bg-green-400":a.pct>=60?"bg-yellow-400":"bg-red-400"}`} style={{height:`${Math.max(4,(a.pct/100)*36)}px`}}/>
                        </div>
                      ))}
                    </div>
                    {/* Attempt rows */}
                    <div className="grid gap-1">
                      {attempts.map((a,i)=>(
                        <div key={a.id} className="flex items-center justify-between text-xs text-gray-500 py-1 border-t border-gray-50">
                          <span>{i===0?"Latest":a.date+" "+a.time}</span>
                          <div className="flex items-center gap-3">
                            <span>⏱ avg {fmt(a.avgTime)}</span>
                            <span className={`font-bold ${a.pct>=80?"text-green-600":a.pct>=60?"text-yellow-600":"text-red-500"}`}>{a.score}/{a.total} ({a.pct}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    );
  }

  return null;
}

// Mount the app

const rootEl = document.getElementById("root");
ReactDOM.createRoot(rootEl).render(<App />);
