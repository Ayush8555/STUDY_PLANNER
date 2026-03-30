'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import api from '@/services/api';
import {
  SignOut, Lightning, Fire, Sparkle, Trophy,
  CheckCircle, Circle, Clock, Target, Warning,
  CaretDown, CaretRight, ArrowClockwise, BookOpen,
  CalendarBlank, MagicWand, ChartLineUp, Brain, Exam, Books
} from '@phosphor-icons/react';
import ChatbotWrapper from '@/components/ChatbotWrapper';
import { getNavItems } from '@/lib/navItems';

const NAV_ITEMS = getNavItems('/progress');

// ── Circular Progress Ring ────────────────
function CircularProgress({ percentage, size = 160, strokeWidth = 12 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="currentColor" strokeWidth={strokeWidth}
          className="text-gray-100" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="url(#progressGrad)" strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
        <defs>
          <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5956DF" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[36px] font-extrabold text-[#1A1A1A] tracking-tight">{percentage}%</span>
        <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Complete</span>
      </div>
    </div>
  );
}

// ── Subject Progress Bar ────────────────
function SubjectProgressBar({ subject, percentage, completedChapters, totalChapters, color }) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-bold text-[#1A1A1A]">{subject}</span>
        <span className="text-[11px] font-semibold text-[#9CA3AF]">{completedChapters}/{totalChapters} chapters</span>
      </div>
      <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.max(percentage, 2)}%`, background: color }}
        />
      </div>
      <div className="flex justify-end mt-1">
        <span className="text-[11px] font-bold" style={{ color }}>{percentage}%</span>
      </div>
    </div>
  );
}

// ── Daily Study Bar Chart ────────────────
function DailyStudyChart({ data }) {
  const maxMinutes = Math.max(...data.map(d => d.minutes), 1);
  return (
    <div className="flex items-end gap-2 h-[140px]">
      {data.map((day, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <span className="text-[9px] font-bold text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity">
            {day.minutes > 0 ? `${day.minutes}m` : ''}
          </span>
          <div className="w-full relative">
            <div
              className="w-full rounded-t-lg transition-all duration-700 ease-out hover:opacity-80"
              style={{
                height: `${Math.max((day.minutes / maxMinutes) * 110, 4)}px`,
                background: day.minutes > 0
                  ? 'linear-gradient(180deg, #5956DF 0%, #7C3AED 100%)'
                  : '#F3F4F6',
                opacity: day.minutes > 0 ? 1 : 0.4,
              }}
            />
          </div>
          <span className={`text-[10px] font-semibold ${day.minutes > 0 ? 'text-[#374151]' : 'text-[#D1D5DB]'}`}>
            {day.dayName}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Chapter List Item ────────────────
function ChapterItem({ chapter, onToggle, isToggling }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
      chapter.isCompleted
        ? 'bg-emerald-50 border border-emerald-100'
        : 'bg-white border border-gray-100 hover:border-gray-200'
    }`}>
      <button
        onClick={() => onToggle(chapter)}
        disabled={isToggling}
        className="shrink-0 transition-transform duration-200 hover:scale-110 disabled:opacity-50"
      >
        {chapter.isCompleted ? (
          <CheckCircle size={22} weight="fill" className="text-emerald-500" />
        ) : (
          <Circle size={22} weight="regular" className="text-gray-300 hover:text-[#5956DF]" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold truncate ${chapter.isCompleted ? 'text-emerald-700 line-through decoration-emerald-300' : 'text-[#1A1A1A]'}`}>
          {chapter.chapterName}
        </p>
        {chapter.timeSpentMinutes > 0 && (
          <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1 mt-0.5">
            <Clock size={10} /> {chapter.timeSpentMinutes} min spent
          </p>
        )}
      </div>
      {chapter.isCompleted && chapter.completionDate && (
        <span className="text-[10px] font-medium text-emerald-500 shrink-0">
          ✔ {new Date(chapter.completionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  );
}

export default function ProgressPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [togglingChapter, setTogglingChapter] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [revisionPlan, setRevisionPlan] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await api.get('/progress/overview');
      setData(res.data.progress);
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchProgress();
  }, [user, fetchProgress]);

  const handleToggleChapter = async (chapter) => {
    setTogglingChapter(chapter.id || chapter.chapterName);
    try {
      if (chapter.isCompleted) {
        await api.post('/progress/uncomplete-chapter', {
          subject: chapter.subject,
          chapter_name: chapter.chapterName,
        });
      } else {
        await api.post('/progress/complete-chapter', {
          subject: chapter.subject,
          class: chapter.class || 0,
          chapter_name: chapter.chapterName,
          time_spent_minutes: 0,
        });
      }
      await fetchProgress();
    } catch (err) {
      console.error('Failed to toggle chapter:', err);
    } finally {
      setTogglingChapter(null);
    }
  };

  const toggleSubject = (subject) => {
    setExpandedSubjects(prev => ({ ...prev, [subject]: !prev[subject] }));
  };

  const handleGenerateRevisionPlan = async () => {
    setGeneratingPlan(true);
    setPlanError(null);
    try {
      const res = await api.post('/progress/generate-revision-plan');
      setRevisionPlan(res.data.revisionPlan);
      await fetchProgress(); // refresh XP
    } catch (err) {
      console.error('Failed to generate revision plan:', err);
      setPlanError('Failed to generate revision plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]">
        <div className="w-10 h-10 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = () => { logout(); router.push('/login'); };
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const overall = data?.overall || {};
  const subjects = data?.subjects || [];
  const chapters = data?.chapters || [];
  const dailyStudy = data?.dailyStudy || [];
  const weakTopics = data?.weakTopics || [];
  const streak = data?.streak || {};
  const suggestions = data?.suggestions || [];

  const subjectColors = [
    '#5956DF', '#10B981', '#F59E0B', '#EF4444', '#EC4899',
    '#8B5CF6', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
  ];

  // Group chapters by subject
  const chaptersBySubject = {};
  chapters.forEach(ch => {
    if (!chaptersBySubject[ch.subject]) chaptersBySubject[ch.subject] = [];
    chaptersBySubject[ch.subject].push(ch);
  });

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

        {/* Level + User */}
        <div className="mt-auto pt-4 border-t border-gray-100 space-y-3">
          <div className="px-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#9CA3AF] mb-1">
              <span>LEVEL {Math.floor((streak.xp || 0) / 1000) + 1}</span>
              <span>{(streak.xp || 0) % 1000} / 1000 XP</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#5956DF] rounded-full transition-all duration-1000" style={{ width: `${((streak.xp || 0) % 1000) / 10}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5956DF] to-[#7C79F2] flex items-center justify-center text-white font-bold text-xs shadow-sm">{firstName.charAt(0).toUpperCase()}</div>
            <div className="min-w-0"><p className="text-[12px] font-bold text-[#1A1A1A] truncate">{user?.name}</p><p className="text-[10px] text-[#9CA3AF]">Scholar Tier</p></div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-[200px]">
        {/* Top bar */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30">
          <div className="flex items-center justify-between px-6 lg:px-8 h-14">
            <div className="flex lg:hidden items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#5956DF]" /><span className="font-semibold text-[15px]">PrepMind <strong className="text-[#5956DF]">AI</strong></span></div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                  <Fire size={13} weight="fill" className="text-[#F59E0B]" />
                  <span className="text-[12px] font-bold text-[#374151]">{streak.current || 0} Day Streak</span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                  <Lightning size={13} weight="fill" className="text-[#5956DF]" />
                  <span className="text-[12px] font-bold text-[#374151]">{(streak.xp || 0).toLocaleString()} XP</span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-gray-200" />
              <button onClick={handleLogout} className="text-[12px] font-medium text-[#9CA3AF] hover:text-red-500 flex items-center gap-1"><SignOut size={14} /></button>
            </div>
          </div>
        </header>

        <div className="px-6 lg:px-8 py-6 w-full max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight mb-0.5">Progress Dashboard 📊</h1>
            <p className="text-[14px] text-[#6B7280]">Track your learning journey and stay on top of your goals</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-100 p-1 w-fit">
            {[
              { key: 'overview', label: 'Overview', icon: ChartLineUp },
              { key: 'chapters', label: 'Chapters', icon: BookOpen },
              { key: 'insights', label: 'Insights', icon: Target },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#5956DF] text-white shadow-sm'
                    : 'text-[#6B7280] hover:bg-gray-50'
                }`}>
                <tab.icon size={16} weight={activeTab === tab.key ? 'fill' : 'regular'} /> {tab.label}
              </button>
            ))}
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ─── OVERVIEW TAB ─── */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Overall + Streak Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Overall Progress */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center">
                        <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-4">Overall Progress</h3>
                        <CircularProgress percentage={overall.percentage || 0} />
                        <div className="flex gap-6 mt-4">
                          <div className="text-center">
                            <p className="text-[18px] font-extrabold text-[#1A1A1A]">{overall.completedChapters || 0}</p>
                            <p className="text-[10px] font-medium text-[#9CA3AF]">Completed</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[18px] font-extrabold text-[#1A1A1A]">{overall.totalChapters || 0}</p>
                            <p className="text-[10px] font-medium text-[#9CA3AF]">Total</p>
                          </div>
                        </div>
                      </div>

                      {/* Streak & Stats */}
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-[#F59E0B] to-[#F97316] rounded-2xl p-5 text-white">
                          <div className="flex items-center gap-2 mb-3">
                            <Fire size={20} weight="fill" />
                            <span className="text-[13px] font-bold opacity-80">Study Streak</span>
                          </div>
                          <p className="text-[36px] font-extrabold leading-none">{streak.current || 0}</p>
                          <p className="text-[12px] opacity-70 mt-1">days in a row</p>
                          <div className="mt-3 flex items-center gap-2 text-[11px] opacity-70">
                            <Trophy size={14} weight="fill" />
                            <span>Best: {streak.longest || 0} days</span>
                          </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} className="text-[#5956DF]" />
                            <span className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-wider">Total Study Time</span>
                          </div>
                          <p className="text-[28px] font-extrabold text-[#1A1A1A]">{overall.totalStudyHours || 0}<span className="text-[14px] font-semibold text-[#9CA3AF] ml-1">hrs</span></p>
                          <p className="text-[11px] text-[#9CA3AF] mt-0.5">{overall.totalStudyMinutes || 0} minutes total</p>
                        </div>
                      </div>
                    </div>

                    {/* Subject Progress */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h2 className="text-[16px] font-extrabold text-[#1A1A1A] mb-4">Subject Progress</h2>
                      {subjects.length > 0 ? (
                        <div className="space-y-4">
                          {subjects.map((sub, idx) => (
                            <SubjectProgressBar
                              key={sub.subject}
                              subject={sub.subject}
                              percentage={sub.percentage}
                              completedChapters={sub.completedChapters}
                              totalChapters={sub.totalChapters}
                              color={subjectColors[idx % subjectColors.length]}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-[13px] text-[#9CA3AF] border border-dashed border-gray-200 rounded-xl">
                          <BookOpen size={32} className="mx-auto mb-2 text-gray-300" />
                          No subjects tracked yet. Mark chapters as complete to see progress!
                        </div>
                      )}
                    </div>

                    {/* Daily Study Tracker */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h2 className="text-[16px] font-extrabold text-[#1A1A1A] mb-4">Daily Study Time (Last 7 Days)</h2>
                      {dailyStudy.length > 0 ? (
                        <DailyStudyChart data={dailyStudy} />
                      ) : (
                        <div className="h-[140px] flex items-center justify-center text-[13px] text-[#9CA3AF]">
                          Start studying to see your daily activity!
                        </div>
                      )}
                    </div>

                    {/* ─── AI Revision Plan Section ─── */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[16px] font-extrabold text-[#1A1A1A] flex items-center gap-2">
                          <MagicWand size={20} weight="fill" className="text-[#7C3AED]" />
                          AI Revision Plan
                        </h2>
                        <button
                          onClick={handleGenerateRevisionPlan}
                          disabled={generatingPlan}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${
                            generatingPlan
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-[#5956DF] to-[#7C3AED] text-white hover:shadow-lg hover:shadow-purple-200 hover:scale-[1.02] active:scale-[0.98]'
                          }`}
                        >
                          {generatingPlan ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkle size={14} weight="fill" />
                              {revisionPlan ? 'Regenerate Plan' : 'Generate Plan'}
                            </>
                          )}
                        </button>
                      </div>

                      {planError && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-[12px] text-red-600 font-medium mb-3">
                          {planError}
                        </div>
                      )}

                      {revisionPlan ? (
                        <div className="space-y-4">
                          {/* Motivation Message */}
                          {revisionPlan.motivation_message && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100">
                              <p className="text-[13px] font-semibold text-[#374151] leading-relaxed">
                                💪 {revisionPlan.motivation_message}
                              </p>
                              {revisionPlan.daily_study_recommendation_minutes && (
                                <p className="text-[11px] font-medium text-[#5956DF] mt-2">
                                  📅 Recommended daily study: {revisionPlan.daily_study_recommendation_minutes} minutes
                                </p>
                              )}
                            </div>
                          )}

                          {/* Focus Areas */}
                          {revisionPlan.focus_areas?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {revisionPlan.focus_areas.map((area, idx) => (
                                <span key={idx} className="px-3 py-1.5 rounded-lg bg-[#5956DF]/10 text-[10px] font-bold text-[#5956DF]">
                                  🎯 {area}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Revision Items */}
                          <div className="space-y-2.5">
                            {revisionPlan.revision_plan?.map((item, idx) => {
                              const priorityStyles = {
                                high: 'bg-red-50 border-red-200 text-red-700',
                                medium: 'bg-amber-50 border-amber-200 text-amber-700',
                                low: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                              };
                              const typeIcons = {
                                concept_review: '📖',
                                practice_problems: '✏️',
                                flashcards: '🃏',
                                mock_test: '📝',
                                full_chapter_reread: '📚',
                              };
                              return (
                                <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-shadow">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[14px]">{typeIcons[item.revision_type] || '📖'}</span>
                                        <h4 className="text-[13px] font-bold text-[#1A1A1A] truncate">{item.topic}</h4>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${priorityStyles[item.priority] || priorityStyles.medium}`}>
                                          {item.priority?.toUpperCase()}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-[#6B7280]">
                                        {item.subject}{item.chapter ? ` • ${item.chapter}` : ''}
                                      </p>
                                      <p className="text-[10px] text-[#9CA3AF] mt-1 leading-snug">{item.reason}</p>
                                    </div>
                                    {item.estimated_time_minutes && (
                                      <div className="shrink-0 text-right">
                                        <p className="text-[14px] font-extrabold text-[#5956DF]">{item.estimated_time_minutes}</p>
                                        <p className="text-[9px] font-medium text-[#9CA3AF]">mins</p>
                                      </div>
                                    )}
                                  </div>
                                  {item.revision_dates?.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-gray-50">
                                      <CalendarBlank size={12} className="text-[#9CA3AF]" />
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.revision_dates.map((date, dIdx) => (
                                          <span key={dIdx} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-50 text-[#374151] border border-gray-100">
                                            {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl">
                          <MagicWand size={36} className="mx-auto mb-2 text-gray-300" />
                          <p className="text-[13px] font-semibold text-[#374151] mb-1">Generate Your AI Revision Plan</p>
                          <p className="text-[11px] text-[#9CA3AF] max-w-sm mx-auto">
                            Our AI analyzes your completed chapters, weak topics, and study patterns to create a personalized spaced-repetition revision schedule.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-5">
                    {/* Smart Suggestions */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h3 className="text-[15px] font-extrabold text-[#1A1A1A] mb-3">
                        <Sparkle size={16} weight="fill" className="inline text-[#F59E0B] mr-1" />
                        Smart Suggestions
                      </h3>
                      {suggestions.length > 0 ? (
                        <div className="space-y-2.5">
                          {suggestions.map((s, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                              <span className="text-[16px] shrink-0 mt-0.5">{s.icon}</span>
                              <div>
                                <p className="text-[12px] font-semibold text-[#374151] leading-snug">{s.message}</p>
                                <span className="text-[10px] font-medium text-[#5956DF] capitalize">{s.type.replace('_', ' ')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-[12px] text-[#9CA3AF] border border-dashed border-gray-200 rounded-xl">
                          Complete more chapters to get personalized suggestions!
                        </div>
                      )}
                    </div>

                    {/* Weak Topics */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h3 className="text-[15px] font-extrabold text-[#1A1A1A] mb-3">
                        <Warning size={16} weight="fill" className="inline text-amber-500 mr-1" />
                        Weak Topics
                      </h3>
                      {weakTopics.length > 0 ? (
                        <div className="space-y-2.5">
                          {weakTopics.map((w, idx) => (
                            <div key={idx} className={`p-3 rounded-xl border ${
                              w.isWeak ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[12px] font-bold text-[#1A1A1A]">{w.topicName}</p>
                                <span className={`text-[11px] font-bold ${
                                  w.accuracy < 40 ? 'text-red-500' : w.accuracy < 60 ? 'text-amber-500' : 'text-emerald-500'
                                }`}>{w.accuracy}%</span>
                              </div>
                              <p className="text-[10px] text-[#9CA3AF]">{w.subject}</p>
                              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                                <div className={`h-full rounded-full transition-all duration-700 ${
                                  w.accuracy < 40 ? 'bg-red-500' : w.accuracy < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} style={{ width: `${w.accuracy}%` }} />
                              </div>
                              {w.isWeak && (
                                <button className="mt-2 text-[11px] font-bold text-[#5956DF] hover:underline flex items-center gap-1">
                                  <ArrowClockwise size={12} /> Revise Now
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-[12px] text-[#9CA3AF] border border-dashed border-gray-200 rounded-xl">
                          Take tests to identify your weak topics
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-gradient-to-br from-[#5956DF] to-[#7C3AED] rounded-2xl p-5 text-white">
                      <h3 className="text-[14px] font-bold mb-3">Quick Actions</h3>
                      <div className="space-y-2">
                        <button onClick={() => router.push('/practice')}
                          className="w-full py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-[12px] font-bold transition-colors flex items-center justify-center gap-2">
                          <Exam size={16} /> Take Practice Test
                        </button>
                        <button onClick={() => router.push('/smart-revision')}
                          className="w-full py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-[12px] font-bold transition-colors flex items-center justify-center gap-2">
                          <Brain size={16} /> Smart Revision
                        </button>
                        <button onClick={() => router.push('/custom-test')}
                          className="w-full py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-[12px] font-bold transition-colors flex items-center justify-center gap-2">
                          <Sparkle size={16} /> Create Custom Test
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── CHAPTERS TAB ─── */}
              {activeTab === 'chapters' && (
                <div className="space-y-4">
                  {Object.keys(chaptersBySubject).length > 0 ? (
                    Object.entries(chaptersBySubject).map(([subject, subjectChapters]) => {
                      const completed = subjectChapters.filter(c => c.isCompleted).length;
                      const isExpanded = expandedSubjects[subject] !== false;
                      return (
                        <div key={subject} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <button
                            onClick={() => toggleSubject(subject)}
                            className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? <CaretDown size={18} className="text-[#5956DF]" /> : <CaretRight size={18} className="text-[#9CA3AF]" />}
                              <div className="text-left">
                                <h3 className="text-[15px] font-extrabold text-[#1A1A1A]">{subject}</h3>
                                <p className="text-[11px] text-[#9CA3AF]">{completed}/{subjectChapters.length} chapters completed</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#5956DF] rounded-full transition-all duration-700" style={{ width: `${(completed / subjectChapters.length) * 100}%` }} />
                              </div>
                              <span className="text-[12px] font-bold text-[#5956DF]">{Math.round((completed / subjectChapters.length) * 100)}%</span>
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="px-5 pb-5 space-y-2 animate-[fadeIn_0.2s_ease-out]">
                              {subjectChapters.map((ch, idx) => (
                                <ChapterItem
                                  key={ch.id || idx}
                                  chapter={ch}
                                  onToggle={handleToggleChapter}
                                  isToggling={togglingChapter === (ch.id || ch.chapterName)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                      <BookOpen size={48} className="mx-auto mb-3 text-gray-300" />
                      <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-1">No Chapters Tracked Yet</h3>
                      <p className="text-[13px] text-[#9CA3AF] max-w-md mx-auto">
                        Start your learning journey by marking chapters as complete. Your progress will appear here!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── INSIGHTS TAB ─── */}
              {activeTab === 'insights' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Study Pattern */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-[16px] font-extrabold text-[#1A1A1A] mb-4">Study Pattern</h3>
                    <DailyStudyChart data={dailyStudy} />
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <p className="text-[18px] font-extrabold text-[#5956DF]">{dailyStudy.reduce((s, d) => s + d.minutes, 0)}</p>
                        <p className="text-[10px] font-medium text-[#9CA3AF]">Total mins this week</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <p className="text-[18px] font-extrabold text-[#10B981]">{Math.round(dailyStudy.reduce((s, d) => s + d.minutes, 0) / 7)}</p>
                        <p className="text-[10px] font-medium text-[#9CA3AF]">Avg mins/day</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <p className="text-[18px] font-extrabold text-[#F59E0B]">{dailyStudy.filter(d => d.minutes > 0).length}</p>
                        <p className="text-[10px] font-medium text-[#9CA3AF]">Active days</p>
                      </div>
                    </div>
                  </div>

                  {/* Completion Breakdown */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-[16px] font-extrabold text-[#1A1A1A] mb-4">Completion Breakdown</h3>
                    {subjects.length > 0 ? (
                      <div className="space-y-3">
                        {subjects.map((sub, idx) => {
                          const remaining = sub.totalChapters - sub.completedChapters;
                          return (
                            <div key={sub.subject} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${subjectColors[idx % subjectColors.length]}15` }}>
                                <BookOpen size={18} style={{ color: subjectColors[idx % subjectColors.length] }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{sub.subject}</p>
                                <p className="text-[10px] text-[#9CA3AF]">{remaining} chapters remaining</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[16px] font-extrabold" style={{ color: subjectColors[idx % subjectColors.length] }}>{sub.percentage}%</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-[13px] text-[#9CA3AF] border border-dashed border-gray-200 rounded-xl">
                        Track chapters to see completion breakdown
                      </div>
                    )}
                  </div>

                  {/* Weak Areas Detail */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
                    <h3 className="text-[16px] font-extrabold text-[#1A1A1A] mb-4">Weak Areas Analysis</h3>
                    {weakTopics.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="pb-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Topic</th>
                              <th className="pb-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Subject</th>
                              <th className="pb-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Accuracy</th>
                              <th className="pb-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Status</th>
                              <th className="pb-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weakTopics.map((w, idx) => (
                              <tr key={idx} className="border-b border-gray-50 last:border-0">
                                <td className="py-3 text-[13px] font-bold text-[#1A1A1A]">{w.topicName}</td>
                                <td className="py-3 text-[12px] text-[#6B7280]">{w.subject}</td>
                                <td className="py-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[12px] font-bold ${w.accuracy < 40 ? 'text-red-500' : w.accuracy < 60 ? 'text-amber-500' : 'text-emerald-500'}`}>{w.accuracy}%</span>
                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${w.accuracy < 40 ? 'bg-red-500' : w.accuracy < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${w.accuracy}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3">
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                                    w.isWeak ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                  }`}>{w.isWeak ? 'Needs Work' : 'Good'}</span>
                                </td>
                                <td className="py-3">
                                  <button className="text-[12px] font-bold text-[#5956DF] hover:underline">
                                    {w.isWeak ? 'Revise Basics' : 'Practice More'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-[13px] text-[#9CA3AF] border border-dashed border-gray-200 rounded-xl">
                        <Target size={32} className="mx-auto mb-2 text-gray-300" />
                        Take more tests to identify your weak areas
                      </div>
                    )}
                  </div>

                  {/* All Suggestions */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
                    <h3 className="text-[16px] font-extrabold text-[#1A1A1A] mb-4">
                      <Sparkle size={18} weight="fill" className="inline text-[#F59E0B] mr-1" />
                      AI-Powered Suggestions
                    </h3>
                    {suggestions.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {suggestions.map((s, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:shadow-sm transition-shadow">
                            <span className="text-[20px] shrink-0">{s.icon}</span>
                            <div>
                              <p className="text-[12px] font-semibold text-[#374151] leading-snug mb-1">{s.message}</p>
                              <span className="text-[10px] font-bold text-[#5956DF] uppercase tracking-wider">{s.type.replace('_', ' ')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-[13px] text-[#9CA3AF] border border-dashed border-gray-200 rounded-xl">
                        Keep studying and we&apos;ll provide personalized suggestions!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ChatbotWrapper />
    </div>
  );
}
