'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import { CaretLeft, CheckCircle, XCircle, Sparkle, House, ArrowLeft, LightbulbFilament } from '@phosphor-icons/react';

export default function PracticeTestReviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { testId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  useEffect(() => {
    if (user && testId) {
      api.get(`/custom-tests/${testId}/analysis`)
        .then(r => setData(r.data))
        .catch(() => alert('Failed to load test review'))
        .finally(() => setLoading(false));
    }
  }, [user, testId]);

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]"><div className="w-10 h-10 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" /></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB] text-[#1A1A1A]">Review not found</div>;

  const { test, questions, attempt, analysis } = data;
  const answerMap = {};
  (attempt?.answers || []).forEach(a => { answerMap[a.question_id] = a; });

  const labels = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="min-h-screen bg-[#FAFAFB] font-sans text-[#1A1A1A]">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/practice')} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-[#4B5563] hover:bg-gray-50 transition-colors">
            <CaretLeft size={20} />
          </button>
          <div>
            <h1 className="text-[18px] font-extrabold text-[#1A1A1A]">{test.topic_requested}</h1>
            <p className="text-[12px] text-[#6B7280] capitalize">{test.difficulty_level || test.difficulty} • {test.number_of_questions} questions • {test.subject_id?.split(',')[0] || 'General'}</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Score Card */}
        {attempt && (
          <div className="bg-gradient-to-br from-[#5956DF]/10 via-white to-emerald-500/5 rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Score</p>
                <p className="text-3xl font-extrabold text-[#5956DF]">{attempt.score}<span className="text-lg text-[#9CA3AF]">/{attempt.total_questions}</span></p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Accuracy</p>
                <p className="text-3xl font-extrabold text-emerald-500">{Math.round(attempt.accuracy)}%</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Time</p>
                <p className="text-3xl font-extrabold text-[#F59E0B]">{Math.floor((attempt.time_taken_seconds || 0) / 60)}m</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {analysis && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-[15px] font-extrabold text-[#5956DF] flex items-center gap-2 mb-4">
              <Sparkle size={18} weight="fill" /> AI Analysis
            </h2>
            {analysis.ai_feedback && (
              <p className="text-[14px] text-[#4B5563] leading-relaxed mb-4">{analysis.ai_feedback}</p>
            )}
            {analysis.improvement_suggestions && (
              <div className="bg-[#5956DF]/5 border border-[#5956DF]/10 rounded-xl p-4 mb-3">
                <p className="text-[12px] font-bold text-[#5956DF] mb-1">💡 Suggestions</p>
                <p className="text-[13px] text-[#4B5563]">{analysis.improvement_suggestions}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {(analysis.weak_topics || []).map((t, i) => (
                <span key={i} className="px-3 py-1 bg-red-50 text-red-600 text-[11px] font-bold rounded-full">⚠ {t}</span>
              ))}
              {(analysis.strong_topics || []).map((t, i) => (
                <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded-full">✓ {t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Questions Review */}
        <h2 className="text-[16px] font-extrabold text-[#1A1A1A] flex items-center gap-2">
          <LightbulbFilament size={20} className="text-[#F59E0B]" weight="fill" /> Question Review
        </h2>

        {questions.map((q, qIdx) => {
          const ans = answerMap[q.id];
          const isCorrect = ans?.is_correct;
          const selectedOptId = ans?.selected_option_id;
          
          return (
            <div key={q.id} className={`bg-white rounded-2xl border p-6 shadow-sm ${isCorrect === true ? 'border-emerald-500/20' : isCorrect === false ? 'border-red-500/20' : 'border-gray-100'}`}>
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {isCorrect ? <CheckCircle size={18} className="text-emerald-500" weight="fill" /> : <XCircle size={18} className="text-red-500" weight="fill" />}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-bold text-[#1A1A1A] leading-relaxed">Q{qIdx + 1}. {q.question_text}</p>
                  {q.concept_tested && <p className="text-[11px] text-[#9CA3AF] mt-1 uppercase tracking-wider">{q.concept_tested}</p>}
                </div>
              </div>

              <div className="space-y-2 ml-11 mb-4">
                {q.options.map((opt, i) => {
                  const isSelected = selectedOptId === opt.id;
                  const isCorrectOption = opt.is_correct;
                  let borderColor = 'border-gray-100';
                  let bg = '';
                  if (isCorrectOption) { borderColor = 'border-emerald-500/30'; bg = 'bg-emerald-50'; }
                  if (isSelected && !isCorrectOption) { borderColor = 'border-red-500/30'; bg = 'bg-red-50'; }

                  return (
                    <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border ${borderColor} ${bg}`}>
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-[12px] font-bold shrink-0 ${isCorrectOption ? 'bg-emerald-100 text-emerald-600' : isSelected ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-[#6B7280]'}`}>
                        {opt.option_label || labels[i]}
                      </div>
                      <span className={`text-[13px] flex-1 ${isCorrectOption ? 'font-bold text-emerald-600' : isSelected ? 'text-red-600' : 'text-[#4B5563]'}`}>
                        {opt.option_text}
                      </span>
                      {isCorrectOption && <CheckCircle size={16} className="text-emerald-500 shrink-0" weight="fill" />}
                      {isSelected && !isCorrectOption && <XCircle size={16} className="text-red-500 shrink-0" weight="fill" />}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {q.explanation && (
                <div className="ml-11 bg-[#F59E0B]/5 border border-[#F59E0B]/10 rounded-xl p-4">
                  <p className="text-[12px] font-bold text-[#F59E0B] mb-1">💡 Explanation</p>
                  <p className="text-[13px] text-[#4B5563] leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}

        {/* Bottom Actions */}
        <div className="flex gap-3 pt-4 pb-8">
          <button onClick={() => router.push('/practice')} className="flex-1 py-4 bg-[#5956DF] hover:bg-[#4B49C8] text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
            <ArrowLeft size={18} /> Back to Practice
          </button>
          <button onClick={() => router.push('/dashboard')} className="flex-1 py-4 bg-white border border-gray-200 hover:bg-gray-50 text-[#4B5563] font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
            <House size={18} weight="fill" /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
