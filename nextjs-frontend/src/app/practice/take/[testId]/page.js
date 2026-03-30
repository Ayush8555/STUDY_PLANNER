'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import { CaretLeft, CheckCircle, Clock, XCircle, House } from '@phosphor-icons/react';

export default function TestTakePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { testId } = useParams();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State for taking test
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { question_id: selected_option_id }
  const [timeSpent, setTimeSpent] = useState({}); // { question_id: seconds }
  const [sessionStartTime, setSessionStartTime] = useState(new Date());

  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  useEffect(() => {
    if (user && testId) {
      api.get(`/custom-tests/${testId}`)
        .then(r => setTest(r.data.test))
        .catch(() => alert('Failed to load test'))
        .finally(() => setLoading(false));
    }
  }, [user, testId]);

  // Basic timer for current question
  useEffect(() => {
    if (!test || result) return;
    const qId = test.questions[currentIdx]?.id;
    if (!qId) return;

    const interval = setInterval(() => {
       setTimeSpent(prev => ({
         ...prev,
         [qId]: (prev[qId] || 0) + 1
       }));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIdx, test, result]);

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]"><div className="w-10 h-10 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" /></div>;
  if (!test) return <div className="min-h-screen flex items-center justify-center">Test not found</div>;

  const questions = test.questions;
  const currentQ = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;

  const handleSelectOption = (optId) => {
    if (result) return;
    setAnswers(prev => ({ ...prev, [currentQ.id]: optId }));
  };

  const handleNext = () => {
    if (!isLast) setCurrentIdx(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx(prev => prev - 1);
  };

  const handleSubmit = async () => {
     if (Object.keys(answers).length < questions.length) {
        if (!confirm('You have unanswered questions. Submit anyway?')) return;
     }

     setIsSubmitting(true);
     const totalTimeTaken = Math.floor((new Date() - sessionStartTime) / 1000);
     
     const payload = {
        time_taken_seconds: totalTimeTaken,
        answers: Object.keys(answers).map(qId => ({
           question_id: qId,
           selected_option_id: answers[qId],
           time_taken_seconds: timeSpent[qId] || 0
        }))
     };

     try {
       const res = await api.post(`/custom-tests/${testId}/submit`, payload);
       if (res.data.success) {
          setResult(res.data.attempt);
       }
     } catch (error) {
       console.error(error);
       alert('Failed to submit test');
     } finally {
       setIsSubmitting(false);
     }
  };

  if (result) {
     return (
       <div className="min-h-screen bg-[#FAFAFB] flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg border border-gray-100 text-center">
             <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-emerald-500" weight="fill" />
             </div>
             <h1 className="text-2xl font-extrabold text-[#1A1A1A] mb-2">Test Completed!</h1>
             <p className="text-[#6B7280] mb-8">Your results have been saved to your analytics.</p>
             
             <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 rounded-2xl p-4">
                   <p className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Score</p>
                   <p className="text-2xl font-extrabold text-[#5956DF]">{result.score} <span className="text-base text-[#9CA3AF]">/ {questions.length}</span></p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                   <p className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Accuracy</p>
                   <p className="text-2xl font-extrabold text-[#10B981]">{Math.round(result.accuracy)}%</p>
                </div>
             </div>
             
             <div className="flex gap-3">
                <button onClick={() => router.push(`/practice/analysis/${testId}`)} className="flex-1 py-4 bg-[#5956DF] hover:bg-[#4B49C8] text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
                   Review Analysis
                </button>
                <button onClick={() => router.push('/dashboard')} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-[#4B5563] font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                   <House size={18} weight="fill" /> Dashboard
                </button>
             </div>
          </div>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFB] font-sans flex flex-col">
       <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
             <button onClick={() => router.back()} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#4B5563] hover:bg-gray-50 transition-colors">
                <CaretLeft size={20} />
             </button>
             <div>
                <h1 className="text-[16px] font-extrabold text-[#1A1A1A]">Practice Session</h1>
                <p className="text-[12px] text-[#9CA3AF]">Question {currentIdx + 1} of {questions.length}</p>
             </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-[#5956DF]/10 text-[#5956DF] px-4 py-2 rounded-lg font-bold text-[13px] flex items-center gap-2">
              <Clock size={16} weight="bold" /> {timeSpent[currentQ.id] || 0}s
            </div>
            <button 
              onClick={handleSubmit} disabled={isSubmitting}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold text-[13px] hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              End Test
            </button>
          </div>
       </header>

       <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-10 flex flex-col">
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-gray-200 rounded-full mb-10 overflow-hidden">
             <div className="h-full bg-[#5956DF] transition-all duration-300" style={{ width: `${((currentIdx) / questions.length) * 100}%` }} />
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex-1 flex flex-col">
             <div className="mb-8">
                <span className="inline-block px-3 py-1 bg-gray-100 text-[#4B5563] text-[11px] font-bold rounded-md mb-4 uppercase tracking-wider">
                   {currentQ.difficulty || 'Medium'}
                </span>
                <h2 className="text-[20px] md:text-[24px] font-bold text-[#1A1A1A] leading-relaxed">
                   {currentQ.question_text}
                </h2>
             </div>

             <div className="space-y-3 flex-1">
                {currentQ.options.map((opt, i) => {
                   const isSelected = answers[currentQ.id] === opt.id;
                   const labels = ['A', 'B', 'C', 'D', 'E'];
                   return (
                     <button
                        key={opt.id}
                        onClick={() => handleSelectOption(opt.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all hover:-translate-y-0.5 ${isSelected ? 'border-[#5956DF] bg-[#5956DF]/5 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                     >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[14px] shrink-0 transition-colors ${isSelected ? 'bg-[#5956DF] text-white' : 'bg-gray-100 text-[#6B7280]'}`}>
                           {labels[i]}
                        </div>
                        <span className={`text-[15px] md:text-[16px] flex-1 ${isSelected ? 'font-bold text-[#1A1A1A]' : 'font-medium text-[#4B5563]'}`}>
                           {opt.option_text}
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-[#5956DF]' : 'border-gray-300'}`}>
                           {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#5956DF]" />}
                        </div>
                     </button>
                   );
                })}
             </div>

             <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
                <button 
                  onClick={handlePrev} disabled={currentIdx === 0}
                  className="px-6 py-3 font-bold text-[14px] text-[#6B7280] hover:text-[#1A1A1A] disabled:opacity-30 disabled:hover:text-[#6B7280] transition-colors"
                >
                   Previous
                </button>

                {!isLast ? (
                   <button 
                     onClick={handleNext}
                     className="px-8 py-3 bg-[#1A1A1A] hover:bg-black text-white font-bold text-[14px] rounded-xl shadow-md transition-colors"
                   >
                      Next Question
                   </button>
                ) : (
                   <button 
                     onClick={handleSubmit} disabled={isSubmitting}
                     className="px-8 py-3 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-[14px] rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                   >
                      Submit Test
                   </button>
                )}
             </div>
          </div>
       </main>
    </div>
  );
}
