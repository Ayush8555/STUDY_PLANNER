'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import {
  SignOut, Lightning, Brain,
  PaperPlaneRight, CalendarCheck, CheckCircle, Clock
} from '@phosphor-icons/react';
import { getNavItems } from '@/lib/navItems';

const NAV_ITEMS = getNavItems('/smart-revision');

export default function SmartRevisionPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loadingTasks, setLoadingTasks] = useState(true);
  const [tasks, setTasks] = useState([]);
  
  const [logInput, setLogInput] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [completingTaskId, setCompletingTaskId] = useState(null);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [timeTaken, setTimeTaken] = useState(15);
  const [accuracy, setAccuracy] = useState(80);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      fetchDailyTasks();
    }
  }, [user]);

  const fetchDailyTasks = async () => {
    try {
      setLoadingTasks(true);
      const res = await api.get('/smart-revision/daily-tasks');
      setTasks(res.data.today_revision || []);
    } catch (err) {
      console.error('Failed to fetch daily tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const submitStudyLog = async () => {
    if (!logInput.trim()) return;
    try {
      setSubmittingLog(true);
      const res = await api.post('/smart-revision/study-log', { user_input: logInput });
      if (res.data.topics_recorded > 0) {
        showToast(`Successfully parsed and scheduled ${res.data.topics_recorded} topics for revision!`);
        setLogInput('');
        // Refresh tasks in case new things were added that need revising today
        fetchDailyTasks();
      } else {
         showToast(`No topics found in your input. Try being more specific.`);
      }
    } catch (err) {
      console.error('Failed to submit study log:', err);
      showToast('Error parsing study log. Please try again.');
    } finally {
      setSubmittingLog(false);
    }
  };

  const openCompleteModal = (taskId) => {
    setCompletingTaskId(taskId);
    setCompletionModalOpen(true);
  };

  const handleCompleteTask = async () => {
    if (!completingTaskId) return;
    try {
      setSubmittingLog(true);
      await api.post(`/smart-revision/tasks/${completingTaskId}/complete`, {
        time_taken_minutes: parseInt(timeTaken),
        accuracy_percentage: parseInt(accuracy)
      });
      showToast('Revision complete! Schedule adaptively updated.');
      setCompletionModalOpen(false);
      fetchDailyTasks();
    } catch (err) {
       console.error('Failed to complete task:', err);
       showToast('Error marking task as complete.');
    } finally {
      setSubmittingLog(false);
    }
  };

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]"><div className="w-10 h-10 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" /></div>;

  const firstName = user?.name?.split(' ')[0] || 'Student';

  return (
    <div className="min-h-screen bg-[#FAFAFB] font-sans flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[200px] bg-white border-r border-gray-100 min-h-screen py-6 px-4 fixed left-0 top-0 z-40">
        <div className="flex items-center gap-2 px-2 mb-10">
          <div className="w-3 h-3 rounded-full bg-[#5956DF]" />
          <span className="font-semibold tracking-tight text-[#1A1A1A] text-[15px]">PrepMind <strong className="font-extrabold text-[#5956DF]">AI</strong></span>
        </div>
        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button key={item.label} onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all ${item.active ? 'bg-[#5956DF]/10 text-[#5956DF] font-bold' : 'text-[#6B7280] hover:bg-gray-50 font-medium'}`}>
              <item.icon size={18} weight={item.active ? 'fill' : 'regular'} /> {item.label}
            </button>
          ))}
        </nav>

        {/* Level + User */}
        <div className="mt-auto pt-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5956DF] to-[#7C79F2] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {firstName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0"><p className="text-[12px] font-bold text-[#1A1A1A] truncate">{user?.name}</p><p className="text-[10px] text-[#9CA3AF]">Scholar Tier</p></div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-[200px] pb-10">
        {/* Top bar */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30">
          <div className="flex items-center justify-between px-6 lg:px-8 h-14">
            <div className="flex lg:hidden items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#5956DF]" /><span className="font-semibold text-[15px]">PrepMind <strong className="text-[#5956DF]">AI</strong></span></div>
            <div className="hidden lg:block w-auto">
               <span className="font-extrabold text-[#1A1A1A] text-[16px]">Smart Revision Hub</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                  <Lightning size={13} weight="fill" className="text-[#5956DF]" />
                  <span className="text-[12px] font-bold text-[#374151]">Spaced Repetition Active</span>
              </div>
              <div className="w-7 h-7 rounded-full bg-gray-200" />
              <button onClick={handleLogout} className="text-[12px] font-medium text-[#9CA3AF] hover:text-red-500 flex items-center gap-1"><SignOut size={14} /></button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="px-6 lg:px-8 mt-6">
           <div className="mb-8">
             <h1 className="text-[28px] font-extrabold text-[#1A1A1A] tracking-tight mb-2">Build Your Subconscious.</h1>
             <p className="text-[14px] text-[#6B7280]">Log what you study, and PrepMind will schedule the perfect day for you to review it, helping you retain 90% more information.</p>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
              {/* Daily Revision Tasks List */}
              <div className="order-2 lg:order-1">
                 <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm h-full">
                    <div className="flex justify-between items-center mb-6">
                       <h2 className="text-[18px] font-extrabold text-[#1A1A1A] flex items-center gap-2">
                           <CalendarCheck size={22} className="text-[#5956DF]"/> Today&apos;s Revisions
                        </h2>
                    </div>

                    {loadingTasks ? (
                        <div className="h-40 flex items-center justify-center">
                           <div className="w-8 h-8 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" />
                        </div>
                    ) : tasks.length > 0 ? (
                        <div className="space-y-4">
                           {tasks.map(task => {
                               const isHighPriority = task.priority === 'high';
                               const isLowPriority = task.priority === 'low';
                               return (
                                   <div key={task.task_id} className={`p-4 rounded-2xl border ${isHighPriority ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100 bg-gray-50/50'} flex justify-between items-center transition-all hover:shadow-md`}>
                                       <div>
                                           <div className="flex items-center gap-2 mb-1">
                                               <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isHighPriority ? 'bg-amber-100 text-amber-700' : isLowPriority ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                   {task.priority || 'Medium'} Priority
                                               </span>
                                           </div>
                                           <h3 className="font-extrabold text-[#1A1A1A] text-[15px]">{task.topic}</h3>
                                           <p className="text-[12px] text-[#6B7280] font-medium">{task.subject}</p>
                                       </div>
                                       <button 
                                          onClick={() => openCompleteModal(task.task_id)}
                                          className="w-10 h-10 shrink-0 bg-white border border-gray-200 rounded-full flex items-center justify-center text-emerald-500 hover:bg-emerald-50 hover:border-emerald-200 transition-colors shadow-sm">
                                           <CheckCircle size={22} weight="fill"/>
                                       </button>
                                   </div>
                               )
                           })}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                           <div className="w-12 h-12 bg-white rounded-full mx-auto flex items-center justify-center mb-3 shadow-sm border border-gray-100">
                               <CheckCircle size={24} className="text-emerald-500" weight="fill" />
                           </div>
                           <h3 className="font-extrabold text-[16px] text-[#1A1A1A] mb-1">You&apos;re all caught up!</h3>
                           <p className="text-[13px] text-[#6B7280]">No revisions scheduled for today. Log your new study sessions below.</p>
                        </div>
                    )}
                 </div>
              </div>

              {/* Study Log Input (The Brain) */}
              <div className="order-1 lg:order-2">
                 <div className="bg-gradient-to-br from-[#1E1B4B] to-[#312E81] rounded-3xl p-6 shadow-xl relative overflow-hidden h-full flex flex-col justify-between min-h-[400px]">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#5956DF] rounded-full mix-blend-screen filter blur-[80px] opacity-40 translate-x-1/3 -translate-y-1/3" />
                    
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md mb-6 border border-white/10">
                            <Brain size={26} className="text-white" weight="fill" />
                        </div>
                        <h2 className="text-[24px] font-extrabold text-white mb-2 leading-tight">What did you study today?</h2>
                        <p className="text-[14px] text-indigo-200/80 mb-6">Describe it naturally. The AI will parse topics and construct your optimum spaced-repetition plan automatically.</p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <textarea 
                           value={logInput}
                           onChange={(e) => setLogInput(e.target.value)}
                           disabled={submittingLog}
                           placeholder="E.g., I studied organic chemistry reaction mechanisms and some vector calculus..."
                           className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-[14px] text-white placeholder-indigo-200/50 resize-none h-32 focus:outline-none focus:ring-2 focus:ring-[#5956DF] transition-shadow disabled:opacity-50"
                        />
                        <button 
                           onClick={submitStudyLog}
                           disabled={submittingLog || logInput.trim() === ''}
                           className="absolute bottom-4 right-4 bg-[#5956DF] hover:bg-[#4F46E5] text-white p-2.5 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-[#5956DF] flex items-center shadow-lg">
                           {submittingLog ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PaperPlaneRight size={20} weight="fill" />}
                        </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Task Completion Modal */}
      {completionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-[18px] font-extrabold text-[#1A1A1A] mb-1">Log Revision</h3>
              <p className="text-[13px] text-[#6B7280] mb-6">How did this revision session go?</p>

              <div className="space-y-4">
                  <div>
                      <label className="flex justify-between items-center text-[12px] font-bold text-[#374151] mb-2 uppercase tracking-wide">
                          Time Spent <span className="text-[#5956DF] font-extrabold">{timeTaken} mins</span>
                      </label>
                      <input type="range" min="5" max="120" step="5" value={timeTaken} onChange={(e) => setTimeTaken(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#5956DF]"/>
                  </div>
                  
                  <div>
                      <label className="flex justify-between items-center text-[12px] font-bold text-[#374151] mb-2 uppercase tracking-wide">
                          Confidence / Accuracy <span className="text-[#10B981] font-extrabold">{accuracy}%</span>
                      </label>
                      <input type="range" min="0" max="100" step="5" value={accuracy} onChange={(e) => setAccuracy(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#10B981]"/>
                  </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 flex gap-3 border-t border-gray-100">
              <button onClick={() => setCompletionModalOpen(false)} className="flex-1 py-2.5 rounded-xl font-bold text-[14px] text-[#6B7280] hover:bg-gray-200/50 transition-colors">Cancel</button>
              <button disabled={submittingLog} onClick={handleCompleteTask} className="flex-1 py-2.5 rounded-xl font-bold text-[14px] text-white bg-[#10B981] hover:bg-[#059669] transition-colors disabled:opacity-50">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
           <CheckCircle size={20} className="text-[#10B981]" weight="fill" />
           <p className="text-[14px] font-bold">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}
