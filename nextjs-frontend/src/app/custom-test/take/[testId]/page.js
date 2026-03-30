'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import api from '@/services/api';
import useSecureExam from '@/hooks/useSecureExam';
import { CheckCircle, Sparkle, House, Spinner, BookmarkSimple, CaretLeft, CaretRight, Clock, Warning, List, X, ShieldWarning, LockSimple } from '@phosphor-icons/react';

/* ═══════════════════════════════════════════════════════
   Real Exam Test-Taking Interface
   Mimics UPSC / JEE / NEET online CBT environment
═══════════════════════════════════════════════════════ */

export default function CustomTestTakePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { testId } = useParams();

  // ── Core state ──────────────────────────────────────
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});       // { questionId: optionId }
  const [visited, setVisited] = useState(new Set()); // set of question indices
  const [bookmarked, setBookmarked] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(0);       // seconds remaining
  const [sessionStart] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const timerRef = useRef(null);

  // ── Auth guard ──────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  // ── Fetch test ──────────────────────────────────────
  useEffect(() => {
    if (user && testId) {
      api.get(`/custom-tests/${testId}`)
        .then(r => {
          const t = r.data.test;
          setTest(t);
          setTimeLeft((t.duration_minutes || 30) * 60);
          setVisited(new Set([0])); // mark first question visited
        })
        .catch(() => alert('Failed to load test'))
        .finally(() => setLoading(false));
    }
  }, [user, testId]);

  // ── Countdown timer ─────────────────────────────────
  useEffect(() => {
    if (!test || result || !isExamStarted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [test, result, isExamStarted]);

  // ── Auto-submit when time up ────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && test && !result && !isSubmitting) {
      doSubmit();
    }
  }, [timeLeft]);

  // ── Keyboard shortcuts ──────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (result) return;
      if (e.altKey && e.key === 'n') { e.preventDefault(); goNext(); }
      if (e.altKey && e.key === 'p') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIdx, result]);

  // ── Helpers ─────────────────────────────────────────
  const questions = useMemo(() => test?.questions || [], [test]);
  const currentQ = questions[currentIdx];

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleSelect = (optId) => {
    if (result) return;
    setAnswers(prev => ({ ...prev, [currentQ.id]: optId }));
  };

  const goNext = useCallback(() => {
    if (!questions.length) return;
    setCurrentIdx(prev => {
      const next = Math.min(prev + 1, questions.length - 1);
      setVisited(v => new Set(v).add(next));
      return next;
    });
  }, [questions]);

  const goPrev = useCallback(() => {
    setCurrentIdx(prev => {
      const next = Math.max(prev - 1, 0);
      setVisited(v => new Set(v).add(next));
      return next;
    });
  }, []);

  const jumpTo = (idx) => {
    setCurrentIdx(idx);
    setVisited(v => new Set(v).add(idx));
  };

  const toggleBookmark = () => {
    setBookmarked(prev => {
      const next = new Set(prev);
      next.has(currentIdx) ? next.delete(currentIdx) : next.add(currentIdx);
      return next;
    });
  };

  // ── Submit ──────────────────────────────────────────
  const doSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirm(false);
    const totalTime = Math.floor((Date.now() - sessionStart) / 1000);

    const payload = {
      time_taken_seconds: totalTime,
      answers: Object.keys(answers).map(qId => ({
        question_id: qId,
        selected_option_id: answers[qId],
        time_taken_seconds: 0
      }))
    };

    try {
      const res = await api.post(`/custom-tests/${testId}/submit`, payload);
      if (res.data.success) {
        clearInterval(timerRef.current);
        router.push(`/custom-test/analysis/${testId}`);
        return;
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit test. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Question status helpers ─────────────────────────
  const getQuestionStatus = (idx) => {
    if (idx === currentIdx) return 'current';
    const q = questions[idx];
    if (q && answers[q.id] && bookmarked.has(idx)) return 'answered';
    if (q && answers[q.id]) return 'answered';
    if (bookmarked.has(idx)) return 'bookmarked';
    if (visited.has(idx)) return 'not-answered';
    return 'not-visited';
  };

  const answeredCount = questions.filter(q => answers[q.id]).length;
  const bookmarkedCount = bookmarked.size;
  const notVisitedCount = questions.length - visited.size;

  // ── Secure Exam Hook ────────────────────────────────
  const { 
    violations, maxViolations,
    warningMessage, warningType, dismissWarning
  } = useSecureExam(doSubmit, { 
    maxViolations: 3, 
    enabled: !!test && !result && isExamStarted
  });

  // ── Start Exam Handler ──────────────────────────────
  const handleStart = () => {
    setIsExamStarted(true);
  };

  // ── Derived ──
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const isTimeLow = timeLeft < 300;

  // ══════════════════════════════════════════════════════
  //  SINGLE PERSISTENT ROOT — never unmounts
  //  This preserves fullscreen across gate → exam transitions
  // ══════════════════════════════════════════════════════
  return (
    <div id="exam-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes pulse-red { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .exam-option:hover { border-color: #5956DF !important; background: #f8f7ff !important; transform: translateY(-1px); }
        .exam-option.selected { border-color: #5956DF !important; background: #f0efff !important; }
        .palette-btn:hover { transform: scale(1.08); box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
        .nav-btn:hover { background: #f0f0f0 !important; }
        .bookmark-btn:hover { color: #f59e0b !important; }
        .mobile-palette-toggle { display: none; }
        .palette-overlay { display: none; }
        @media (max-width: 860px) {
          .right-palette-panel { display: none !important; }
          .mobile-palette-toggle { display: flex !important; }
          .palette-overlay.open { display: block !important; }
          .palette-drawer { animation: slideIn 0.25s ease; }
        }
      `}</style>

      {/* ═══════════ LOADING STATE ═══════════ */}
      {(authLoading || loading) && (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #ddd', borderTop: '4px solid #5956DF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {/* ═══════════ TEST NOT FOUND ═══════════ */}
      {!authLoading && !loading && !test && (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'Inter, sans-serif' }}>
          <p style={{ color: '#666', fontSize: 18 }}>Test not found.</p>
        </div>
      )}

      {/* ═══════════ SECURE EXAM GATE ═══════════ */}
      <div style={{ minHeight: '100vh', display: (test && !isExamStarted && !result && !loading) ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', fontFamily: "'Inter', sans-serif", padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 48, maxWidth: 520, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#f0efff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 4px 20px rgba(89,86,223,0.15)' }}>
              <LockSimple size={44} color="#5956DF" weight="fill" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', marginBottom: 10 }}>Secure Exam Mode</h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              This test is conducted in a secure environment.
            </p>
            <div style={{ background: '#f8f9ff', padding: 20, borderRadius: 16, textAlign: 'left', marginBottom: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Warning size={18} color="#eab308" weight="fill" /> Exam Rules
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#4b5563', fontSize: 13, lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><b>Do not switch tabs</b> or windows during the test.</li>
                <li>Your window focus is <b>strictly monitored</b>.</li>
                <li>Leaving the test window will trigger a violation warning.</li>
                <li>After <b>3 violations</b>, your test is <b>auto-submitted</b>.</li>
              </ul>
            </div>
            <button
              onClick={handleStart}
              style={{ width: '100%', padding: '16px 0', background: '#5956DF', color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s', boxShadow: '0 6px 20px rgba(89,86,223,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(89,86,223,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(89,86,223,0.35)'; }}
            >
              <ShieldWarning size={20} weight="fill" /> Agree & Start Test
            </button>
            <p style={{ marginTop: 16, fontSize: 11, color: '#9ca3af' }}>🔒 Your session is monitored for a fair exam environment.</p>
          </div>
        </div>

      {/* ═══════════ RESULTS SCREEN ═══════════ */}
      <div style={{ minHeight: '100vh', display: result ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontFamily: "'Inter', sans-serif", padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 40, maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle size={44} color="#4caf50" weight="fill" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Examination Complete!</h1>
            <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>Your responses have been recorded successfully.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
              <div style={{ background: '#f8f9ff', borderRadius: 16, padding: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Score</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#5956DF' }}>{result?.score} <span style={{ fontSize: 16, color: '#bbb' }}>/ {result?.total_questions}</span></p>
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: 16, padding: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Accuracy</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{result ? Math.round(result.accuracy) : 0}%</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => router.push(`/custom-test/review/${testId}`)} style={{ width: '100%', padding: '14px 0', background: '#5956DF', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Sparkle size={18} weight="fill" /> Review Answers & Analysis
              </button>
              <button onClick={() => router.push('/custom-test')} style={{ width: '100%', padding: '14px 0', background: '#f5f5f5', color: '#666', fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <House size={18} weight="fill" /> Back to Tests
              </button>
            </div>
          </div>
      </div>

      {/* ═══════════ EXAM INTERFACE ═══════════ */}
      <div style={{ minHeight: '100vh', display: (isExamStarted && !result) ? 'flex' : 'none', flexDirection: 'column', fontFamily: "'Inter', sans-serif", background: '#f7f7fa', userSelect: 'none' }}>

          {/* ── SECURITY WARNING OVERLAY ───────────────── */}
          {warningMessage && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
              background: warningType === 'devtools' ? '#EF4444' : '#F59E0B',
              color: '#fff', padding: '16px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              animation: 'slideIn 0.3s ease-out'
            }}>
              <ShieldWarning size={24} weight="fill" />
              <span style={{ fontSize: 16, fontWeight: 700 }}>{warningMessage}</span>
              <button 
                onClick={dismissWarning}
                style={{
                  marginLeft: 16, padding: '6px 16px', background: 'rgba(255,255,255,0.2)',
                  border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700,
                  cursor: 'pointer', transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ── TOP HEADER ─────────────────────────────── */}
          <header style={{ background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#5956DF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: '#fff' }}>P</div>
              <div>
                <span style={{ fontWeight: 800, fontSize: 15 }}>PrepMind AI</span>
                <span style={{ margin: '0 10px', color: '#555', fontSize: 14 }}>|</span>
                <span style={{ fontWeight: 500, fontSize: 14, color: '#ccc' }}>{test?.topic_requested || 'Examination'}</span>
                <span style={{ 
                  marginLeft: 16, padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                  background: 'rgba(16,185,129,0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16,185,129,0.3)'
                }}>
                  🔒 Secure Exam Mode Active — Tab switching is monitored
                  <span style={{ color: '#aaa', marginLeft: 8 }}>Violations: {violations}/{maxViolations}</span>
                </span>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: isTimeLow ? '#fee2e2' : '#fff1f0',
              padding: '8px 20px', borderRadius: 24,
              animation: isTimeLow ? 'pulse-red 1s infinite' : 'none'
            }}>
              <Clock size={18} weight="bold" color={isTimeLow ? '#ef4444' : '#e74c3c'} />
              <span style={{ fontWeight: 800, fontSize: 18, color: isTimeLow ? '#ef4444' : '#e74c3c', fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{user?.name || 'Student'}</p>
                <p style={{ fontSize: 11, color: '#888' }}>ID: {user?.id?.substring(0, 8) || 'N/A'}</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#5956DF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' }}>
                {(user?.name || 'S')[0].toUpperCase()}
              </div>
            </div>
          </header>

          {/* ── MAIN SPLIT AREA ────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* ═══ LEFT PANEL — QUESTION AREA (75%) ═══ */}
            <div style={{ flex: '0 0 75%', display: 'flex', flexDirection: 'column', overflow: 'auto', borderRight: '1px solid #e5e5e5' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid #eee', background: '#fff' }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#5956DF', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                </div>
                <button
                  className="bookmark-btn"
                  onClick={toggleBookmark}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: 13,
                    color: bookmarked.has(currentIdx) ? '#f59e0b' : '#999',
                    transition: 'all 0.2s'
                  }}
                >
                  <BookmarkSimple size={18} weight={bookmarked.has(currentIdx) ? 'fill' : 'regular'} />
                  {bookmarked.has(currentIdx) ? 'Bookmarked' : 'Bookmark'}
                </button>
              </div>

              <div style={{ flex: 1, padding: '32px 40px', animation: 'fadeIn 0.3s ease' }} key={currentIdx}>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.7, marginBottom: 32 }}>
                  {currentQ?.question_text}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(currentQ?.options || []).map((opt, i) => {
                    const isSelected = answers[currentQ.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        className={`exam-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelect(opt.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 16,
                          padding: '16px 20px',
                          background: isSelected ? '#f0efff' : '#fff',
                          border: `2px solid ${isSelected ? '#5956DF' : '#e8e8e8'}`,
                          borderRadius: 12, cursor: 'pointer',
                          textAlign: 'left', fontSize: 15, color: '#333',
                          transition: 'all 0.2s', fontWeight: isSelected ? 600 : 400,
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: isSelected ? '#5956DF' : '#f0f0f0',
                          color: isSelected ? '#fff' : '#666',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 14, flexShrink: 0,
                          transition: 'all 0.2s'
                        }}>
                          {opt.option_label || labels[i]}
                        </div>
                        <span style={{ flex: 1 }}>{opt.option_text}</span>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          border: `2px solid ${isSelected ? '#5956DF' : '#ddd'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.2s'
                        }}>
                          {isSelected && <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#5956DF' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ padding: '16px 40px', borderTop: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button className="nav-btn" onClick={goPrev} disabled={currentIdx === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', border: '1px solid #ddd', borderRadius: 10, background: '#fff', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, color: currentIdx === 0 ? '#ccc' : '#555', opacity: currentIdx === 0 ? 0.5 : 1, transition: 'all 0.2s' }}>
                  <CaretLeft size={16} weight="bold" /> Previous
                </button>
                <button className="nav-btn" onClick={goNext} disabled={currentIdx === questions.length - 1}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: currentIdx === questions.length - 1 ? '#ccc' : '#5956DF', border: 'none', borderRadius: 10, cursor: currentIdx === questions.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, color: '#fff', opacity: currentIdx === questions.length - 1 ? 0.5 : 1, transition: 'all 0.2s' }}>
                  Save & Next <CaretRight size={16} weight="bold" />
                </button>
                <button className="mobile-palette-toggle" onClick={() => setPaletteOpen(true)}
                  style={{ alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', border: '1px solid #ddd', borderRadius: 10, background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#5956DF' }}>
                  <List size={16} weight="bold" /> Palette
                </button>
              </div>

              <div style={{ padding: '6px 40px', background: '#f9f9f9', borderTop: '1px solid #eee', display: 'flex', gap: 24, fontSize: 11, color: '#aaa' }}>
                <span><strong>Alt + N</strong> Next Question</span>
                <span><strong>Alt + P</strong> Previous Question</span>
              </div>
            </div>

            {/* ═══ RIGHT PANEL — COMPACT PALETTE (25%) ═══ */}
            <div className="right-palette-panel" style={{ flex: '0 0 25%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-2px 0 12px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee' }}>
                <h3 style={{ fontSize: 11, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 1.5 }}>Question Palette</h3>
              </div>
              <div style={{ padding: '10px 14px', flex: 1, overflow: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {questions.map((q, idx) => {
                    const status = getQuestionStatus(idx);
                    const colors = {
                      current: { bg: '#5956DF', color: '#fff', border: '2px solid #3d3bb0' },
                      answered: { bg: '#22c55e', color: '#fff', border: '2px solid #16a34a' },
                      bookmarked: { bg: '#f59e0b', color: '#fff', border: '2px solid #d97706' },
                      'not-answered': { bg: '#fff', color: '#666', border: '1.5px solid #ddd' },
                      'not-visited': { bg: '#f0f0f0', color: '#999', border: '1.5px solid #e0e0e0' }
                    };
                    const s = colors[status];
                    return (
                      <button key={q.id} className="palette-btn" onClick={() => jumpTo(idx)}
                        style={{ width: '100%', aspectRatio: '1', borderRadius: 6, background: s.bg, color: s.color, border: s.border, fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding: '8px 14px', borderTop: '1px solid #eee' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                  {[
                    { color: '#22c55e', label: `Answered (${answeredCount})` },
                    { color: '#f59e0b', label: `Review (${bookmarkedCount})` },
                    { color: '#e5e5e5', label: `Not Visited (${notVisitedCount})` },
                    { color: '#5956DF', label: 'Current' }
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: '#777', fontWeight: 500, whiteSpace: 'nowrap' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid #eee', flexShrink: 0 }}>
                <button onClick={() => setShowConfirm(true)} disabled={isSubmitting}
                  style={{ width: '100%', padding: '12px 0', background: isSubmitting ? '#ccc' : '#dc2626', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none', borderRadius: 10, cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s', letterSpacing: 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {isSubmitting ? <Spinner size={16} /> : null}
                  Submit Examination
                </button>
                <p style={{ fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 4 }}>Review all questions before submitting</p>
              </div>
            </div>
          </div>

          <footer style={{ padding: '6px 24px', background: '#f0f0f0', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999' }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <span><strong>Alt + N</strong> Next Question</span>
              <span><strong>Alt + P</strong> Previous Question</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <span>Exam Rules</span>
              <span>Contact Proctor</span>
              <span>© 2026 PrepMind AI</span>
            </div>
          </footer>
        </div>

      {/* ── MOBILE PALETTE DRAWER ────────────────────── */}
      <div className={`palette-overlay ${paletteOpen ? 'open' : ''}`} onClick={() => setPaletteOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9990 }} />
      {paletteOpen && (
        <div className="palette-drawer" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 280, background: '#fff', zIndex: 9991, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 1.5 }}>Question Palette</h3>
            <button onClick={() => setPaletteOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
          </div>
          <div style={{ padding: '12px 14px', flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 36px)', gap: 6, justifyContent: 'center' }}>
              {questions.map((q, idx) => {
                const status = getQuestionStatus(idx);
                const colors = {
                  current: { bg: '#5956DF', color: '#fff', border: '2px solid #3d3bb0' },
                  answered: { bg: '#22c55e', color: '#fff', border: '2px solid #16a34a' },
                  bookmarked: { bg: '#f59e0b', color: '#fff', border: '2px solid #d97706' },
                  'not-answered': { bg: '#fff', color: '#666', border: '1.5px solid #ddd' },
                  'not-visited': { bg: '#f0f0f0', color: '#999', border: '1.5px solid #e0e0e0' }
                };
                const s = colors[status];
                return (
                  <button key={q.id} onClick={() => { jumpTo(idx); setPaletteOpen(false); }} style={{ width: 36, height: 36, borderRadius: 6, background: s.bg, color: s.color, border: s.border, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid #eee' }}>
            <button onClick={() => { setPaletteOpen(false); setShowConfirm(true); }} style={{ width: '100%', padding: '12px 0', background: '#dc2626', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
              Submit Examination
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL ───────────────────────── */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Warning size={32} color="#f59e0b" weight="fill" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Submit Examination?</h2>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>Are you sure you want to submit?</p>
            <div style={{ background: '#f8f8f8', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#888' }}>Answered</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{answeredCount} / {questions.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#888' }}>Not Answered</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{questions.length - answeredCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#888' }}>Marked for Review</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{bookmarkedCount}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: '14px 0', background: '#f5f5f5', color: '#666', fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 12, cursor: 'pointer' }}>
                Go Back
              </button>
              <button onClick={doSubmit} disabled={isSubmitting}
                style={{ flex: 1, padding: '14px 0', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {isSubmitting ? <Spinner size={16} /> : null}
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
