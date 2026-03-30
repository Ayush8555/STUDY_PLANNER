'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import api from '@/services/api';
import {
  SignOut, Fire, Sparkle, Trophy,
  CheckCircle, Circle, Clock, Target, Warning,
  CalendarPlus, ListChecks, Plus, Trash, CheckSquareOffset, MoonStars, SunDim, Books
} from '@phosphor-icons/react';
import ChatbotWrapper from '@/components/ChatbotWrapper';
import toast from 'react-hot-toast';
import { getNavItems } from '@/lib/navItems';

const NAV_ITEMS = getNavItems('/schedule');

export default function SchedulePage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('morning'); // 'morning' or 'night'
  const [tasks, setTasks] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Morning Form State
  const [newTask, setNewTask] = useState({
    subject: '',
    topic: '',
    hours: '',
    minutes: '',
    priority: 'medium',
  });
  const [addingTask, setAddingTask] = useState(false);

  // Night Form State
  const [nightSummary, setNightSummary] = useState({
    total_hours: '',
    subjects: '',
    topics: '',
    completed_tasks: '',
  });

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const fetchScheduleData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [tasksRes, insightsRes] = await Promise.all([
        api.get('/schedule/tasks'),
        api.get('/schedule/insights'),
      ]);
      setTasks(tasksRes.data.tasks || []);
      setInsights(insightsRes.data.insights || []);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchScheduleData();
  }, [user, fetchScheduleData]);

  const handleLogout = () => { logout(); router.push('/login'); };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (addingTask) return;
    if (!newTask.subject || !newTask.topic || (!newTask.hours && !newTask.minutes)) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setAddingTask(true);
    
    // Generate optimistic ID
    const tempId = 'temp-' + Date.now();
    const estMinutes = (parseInt(newTask.hours) || 0) * 60 + (parseInt(newTask.minutes) || 0);

    const optimisticTask = {
      id: tempId,
      subject: newTask.subject,
      topic: newTask.topic,
      estimated_minutes: estMinutes,
      priority: newTask.priority,
      is_completed: false,
      created_at: new Date().toISOString()
    };

    // Optimistically update UI
    setTasks(prev => [...prev, optimisticTask]);
    
    // Clear form immediately
    const previousTaskState = { ...newTask };
    setNewTask({ subject: '', topic: '', hours: '', minutes: '', priority: 'medium' });

    try {
      const res = await api.post('/schedule/tasks', { ...previousTaskState });
      // Replace temp task with real task from DB
      setTasks(prev => prev.map(t => t.id === tempId ? res.data.task : t));
      toast.success('Task added successfully ✅');
    } catch (err) {
      // Revert optimistic update
      setTasks(prev => prev.filter(t => t.id !== tempId));
      
      // Check for Conflict
      if (err.response?.status === 409 || err.status === 409) {
        toast.error('Task already exists for today');
      } else {
        toast.error('Failed to add task. Try again.');
        // Restore input state if we failed
        setNewTask(previousTaskState);
      }
    } finally {
      // 500ms debounce safety net
      setTimeout(() => setAddingTask(false), 500);
    }
  };

  const formatTime = (minutes) => {
    if (!minutes) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      // Update locally immediately for snapping feel
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: newStatus } : t));
      
      await api.put(`/schedule/tasks/${taskId}/toggle`, { is_completed: newStatus });
    } catch (err) {
      // Revert if failed
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: currentStatus } : t));
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      await api.delete(`/schedule/tasks/${taskId}`);
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Failed to delete task');
      fetchScheduleData();
    }
  };

  const handleSubmitNightSummary = async (e) => {
    e.preventDefault();
    if (!nightSummary.total_hours) {
      toast.error('Please estimate total study time');
      return;
    }
    
    try {
      const payload = {
        total_hours: parseFloat(nightSummary.total_hours),
        subjects: nightSummary.subjects ? nightSummary.subjects.split(',').map(s => s.trim()) : [],
        topics: nightSummary.topics ? nightSummary.topics.split(',').map(t => t.trim()) : [],
        completed_tasks: parseInt(nightSummary.completed_tasks) || tasks.filter(t => t.is_completed).length,
      };

      await api.post('/schedule/summary', payload);
      toast.success('Night Tracker submitted! Progress Synced 🔥');
      
      // Reset and refetch insights
      setNightSummary({ total_hours: '', subjects: '', topics: '', completed_tasks: '' });
      fetchScheduleData();
    } catch (err) {
      toast.error('Failed to submit summary');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]">
        <div className="w-10 h-10 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" />
      </div>
    );
  }

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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all ${
                item.active
                  ? 'bg-[#5956DF]/10 text-[#5956DF] font-bold'
                  : 'text-[#6B7280] hover:bg-gray-50 font-medium'
              }`}>
              <item.icon size={18} weight={item.active ? 'fill' : 'regular'} /> {item.label}
            </button>
          ))}
        </nav>
        {/* User Info */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5956DF] to-[#7C79F2] flex items-center justify-center text-white font-bold text-xs shadow-sm">{firstName.charAt(0).toUpperCase()}</div>
            <div className="min-w-0"><p className="text-[12px] font-bold text-[#1A1A1A] truncate">{user?.name}</p><p className="text-[10px] text-[#9CA3AF]">Scholar Tier</p></div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-[200px]">
        {/* Header */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30">
          <div className="flex items-center justify-between px-6 lg:px-8 h-14">
            <div className="flex lg:hidden items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#5956DF]" /><span className="font-semibold text-[15px]">PrepMind <strong className="text-[#5956DF]">AI</strong></span></div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gray-200" />
              <button onClick={handleLogout} className="text-[12px] font-medium text-[#9CA3AF] hover:text-red-500"><SignOut size={14} /></button>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-8 max-w-[1200px] mx-auto">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">Schedule & Tracker 📅</h1>
              <p className="text-[14px] text-[#6B7280]">Plan your morning priorities, conquer the day, and track your night progress.</p>
            </div>
          </div>

          {/* Auto Insights Area */}
          {!loadingData && insights.length > 0 && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {insights.map((insight, idx) => (
                <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#5956DF]/10 flex items-center justify-center shrink-0">
                    {insight.includes('🔥') ? <Fire size={16} weight="fill" className="text-[#F59E0B]" /> : 
                     insight.includes('🎯') ? <Target size={16} weight="fill" className="text-emerald-500" /> :
                     <Sparkle size={16} weight="fill" className="text-[#5956DF]" />}
                  </div>
                  <p className="text-[13px] font-semibold text-[#1A1A1A] leading-snug pt-0.5">{insight}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 w-fit mb-6">
            <button onClick={() => setActiveTab('morning')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                activeTab === 'morning' ? 'bg-[#5956DF] text-white shadow-sm' : 'text-[#6B7280] hover:bg-gray-50'
              }`}>
              <SunDim size={18} weight={activeTab === 'morning' ? 'fill' : 'regular'} /> Plan Your Day
            </button>
            <button onClick={() => setActiveTab('night')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                activeTab === 'night' ? 'bg-[#5956DF] text-white shadow-sm' : 'text-[#6B7280] hover:bg-gray-50'
              }`}>
              <MoonStars size={18} weight={activeTab === 'night' ? 'fill' : 'regular'} /> Night Tracker
            </button>
          </div>

          <div className="animate-[fadeIn_0.3s_ease-out]">
            {loadingData ? (
              <div className="flex justify-center p-20"><div className="w-8 h-8 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" /></div>
            ) : activeTab === 'morning' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column - Add Task Form */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-[80px]">
                    <div className="flex items-center gap-2 mb-6">
                      <CalendarPlus size={20} className="text-[#5956DF]" weight="fill" />
                      <h2 className="text-[16px] font-extrabold text-[#1A1A1A]">Add New Task</h2>
                    </div>
                    
                    <form onSubmit={handleAddTask} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1">Subject</label>
                        <input
                          type="text"
                          required
                          value={newTask.subject}
                          onChange={e => setNewTask({...newTask, subject: e.target.value})}
                          placeholder="e.g. Physics"
                          className="w-full bg-gray-50 border border-gray-200 text-[#1A1A1A] text-[13px] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5956DF]/20 focus:border-[#5956DF] transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1">Topic / Chapter</label>
                        <input
                          type="text"
                          required
                          value={newTask.topic}
                          onChange={e => setNewTask({...newTask, topic: e.target.value})}
                          placeholder="e.g. Laws of Motion"
                          className="w-full bg-gray-50 border border-gray-200 text-[#1A1A1A] text-[13px] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5956DF]/20 focus:border-[#5956DF] transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1">Hrs</label>
                            <input
                              type="number"
                              min="0"
                              value={newTask.hours}
                              onChange={e => setNewTask({...newTask, hours: e.target.value})}
                              placeholder="1"
                              className="w-full bg-gray-50 border border-gray-200 text-[#1A1A1A] text-[13px] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5956DF]/20 focus:border-[#5956DF] transition-all"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1">Mins</label>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={newTask.minutes}
                              onChange={e => setNewTask({...newTask, minutes: e.target.value})}
                              placeholder="30"
                              className="w-full bg-gray-50 border border-gray-200 text-[#1A1A1A] text-[13px] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5956DF]/20 focus:border-[#5956DF] transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1">Priority</label>
                          <select
                            value={newTask.priority}
                            onChange={e => setNewTask({...newTask, priority: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 text-[#1A1A1A] text-[13px] font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5956DF]/20 focus:border-[#5956DF] transition-all"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                      </div>
                      
                      <button type="submit" disabled={addingTask} className="w-full mt-2 bg-gradient-to-r from-[#5956DF] to-[#7C3AED] hover:from-[#4B49C8] hover:to-[#6D28D9] text-white px-4 py-3 rounded-xl text-[13px] font-bold transition-all hover:shadow-lg hover:shadow-[#5956DF]/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                        {addingTask ? (
                          <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Adding...</>
                        ) : (
                          <><Plus size={16} weight="bold" /> Add Task to Planner</>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Column - Task List */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <ListChecks size={20} className="text-[#5956DF]" weight="fill" />
                        <h2 className="text-[16px] font-extrabold text-[#1A1A1A]">Today&apos;s Study List</h2>
                      </div>
                      <span className="text-[12px] font-bold px-3 py-1 bg-gray-100 text-[#6B7280] rounded-lg">
                        {tasks.filter(t => t.is_completed).length} / {tasks.length} Completed
                      </span>
                    </div>

                    {tasks.length === 0 ? (
                      <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center">
                        <SunDim size={48} weight="fill" className="text-gray-200 mb-3" />
                        <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-1">Your morning is a blank canvas.</h3>
                        <p className="text-[13px] text-[#9CA3AF] max-w-sm">Add subjects and topics to your daily planner on the left to start building your study habit.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tasks.map(task => {
                          const pColors = {
                            high: 'bg-red-50 text-red-600 border-red-100',
                            medium: 'bg-amber-50 text-amber-600 border-amber-100',
                            low: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                          };
                          return (
                            <div key={task.id} className={`group flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                              task.is_completed ? 'bg-gray-50/50 border-gray-200/50' : 'bg-white border-gray-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:border-[#5956DF]/30'
                            }`}>
                              <button onClick={() => handleToggleTask(task.id, task.is_completed)} className="shrink-0 transition-transform active:scale-90">
                                {task.is_completed ? (
                                  <CheckCircle size={26} weight="fill" className="text-emerald-500" />
                                ) : (
                                  <Circle size={26} weight="regular" className="text-gray-300 hover:text-[#5956DF]" />
                                )}
                              </button>
                              
                              <div className="flex-1 min-w-0">
                                <p className={`text-[14px] font-extrabold truncate transition-all duration-300 ${task.is_completed ? 'text-[#9CA3AF] line-through' : 'text-[#1A1A1A]'}`}>
                                  {task.subject} <span className="text-[#6B7280] font-medium ml-1">— {task.topic}</span>
                                </p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#6B7280]">
                                    <Clock size={12} /> {formatTime(task.estimated_minutes)}
                                  </span>
                                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${pColors[task.priority] || pColors.medium}`}>
                                    {task.priority}
                                  </span>
                                </div>
                              </div>
                              
                              <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                <Trash size={16} weight="bold" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ─── NIGHT TRACKER ─── */
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#5956DF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MoonStars size={32} weight="fill" className="text-[#5956DF]" />
                    </div>
                    <h2 className="text-[22px] font-extrabold text-[#1A1A1A] mb-2">What did you study today?</h2>
                    <p className="text-[14px] text-[#6B7280]">Log your actual progress. Consistency &gt; Intensity.</p>
                  </div>

                  <form onSubmit={handleSubmitNightSummary} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[12px] font-bold text-[#374151] mb-1.5 flex items-center gap-1.5">
                          <Clock size={14} className="text-[#5956DF]" /> Total Study Hours
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={nightSummary.total_hours}
                          onChange={e => setNightSummary({...nightSummary, total_hours: e.target.value})}
                          placeholder="e.g. 4.5"
                          className="w-full bg-gray-50 border border-gray-200 text-[#1A1A1A] text-[14px] font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#5956DF]/50 focus:border-[#5956DF] focus:bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-[#374151] mb-1.5 flex items-center gap-1.5">
                          <CheckSquareOffset size={14} className="text-[#5956DF]" /> Completed Tasks
                        </label>
                        <input
                          type="number"
                          value={nightSummary.completed_tasks}
                          onChange={e => setNightSummary({...nightSummary, completed_tasks: e.target.value})}
                          placeholder={tasks.filter(t => t.is_completed).length.toString() || "0"}
                          className="w-full bg-gray-50 border border-gray-200 text-[#1A1A1A] text-[14px] font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#5956DF]/50 focus:border-[#5956DF] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#374151] mb-1.5 flex items-center gap-1.5">
                        <Books size={14} className="text-[#5956DF]" /> Subjects Studied (comma separated)
                      </label>
                      <input
                        type="text"
                        value={nightSummary.subjects}
                        onChange={e => setNightSummary({...nightSummary, subjects: e.target.value})}
                        placeholder="Physics, Chemistry"
                        className="w-full bg-gray-50 border border-gray-200 text-[#1A1A1A] text-[14px] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#5956DF]/50 focus:border-[#5956DF] focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#374151] mb-1.5 flex items-center gap-1.5">
                        <Target size={14} className="text-[#5956DF]" /> Topics Covered (comma separated)
                      </label>
                      <input
                        type="text"
                        value={nightSummary.topics}
                        onChange={e => setNightSummary({...nightSummary, topics: e.target.value})}
                        placeholder="Thermodynamics, Vectors"
                        className="w-full bg-gray-50 border border-gray-200 text-[#1A1A1A] text-[14px] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#5956DF]/50 focus:border-[#5956DF] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-50">
                      <button type="submit" className="w-full bg-gradient-to-r from-[#1A1A1A] to-[#374151] hover:from-black hover:to-[#1A1A1A] text-white px-6 py-4 rounded-xl text-[15px] font-extrabold transition-all hover:shadow-lg hover:shadow-black/20 flex items-center justify-center gap-2 group">
                        <CheckCircle size={20} weight="fill" className="text-emerald-400 group-hover:scale-110 transition-transform" /> Confirm & Post Night Summary
                      </button>
                      <p className="text-center text-[11px] text-[#9CA3AF] font-medium mt-3">This syncs with your global Progress Dashboard and study streak.</p>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ChatbotWrapper />
    </div>
  );
}
