'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import {
  SignOut, Lightning, Trophy, Clock, Fire, Star, Target, Sparkle, PaperPlaneTilt
} from '@phosphor-icons/react';
import ChatbotWrapper from '@/components/ChatbotWrapper';
import { getNavItems } from '@/lib/navItems';

const NAV_ITEMS = getNavItems('/dashboard');

function BarChart({ data, labels }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-2 h-36">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-[#6B7280]">{val > 0 ? val : ''}</span>
          <div className="w-full rounded-t-md bg-[#5956DF] transition-all duration-500"
            style={{ height: `${Math.max((val / max) * 100, 4)}%`, opacity: val > 0 ? 1 : 0.15 }} />
          <span className="text-[10px] font-medium text-[#9CA3AF]">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data }) {
  if (data.length < 2) return <div className="h-36 flex items-center justify-center text-[13px] text-[#9CA3AF]">Take tests to see progress</div>;
  const max = Math.max(...data, 1); const min = Math.min(...data); const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 80 - 10}`).join(' ');
  return (
    <div className="relative">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-36 flex flex-col justify-between text-[9px] text-[#9CA3AF] font-medium pr-1">
        <span>{max}</span><span>{Math.round((max + min) / 2)}</span><span>{min}</span>
      </div>
      <div className="pl-6">
        <svg viewBox="0 0 100 100" className="w-full h-36" preserveAspectRatio="none">
          <defs><linearGradient id="lg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#10B981" stopOpacity="0.15" /><stop offset="100%" stopColor="#10B981" stopOpacity="0" /></linearGradient></defs>
          <polygon points={`0,100 ${pts} 100,100`} fill="url(#lg)" />
          <polyline points={pts} fill="none" stroke="#10B981" strokeWidth="2" strokeLinejoin="round" />
          {data.map((v, i) => <circle key={i} cx={(i / (data.length - 1)) * 100} cy={100 - ((v - min) / range) * 80 - 10} r="2.5" fill="#10B981" />)}
        </svg>
        <div className="flex justify-between text-[9px] text-[#9CA3AF] font-medium mt-0.5">
          {data.map((_, i) => <span key={i}>Test {i + 1}</span>)}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [d, setD] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);
  useEffect(() => {
    if (user) api.get('/dashboard').then(r => setD(r.data.dashboard)).catch(() => {}).finally(() => setLoadingData(false));
  }, [user]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]"><div className="w-10 h-10 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" /></div>;

  const handleLogout = () => { logout(); router.push('/login'); };
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const profile = d?.profile || {};
  const stats = d?.stats || {};
  const syllabus = d?.syllabus || {};
  const weeklyHours = d?.weeklyHours || [0, 0, 0, 0, 0, 0, 0];
  const testScores = d?.testScores || [];
  const weakTopics = d?.weakTopics || [];
  const subPerf = d?.subjectPerformance || [];
  const achievements = d?.achievements || [];
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Generate study plan from syllabus
  const todayPlan = (syllabus.subjects || []).slice(0, 2).map((s, i) => {
    const ch = s.topics?.[0]?.chapters?.[0];
    return { subject: ch?.name || s.name, time: `${ch?.estimatedMinutes || 45} mins`, topic: s.name, color: i === 0 ? 'bg-[#5956DF]' : 'bg-[#10B981]', action: i === 0 ? 'Start Session' : 'Take Quiz' };
  });

  // Remove mock tests, fallback to empty array
  const upcomingTests = d?.upcomingTests || [];

  // Focus area data (no mock fallback)
  const focusAreas = weakTopics.length > 0 ? weakTopics : subPerf.slice(0, 3).map(s => ({ topic: s.subject, score: s.accuracy }));

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
          <div className="px-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#9CA3AF] mb-1">
              <span>LEVEL {stats.level || 1}</span><span>{stats.currentLevelXp || 0} / {stats.nextLevelXp || 1000} XP</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#5956DF] rounded-full transition-all duration-1000" style={{ width: `${stats.progressPercent || 0}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5956DF] to-[#7C79F2] flex items-center justify-center text-white font-bold text-xs shadow-sm">{firstName.charAt(0).toUpperCase()}</div>
            <div className="min-w-0"><p className="text-[12px] font-bold text-[#1A1A1A] truncate">{user?.name}</p><p className="text-[10px] text-[#9CA3AF]">Scholar Tier</p></div>
          </div>
        </div>
      </aside>

      {/* Main */}
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
                  <span className="text-[12px] font-bold text-[#374151]">{stats.currentStreak || 0} Day Streak</span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                  <Lightning size={13} weight="fill" className="text-[#5956DF]" />
                  <span className="text-[12px] font-bold text-[#374151]">{(stats.xp || 0).toLocaleString()} XP</span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-gray-200" />
              <button onClick={handleLogout} className="text-[12px] font-medium text-[#9CA3AF] hover:text-red-500 flex items-center gap-1"><SignOut size={14} /></button>
            </div>
          </div>
        </header>

        <div className="px-6 lg:px-8 py-6 w-full">
          {/* Welcome */}
          <div className="mb-6">
            <h1 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight mb-0.5">Welcome back, {firstName}! 👋</h1>
            <p className="text-[14px] text-[#6B7280]">Ready to crush your targets today?</p>
          </div>

          {/* Custom Test CTA */}
          <div onClick={() => router.push('/custom-test')} className="mb-6 bg-gradient-to-r from-[#5956DF] to-[#7C3AED] rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:shadow-lg hover:shadow-[#5956DF]/20 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkle size={24} className="text-white" weight="fill" />
              </div>
              <div>
                <h3 className="text-[15px] font-extrabold text-white">Create Custom Test</h3>
                <p className="text-[13px] text-white/70">Type any topic and AI generates a test for you instantly</p>
              </div>
            </div>
            <PaperPlaneTilt size={24} className="text-white/50 group-hover:text-white transition-colors" weight="fill" />
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 xl:gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Today's Study Plan */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[16px] font-extrabold text-[#1A1A1A]">Today&apos;s Study Plan</h2>
                    <button className="text-[12px] font-bold text-[#5956DF] hover:underline">Edit Schedule</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {todayPlan.length > 0 ? todayPlan.map((item, idx) => (
                      <div key={idx} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                          <div>
                            <p className="text-[13px] font-bold text-[#1A1A1A]">{item.subject}</p>
                            <p className="text-[11px] text-[#9CA3AF]">{item.time} • {item.topic}</p>
                          </div>
                        </div>
                        <button className={`w-full py-2 rounded-lg text-[12px] font-bold text-white ${item.color} hover:opacity-90 transition-opacity`}>{item.action}</button>
                      </div>
                    )) : (
                      <div className="col-span-2 py-6 text-center text-[12px] text-[#9CA3AF] border border-dashed border-gray-200 rounded-xl">No study plan available. Start studying to generate one!</div>
                    )}
                  </div>
                </div>

                {/* Performance Insights */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-[16px] font-extrabold text-[#1A1A1A] mb-4">Performance Insights</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Weekly Study Hours</p>
                      <BarChart data={weeklyHours} labels={weekDays} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Test Score Improvement</p>
                      <LineChart data={testScores} />
                    </div>
                  </div>
                </div>

                {/* Focus Areas */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-[16px] font-extrabold text-[#1A1A1A] italic mb-4">Focus Areas (Weak Subjects)</h2>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Subject</th>
                        <th className="pb-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Proficiency</th>
                        <th className="pb-2.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Recommended</th>
                      </tr>
                    </thead>
                    <tbody>
                      {focusAreas.length > 0 ? focusAreas.map((item, idx) => {
                        const score = item.score || 0;
                        const name = item.topic || item.subject || 'Unknown';
                        const barColor = score < 50 ? 'bg-red-500' : score < 70 ? 'bg-amber-500' : 'bg-emerald-500';
                        const rec = score < 50 ? 'Revise Basics' : score < 70 ? 'Flashcard Deck' : 'Advanced Problems';
                        return (
                          <tr key={idx} className="border-b border-gray-50 last:border-0">
                            <td className="py-3 text-[13px] font-bold text-[#1A1A1A]">{name}</td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className={`text-[12px] font-bold ${score < 50 ? 'text-red-500' : score < 70 ? 'text-amber-500' : 'text-emerald-500'}`}>{score}%</span>
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} /></div>
                              </div>
                            </td>
                            <td className="py-3"><button className="text-[12px] font-bold text-[#5956DF] hover:underline">{rec}</button></td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan="3" className="py-6 text-center text-[12px] text-[#9CA3AF]">Take more tests to identify your weak areas</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                {/* Snapshot */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-[15px] font-extrabold text-[#1A1A1A] mb-3">Snapshot</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-[22px] font-extrabold text-[#10B981]">{stats.avgScore !== null ? `${stats.avgScore}%` : '--'}</p>
                      <p className="text-[10px] font-medium text-[#9CA3AF]">Avg Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[22px] font-extrabold text-[#5956DF]">{stats.totalStudyHours || 0}h</p>
                      <p className="text-[10px] font-medium text-[#9CA3AF]">Total Focus</p>
                    </div>
                  </div>
                </div>

                {/* Upcoming Tests */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-[15px] font-extrabold text-[#1A1A1A] mb-3">Upcoming Tests</h3>
                  <div className="space-y-2.5">
                    {upcomingTests.length > 0 ? upcomingTests.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100">
                        <div className="w-11 h-12 rounded-lg bg-[#5956DF]/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-[#5956DF] uppercase">{t.month}</span>
                          <span className="text-[16px] font-extrabold text-[#5956DF] leading-none">{t.day}</span>
                        </div>
                        <div>
                          <p className="text-[12px] font-bold text-[#1A1A1A]">{t.name}</p>
                          <p className="text-[10px] text-[#9CA3AF]">Duration: {t.duration}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="py-3 text-center text-[12px] text-[#9CA3AF]">No upcoming tests scheduled</div>
                    )}
                  </div>
                </div>

                {/* Recent Badges */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-[15px] font-extrabold text-[#1A1A1A] italic mb-3">Recent Achievements</h3>
                  {achievements.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {achievements.slice(0, 3).map((a, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shrink-0">
                            <Trophy size={16} weight="fill" className="text-white" />
                          </div>
                          <div>
                            <p className="text-[12px] font-bold text-[#1A1A1A]">{a.name}</p>
                            <p className="text-[10px] text-[#9CA3AF] line-clamp-1">{a.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-[12px] text-[#9CA3AF] mb-3 border border-dashed border-gray-200 rounded-xl">No achievements unlocked yet.<br/>Keep studying!</div>
                  )}
                  <button className="w-full py-2 rounded-lg border border-gray-200 text-[12px] font-bold text-[#374151] hover:bg-gray-50 transition-colors">View All Badges</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ChatbotWrapper />
    </div>
  );
}
