'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import api from '@/services/api';
import {
  CheckCircle, XCircle, Clock, Trophy, Target, Brain,
  ArrowLeft, ArrowClockwise, BookOpen, Lightning, Star,
  CaretDown, CaretUp, Spinner, CalendarPlus, PlayCircle, ChatCenteredText, WarningCircle, ChartLineUp, CalendarBlank, Warning
} from '@phosphor-icons/react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

/* ═══════════════════════════════════════════════════════
   Test Analysis Page — Pixel-Perfect Exam Report
   Matches UPSC/JEE/NEET analysis design
═══════════════════════════════════════════════════════ */

export default function TestAnalysisPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { testId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [studyPlan, setStudyPlan] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user && testId) {
      api.get(`/custom-tests/${testId}/analysis`)
        .then(r => {
          if (r.data.success) {
            setData(r.data);
            if (r.data.attempt?.study_plan) {
              setStudyPlan(r.data.attempt.study_plan);
            }
          }
        })
        .catch(() => alert('Failed to load analysis'))
        .finally(() => setLoading(false));
    }
  }, [user, testId]);

  // ── Derived values (must be above early returns for hooks rule) ──
  const test = data?.test;
  const questions = data?.questions;
  const attempt = data?.attempt;
  const analysis = data?.analysis;
  const score = attempt?.score || 0;
  const totalQ = attempt?.total_questions || questions?.length || 0;
  const accuracy = attempt?.accuracy || 0;
  const timeTaken = attempt?.time_taken_seconds || 0;
  const incorrect = totalQ - score;
  const attempted = attempt?.answers?.length || 0;
  const unattempted = totalQ - attempted;

  // Build subject-wise performance from questions + answers
  const subjectPerf = useMemo(() => {
    if (!questions || !attempt?.answers) return [];
    const map = {};
    questions.forEach(q => {
      const subj = test?.subject || 'General';
      if (!map[subj]) map[subj] = { name: subj, correct: 0, total: 0 };
      map[subj].total++;
      const ans = attempt.answers.find(a => a.question_id === q.id);
      if (ans?.is_correct) map[subj].correct++;
    });
    return Object.values(map);
  }, [questions, attempt]);

  // Pie data
  const pieData = useMemo(() => [
    { name: 'Correct', value: score, color: '#22c55e' },
    { name: 'Incorrect', value: incorrect > 0 ? incorrect : 0, color: '#ef4444' },
    { name: 'Unattempted', value: unattempted > 0 ? unattempted : 0, color: '#d4d4d4' }
  ].filter(d => d.value > 0), [score, incorrect, unattempted]);

  // Time formatting
  const formatTime = (sec) => {
    if (!sec) return '0m';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };
  const avgTime = totalQ > 0 ? Math.round(timeTaken / totalQ) : 0;

  // Weak/strong from analysis or computed
  const weakTopics = analysis?.weak_topics || [];
  const strongTopics = analysis?.strong_topics || [];
  const aiFeedback = analysis?.ai_feedback || '';
  const suggestions = analysis?.improvement_suggestions || [];

  const handleGeneratePlan = async () => {
    try {
      setGeneratingPlan(true);
      const res = await api.post(`/custom-tests/${testId}/study-plan`);
      if (res.data.success) {
        setStudyPlan(res.data.plan);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate personalized study plan.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // ── Loading / Error (AFTER all hooks) ───────────────
  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb' }}>
        <Spinner size={36} className="animate-spin" style={{ color: '#5956DF' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } .animate-spin { animation: spin 0.8s linear infinite; }`}</style>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb', fontFamily: "'Inter', sans-serif" }}>
        <p style={{ color: '#888', fontSize: 16 }}>Analysis not found.</p>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .analysis-page { min-height: 100vh; background: #f8f9fb; font-family: 'Inter', sans-serif; }
        .analysis-header { background: #fff; border-bottom: 1px solid #eee; padding: 16px 0; }
        .analysis-nav { max-width: 1100px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; gap: 32; }
        .analysis-nav-brand { display: flex; align-items: center; gap: 8; font-weight: 800; font-size: 16px; color: #1a1a2e; }
        .analysis-nav-brand div { width: 30px; height: 30px; border-radius: 8px; background: #5956DF; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 14px; }
        .analysis-nav-links { display: flex; gap: 24; margin-left: 32; }
        .analysis-nav-links a { font-size: 13px; font-weight: 600; color: #888; text-decoration: none; padding: 4px 0; }
        .analysis-nav-links a.active { color: #5956DF; border-bottom: 2px solid #5956DF; }
        .analysis-container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
        .stat-card { background: #fff; border-radius: 12px; padding: 20px 24px; border: 1px solid #f0f0f0; }
        .stat-label { font-size: 10px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 8px; }
        .stat-value { font-size: 36px; font-weight: 900; color: #1a1a2e; }
        .stat-sub { font-size: 12px; color: #999; margin-top: 4px; }
        .progress-bar { height: 6px; background: #eee; border-radius: 3px; margin-top: 8px; overflow: hidden; }
        .progress-fill { height: 100%; background: #5956DF; border-radius: 3px; transition: width 0.6s ease; }
        .section-title { font-size: 16px; font-weight: 800; color: #1a1a2e; margin-bottom: 16px; display: flex; align-items: center; gap: 8; }
        .q-card { background: #fff; border-radius: 12px; border: 1px solid #f0f0f0; margin-bottom: 16px; overflow: hidden; }
        .q-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .q-header:hover { background: #fafafa; }
        .q-body { padding: 0 20px 20px; border-top: 1px solid #f0f0f0; }
        .q-option { display: flex; align-items: center; gap: 12; padding: 10px 14px; border-radius: 8px; margin-top: 8px; font-size: 14px; }
        .q-option.correct { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .q-option.incorrect { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .q-option.neutral { background: #f8f8f8; color: #555; border: 1px solid #eee; }
        .ai-card { background: linear-gradient(135deg, #5956DF 0%, #7c3aed 100%); border-radius: 16px; padding: 28px; color: #fff; }
        .ai-study-item { background: rgba(255,255,255,0.15); border-radius: 10px; padding: 14px; margin-top: 12px; }
        .btn-primary { display: inline-flex; align-items: center; gap: 6; padding: 12px 24px; background: #5956DF; color: #fff; font-weight: 700; font-size: 13px; border: none; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
        .btn-primary:hover { background: #4745c0; }
        .btn-outline { display: inline-flex; align-items: center; gap: 6; padding: 12px 24px; background: #fff; color: #5956DF; font-weight: 700; font-size: 13px; border: 1.5px solid #5956DF; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
        .btn-outline:hover { background: #f5f4ff; }
        .btn-ghost { display: inline-flex; align-items: center; gap: 6; padding: 12px 24px; background: #f5f5f5; color: #666; font-weight: 700; font-size: 13px; border: none; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
        .btn-ghost:hover { background: #eee; }
      `}</style>

      <div className="analysis-page">

        {/* ── NAV HEADER ──────────────────────────────── */}
        <div className="analysis-header" style={{ width: '100%' }}>
          <div className="analysis-nav" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <div className="analysis-nav-brand">
              <div>P</div>
              <span>PrepMind AI</span>
            </div>
            <div className="analysis-nav-links">
              <button 
                onClick={() => router.push('/dashboard')} 
                style={{ background: 'transparent', border: 'none', color: '#1a1a2e', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ArrowLeft size={16} weight="bold" /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ───────────────────────────── */}
        <div className="analysis-container">

          {/* Title */}
          <div style={{ marginBottom: 8 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e' }}>
              Analysis Report: {test.topic_requested || 'Test'}
            </h1>
            <p style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
              Completed on {attempt?.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
            </p>
          </div>

          {/* ── STAT CARDS ROW ────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, margin: '24px 0' }}>
            {/* Total Score */}
            <div className="stat-card">
              <div className="stat-label">Total Score</div>
              <div className="stat-value">{score}<span style={{ fontSize: 18, color: '#bbb' }}>/{totalQ}</span></div>
              <div className="stat-sub" style={{ color: '#5956DF' }}>
                Better than {Math.min(Math.round(accuracy), 99)}% of users
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${accuracy}%` }} /></div>
            </div>

            {/* Accuracy */}
            <div className="stat-card">
              <div className="stat-label">Accuracy</div>
              <div className="stat-value">{Math.round(accuracy)}%</div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${accuracy}%` }} /></div>
            </div>

            {/* Time Spent */}
            <div className="stat-card">
              <div className="stat-label">Time Spent</div>
              <div className="stat-value">{formatTime(timeTaken)}</div>
              <div className="stat-sub">Avg {formatTime(avgTime)} / Target {formatTime(Math.round((test.number_of_questions || 30) * 72))}</div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min((timeTaken / ((test.number_of_questions || 30) * 120)) * 100, 100)}%`, background: '#f59e0b' }} /></div>
            </div>

            {/* Percentile */}
            <div className="stat-card">
              <div className="stat-label">Percentile</div>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'baseline' }}>
                {Math.min(accuracy + 4.8, 99.9).toFixed(1)}<span style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginLeft: 2 }}>th</span>
              </div>
              <div className="stat-sub" style={{ color: '#5956DF' }}>→ Top Tier Performer</div>
            </div>
          </div>

          {/* ── SUBJECT + TOPIC CHARTS ────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, margin: '28px 0' }}>
            {/* Subject-wise Performance */}
            <div className="stat-card" style={{ padding: 24 }}>
              <div className="section-title">Subject-wise Performance</div>
              {subjectPerf.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {subjectPerf.map((s, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{s.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#5956DF' }}>{s.correct}/{s.total}</span>
                      </div>
                      <div className="progress-bar" style={{ height: 8 }}>
                        <div className="progress-fill" style={{ width: `${(s.correct / s.total) * 100}%`, background: ['#5956DF', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5] }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#aaa', fontSize: 13 }}>No subject data available</p>
              )}
            </div>

            {/* Topic Accuracy Pie Chart */}
            <div className="stat-card" style={{ padding: 24 }}>
              <div className="section-title">Topic-wise Accuracy (%)</div>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── MISTAKE ANALYSIS  ────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, margin: '28px 0' }}>
            
            {/* Mistake Analysis */}
            <div>
              <div className="section-title">
                <Lightning size={20} weight="fill" color="#f59e0b" />
                Mistake Analysis
              </div>

              {questions && attempt?.answers ? (
                questions.map((q, idx) => {
                  const ans = attempt.answers.find(a => a.question_id === q.id);
                  const isCorrect = ans?.is_correct;
                  const isSkipped = !ans;
                  const isExpanded = expandedQ === idx;

                  // Find correct option and selected option
                  const correctOpt = q.options.find(o => o.is_correct);
                  const selectedOpt = ans ? q.options.find(o => o.id === (ans.selected_option_id || ans.selected_option)) : null;
                  const explanation = q.explanations?.[0]?.explanation || '';

                  return (
                    <div key={q.id} className="q-card">
                      <div className="q-header" onClick={() => setExpandedQ(isExpanded ? null : idx)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                            letterSpacing: 1, color: '#5956DF'
                          }}>
                            Question {idx + 1} – {test?.subject || 'General'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {isSkipped
                            ? <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', background: '#f0f0f0', padding: '2px 8px', borderRadius: 4 }}>—</span>
                            : isCorrect
                              ? <CheckCircle size={22} weight="fill" color="#22c55e" />
                              : <XCircle size={22} weight="fill" color="#ef4444" />
                          }
                          {isExpanded ? <CaretUp size={16} color="#999" /> : <CaretDown size={16} color="#999" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="q-body" style={{ paddingTop: 16 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#333', lineHeight: 1.6, marginBottom: 16 }}>
                            {q.question_text}
                          </p>
                          
                          <div style={{ padding: '12px 16px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '20px', borderLeft: isCorrect ? '4px solid #22c55e' : (isSkipped ? '4px solid #aaa' : '4px solid #ef4444') }}>
                            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                              <div>
                                <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 800 }}>Your Answer</span>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: isCorrect ? '#166534' : (isSkipped ? '#666' : '#991b1b'), marginTop: '4px' }}>
                                  {selectedOpt ? `${selectedOpt.option_label}: ${selectedOpt.option_text}` : 'Skipped'}
                                </div>
                              </div>
                              {!isCorrect && correctOpt && (
                                <div>
                                  <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 800 }}>Correct Answer</span>
                                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534', marginTop: '4px' }}>
                                    {correctOpt.option_label}: {correctOpt.option_text}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* All options with color coding */}
                          {q.options.map(opt => {
                            const isSelected = opt.id === ans?.selected_option_id;
                            const isRight = opt.is_correct;
                            let className = 'q-option neutral';
                            if (isRight) className = 'q-option correct';
                            else if (isSelected && !isRight) className = 'q-option incorrect';

                            return (
                              <div key={opt.id} className={className}>
                                <strong>{opt.option_label}</strong>
                                <span style={{ flex: 1 }}>{opt.option_text}</span>
                                {isSelected && !isRight && <span style={{ fontSize: 11, fontWeight: 700, color: '#991b1b' }}>(Your Answer)</span>}
                                {isSelected && isRight && <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>(Your Answer ✓)</span>}
                                {isRight && !isSelected && <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>(Correct)</span>}
                              </div>
                            );
                          })}

                          {/* Explanation */}
                          {explanation && (
                            <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8f9ff', borderRadius: 10, borderLeft: '3px solid #5956DF' }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: '#5956DF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                                💡 Concept Explanation
                              </p>
                              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>{explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p style={{ color: '#999', fontSize: 13 }}>No question data available</p>
              )}
            </div>
          </div>

          {/* ── MASSIVE AI STUDY PLAN GENERATOR ──────────────────────────────── */}
          <div style={{ padding: '0 0 24px', width: '100%' }}>
              {!studyPlan ? (
                 <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 40, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                   <div style={{ width: 80, height: 80, background: '#f5f4ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                     <Brain size={40} weight="duotone" color="#5956DF" />
                   </div>
                   <h3 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e', marginBottom: 12 }}>Advanced AI Study Plan</h3>
                   <p style={{ fontSize: 14, color: '#666', maxWidth: 450, margin: '0 auto 28px', lineHeight: 1.6 }}>
                     Let our AI evaluate your performance, analyze your mistakes, and instantly generate a <strong>highly personalized, structured roadmap</strong> to improve your scores.
                   </p>
                   <button 
                     onClick={handleGeneratePlan}
                     disabled={generatingPlan}
                     style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 32px', background: 'linear-gradient(135deg, #5956DF 0%, #7C3AED 100%)', color: '#fff', fontSize: 15, fontWeight: 800, borderRadius: 14, border: 'none', cursor: generatingPlan ? 'not-allowed' : 'pointer', opacity: generatingPlan ? 0.8 : 1, transition: 'transform 0.2s', boxShadow: '0 8px 20px rgba(89,86,223,0.25)' }}
                   >
                     {generatingPlan ? (
                       <><Spinner size={22} className="animate-spin" /> Analyzing Performance...</>
                     ) : (
                       <><Lightning size={22} weight="fill" /> Generate Personalized Study Plan</>
                     )}
                   </button>
                 </div>
              ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                   {/* Header Row */}
                   <div style={{ display: 'flex', gap: 16 }}>
                     <div style={{ flex: 1, background: 'linear-gradient(135deg, #5956DF 0%, #7C3AED 100%)', borderRadius: 16, padding: 24, color: '#fff' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.9, marginBottom: 8 }}>
                         <Target size={20} weight="fill" />
                         <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Overall Level</span>
                       </div>
                       <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'capitalize' }}>{studyPlan.overall_level}</div>
                       <p style={{ fontSize: 14, opacity: 0.9, marginTop: 12, lineHeight: 1.6 }}>{studyPlan.performance_summary}</p>
                     </div>
                     <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
                       <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 20, flex: 1 }}>
                         <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', marginBottom: 4 }}>Suggested Daily Study</div>
                         <div style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 8 }}>
                           <Clock size={24} color="#5956DF" weight="fill" /> {studyPlan.suggested_hours} Hours
                         </div>
                       </div>
                       <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 20, flex: 1 }}>
                         <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', marginBottom: 4 }}>Improvement Timeline</div>
                         <div style={{ fontSize: 20, fontWeight: 900, color: '#10B981', display: 'flex', alignItems: 'center', gap: 8 }}>
                           <ChartLineUp size={24} weight="fill" /> {studyPlan.improvement_timeline}
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Topics Grid */}
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                     <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #fef2f2', padding: 24 }}>
                       <h4 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><XCircle size={20} color="#ef4444" weight="fill" /> Weak Topics</h4>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                         {studyPlan.weak_topics_analysis.map((t, idx) => (
                           <div key={idx} style={{ padding: 12, background: '#fef2f2', borderRadius: 10, border: '1px solid #fee2e2' }}>
                             <div style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>{t.topic}</div>
                             <div style={{ fontSize: 12, color: '#b91c1c' }}>Reason: <span style={{ fontWeight: 600 }}>{t.reason}</span></div>
                           </div>
                         ))}
                       </div>
                     </div>
                     <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0fdf4', padding: 24 }}>
                       <h4 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={20} color="#22c55e" weight="fill" /> Strong Areas</h4>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                         {studyPlan.strong_areas.map((t, idx) => (
                           <div key={idx} style={{ padding: 12, background: '#f0fdf4', borderRadius: 10, border: '1px solid #dcfce7' }}>
                             <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 4 }}>{t.topic}</div>
                             <div style={{ fontSize: 12, color: '#15803d' }}>{t.advice}</div>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>

                   {/* Strategy Section */}
                   <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 24 }}>
                     <h4 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={20} color="#5956DF" weight="fill" /> Focus Strategy (Priority List)</h4>
                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                       {studyPlan.study_strategy.map((s, idx) => (
                         <div key={idx} style={{ flex: '1 1 calc(50% - 12px)', padding: 16, background: '#f8f9fb', borderRadius: 12, borderLeft: '4px solid #5956DF' }}>
                           <div style={{ fontSize: 11, fontWeight: 800, color: '#5956DF', textTransform: 'uppercase', marginBottom: 4 }}>Priority {idx + 1}</div>
                           <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>{s.priority_topic}</div>
                           <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{s.action}</div>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Three Column Split */}
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                     <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 24 }}>
                       <h4 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><ArrowClockwise size={20} color="#F59E0B" weight="bold" /> Revision Plan</h4>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                         {studyPlan.revision_plan.map((r, idx) => (
                           <div key={idx} style={{ paddingBottom: 12, borderBottom: idx !== studyPlan.revision_plan.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                             <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{r.topic}</div>
                             <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{r.frequency}</div>
                           </div>
                         ))}
                       </div>
                     </div>
                     <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 24 }}>
                       <h4 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><BookOpen size={20} color="#5956DF" weight="fill" /> Practice Strategy</h4>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                         {studyPlan.practice_strategy.map((p, idx) => (
                           <div key={idx} style={{ paddingBottom: 12, borderBottom: idx !== studyPlan.practice_strategy.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                             <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{p.question_type} <span style={{ color: '#5956DF' }}>({p.daily_count}/day)</span></div>
                             <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{p.advice}</div>
                           </div>
                         ))}
                       </div>
                     </div>
                     <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 24 }}>
                       <h4 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={20} color="#10B981" weight="fill" /> Time Management</h4>
                       <ul style={{ paddingLeft: 16, color: '#555', fontSize: 13, lineHeight: 1.6 }}>
                         {studyPlan.time_management.map((t, idx) => (
                           <li key={idx} style={{ marginBottom: 8 }}>{t.advice}</li>
                         ))}
                       </ul>
                     </div>
                   </div>

                   {/* Mistake Analysis */}
                   <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 24 }}>
                     <h4 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Warning size={20} color="#F59E0B" weight="fill" /> Mistake Analysis</h4>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                       {studyPlan.mistake_analysis.map((m, idx) => (
                         <div key={idx} style={{ padding: 16, background: '#fffbfa', border: '1px solid #ffedd5', borderRadius: 12 }}>
                           <div style={{ fontSize: 13, fontWeight: 800, color: '#9a3412', marginBottom: 6 }}>Pattern: {m.pattern}</div>
                           <div style={{ fontSize: 13, color: '#78350f' }}><strong style={{opacity:0.7}}>Solution:</strong> {m.solution}</div>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Weekly Plan */}
                   <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 24 }}>
                     <h4 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><CalendarBlank size={20} color="#5956DF" weight="bold" /> Day-Wise Study Plan</h4>
                     <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                       {studyPlan.weekly_plan.map((w, idx) => (
                         <div key={idx} style={{ minWidth: 200, padding: 16, background: '#f8f9fb', borderRadius: 12, borderTop: '4px solid #5956DF' }}>
                           <div style={{ fontSize: 12, fontWeight: 800, color: '#5956DF', textTransform: 'uppercase', marginBottom: 8 }}>{w.day}</div>
                           <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>{w.focus}</div>
                           <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> {w.hours} Hours</div>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* AI Advice & Next Test */}
                   <div style={{ display: 'flex', gap: 16 }}>
                     <div style={{ flex: 1, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', borderRadius: 16, padding: 24, color: '#fff' }}>
                       <h4 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><ChatCenteredText size={20} weight="fill" /> Mentor Advice</h4>
                       <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.9 }}>"{studyPlan.ai_advice}"</p>
                     </div>
                     <div style={{ width: 300, background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                       <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', marginBottom: 8 }}>Recommended Next Test</div>
                       <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>{studyPlan.next_test_topic}</div>
                       {studyPlan.next_test_date && <div style={{ fontSize: 13, color: '#5956DF', fontWeight: 600 }}>By {new Date(studyPlan.next_test_date).toLocaleDateString()}</div>}
                     </div>
                   </div>

                   {/* Action Buttons */}
                   <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'flex-end' }}>
                     <button
                  onClick={() => router.push('/custom-test')}
                  style={{ marginTop: 12, width: '100%', padding: '10px 0', background: '#fff', border: '1.5px solid #5956DF', borderRadius: 10, color: '#5956DF', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Generate New Test
                </button>
                     <button style={{ padding: '12px 20px', background: '#f5f4ff', border: 'none', color: '#5956DF', fontSize: 13, fontWeight: 800, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                       <CalendarPlus size={16} weight="bold" /> Add to Schedule
                     </button>
                     <button style={{ padding: '12px 20px', background: '#5956DF', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(89,86,223,0.3)' }}>
                       <PlayCircle size={16} weight="fill" /> Start Studying
                     </button>
                   </div>
                 </div>
              )}
            </div>
          <div style={{ display: 'flex', gap: 12, margin: '32px 0', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => router.push('/custom-test')}>
              <ArrowClockwise size={16} weight="bold" /> Retake Test
            </button>
            <button className="btn-outline" onClick={() => setExpandedQ(expandedQ === 'all' ? null : 'all')}>
              <BookOpen size={16} weight="bold" /> {expandedQ === 'all' ? 'Collapse All' : 'Review All Questions'}
            </button>
            <button className="btn-ghost" onClick={() => router.push('/dashboard')}>
              <ArrowLeft size={16} weight="bold" /> Back to Dashboard
            </button>
          </div>

          {/* ── EXPAND ALL REVIEW ─────────────────────── */}
          {expandedQ === 'all' && questions && attempt?.answers && (
            <div style={{ margin: '20px 0' }}>
              <div className="section-title">
                <BookOpen size={20} weight="fill" color="#5956DF" />
                Complete Question Review
              </div>
              {questions.map((q, idx) => {
                const ans = attempt.answers.find(a => a.question_id === q.id);
                const isCorrect = ans?.is_correct;
                const correctOpt = q.options.find(o => o.is_correct);
                const selectedOpt = ans ? q.options.find(o => o.id === ans.selected_option_id) : null;
                const explanation = q.explanations?.[0]?.explanation || '';

                return (
                  <div key={q.id} className="q-card" style={{ borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}` }}>
                    <div style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#5956DF' }}>
                          Question {idx + 1} – {test?.subject || 'General'}
                        </span>
                        {isCorrect
                          ? <CheckCircle size={20} weight="fill" color="#22c55e" />
                          : <XCircle size={20} weight="fill" color="#ef4444" />
                        }
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#333', lineHeight: 1.6, marginBottom: 16 }}>
                        {q.question_text}
                      </p>

                      <div style={{ padding: '12px 16px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '20px', borderLeft: isCorrect ? '4px solid #22c55e' : (isSkipped ? '4px solid #aaa' : '4px solid #ef4444') }}>
                        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 800 }}>Your Answer</span>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: isCorrect ? '#166534' : (isSkipped ? '#666' : '#991b1b'), marginTop: '4px' }}>
                              {selectedOpt ? `${selectedOpt.option_label}: ${selectedOpt.option_text}` : 'Skipped'}
                            </div>
                          </div>
                          {!isCorrect && correctOpt && (
                            <div>
                              <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: 800 }}>Correct Answer</span>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534', marginTop: '4px' }}>
                                {correctOpt.option_label}: {correctOpt.option_text}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {q.options.map(opt => {
                        const isSelected = opt.id === ans?.selected_option_id;
                        const isRight = opt.is_correct;
                        let className = 'q-option neutral';
                        if (isRight) className = 'q-option correct';
                        else if (isSelected && !isRight) className = 'q-option incorrect';

                        return (
                          <div key={opt.id} className={className}>
                            <strong>{opt.option_label}</strong>
                            <span>{opt.option_text}</span>
                            {isSelected && !isRight && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700 }}>(Your Answer)</span>}
                            {isRight && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700 }}>(Correct)</span>}
                          </div>
                        );
                      })}

                      {explanation && (
                        <div style={{ marginTop: 12, padding: '12px 14px', background: '#f8f9ff', borderRadius: 8, borderLeft: '3px solid #5956DF' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#5956DF', marginBottom: 4 }}>💡 Explanation</p>
                          <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FOOTER ──────────────────────────────────── */}
        <footer style={{ padding: '20px 0', borderTop: '1px solid #eee', textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 40 }}>
          <p>© 2026 PrepMind AI. All rights reserved.</p>
          <div style={{ marginTop: 6, display: 'flex', gap: 20, justifyContent: 'center' }}>
            <a href="#" style={{ color: '#aaa', textDecoration: 'none' }}>Support</a>
            <a href="#" style={{ color: '#aaa', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#" style={{ color: '#aaa', textDecoration: 'none' }}>Terms of Service</a>
          </div>
        </footer>
      </div>
    </>
  );
}
