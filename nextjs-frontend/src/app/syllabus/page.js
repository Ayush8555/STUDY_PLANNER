'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import {
  Lightning, CaretDown, CaretRight, BookOpen, Fire,
  CheckCircle, Circle, Sparkle, MagnifyingGlass, Funnel, Clock, NotePencil, SignOut
} from '@phosphor-icons/react';
import { getNavItems } from '@/lib/navItems';

const NAV_ITEMS = getNavItems('/syllabus');

export default function SyllabusPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [d, setD] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);
  useEffect(() => {
    if (user) api.get('/dashboard').then(r => setD(r.data.dashboard)).catch(() => {}).finally(() => setLoadingData(false));
  }, [user]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]"><div className="w-10 h-10 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" /></div>;

  const handleLogout = () => { logout(); router.push('/login'); };
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const profile = d?.profile || {};
  const syllabus = d?.syllabus || { subjects: [], totalChapters: 0, totalSubjects: 0 };

  const colors = ['text-blue-600 bg-blue-50', 'text-violet-600 bg-violet-50', 'text-emerald-600 bg-emerald-50', 'text-amber-600 bg-amber-50', 'text-pink-600 bg-pink-50', 'text-cyan-600 bg-cyan-50', 'text-rose-600 bg-rose-50', 'text-indigo-600 bg-indigo-50'];

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
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5956DF] to-[#7C79F2] flex items-center justify-center text-white font-bold text-xs shadow-sm">{firstName.charAt(0).toUpperCase()}</div>
            <div className="min-w-0"><p className="text-[12px] font-bold text-[#1A1A1A] truncate">{user?.name}</p><p className="text-[10px] text-[#9CA3AF]">{profile.examName || 'Student'}</p></div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-[200px]">
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

        <div className="px-6 lg:px-8 py-6 w-full">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">📚 {profile.examName || 'Your'} Syllabus</h1>
            <p className="text-[14px] text-[#6B7280]">
              Complete subject-wise breakdown •{' '}
              <span className="font-bold text-[#5956DF]">{syllabus.totalSubjects} Subjects</span> •{' '}
              <span className="font-bold text-[#374151]">{syllabus.totalChapters} Chapters</span>
            </p>
          </div>

          {loadingData ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 w-full flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-lg shrink-0" />
                    <div>
                      <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
                      <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-14 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                    <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : syllabus.subjects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <BookOpen size={48} className="text-[#D1D5DB] mx-auto mb-4" />
              <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-2">No syllabus loaded</h3>
              <p className="text-[14px] text-[#6B7280] mb-4">Complete onboarding to auto-detect your exam syllabus</p>
              <button onClick={() => router.push('/onboarding')} className="px-6 py-2.5 bg-[#5956DF] text-white text-[13px] font-bold rounded-xl hover:bg-[#4B49C8] transition-colors">Set Up Profile</button>
            </div>
          ) : (
            <div className="space-y-3">
              {syllabus.subjects.map((subject, sIdx) => {
                const isExpanded = expandedSubject === sIdx;
                const color = colors[sIdx % colors.length];
                return (
                  <div key={subject.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Subject Header */}
                    <button onClick={() => setExpandedSubject(isExpanded ? null : sIdx)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${color}`}>
                          {subject.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="text-[15px] font-bold text-[#1A1A1A]">{subject.name}</p>
                          <p className="text-[11px] text-[#9CA3AF]">{subject.topicCount} topics • {subject.chapterCount} chapters</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-[#9CA3AF] bg-gray-50 px-2.5 py-1 rounded-lg">{subject.chapterCount} ch</span>
                        {isExpanded ? <CaretDown size={16} className="text-[#5956DF]" /> : <CaretRight size={16} className="text-[#9CA3AF]" />}
                      </div>
                    </button>

                    {/* Topics */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50">
                        {subject.topics.map((topic, tIdx) => {
                          const topicKey = `${sIdx}-${tIdx}`;
                          const isTopicExpanded = expandedTopic === topicKey;
                          return (
                            <div key={topic.id} className="mb-1 last:mb-0">
                              <button onClick={() => setExpandedTopic(isTopicExpanded ? null : topicKey)}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white transition-colors">
                                <div className="flex items-center gap-2.5">
                                  {isTopicExpanded ? <CaretDown size={13} className="text-[#5956DF]" /> : <CaretRight size={13} className="text-[#9CA3AF]" />}
                                  <span className="text-[13px] font-bold text-[#374151]">{topic.name}</span>
                                </div>
                                <span className="text-[10px] font-medium text-[#9CA3AF]">{topic.chapterCount} chapters</span>
                              </button>

                              {/* Chapters */}
                              {isTopicExpanded && (
                                <div className="ml-7 mb-2 space-y-0.5">
                                  {topic.chapters.map((chapter) => (
                                    <div key={chapter.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white transition-colors group cursor-pointer">
                                      <Circle size={14} className="text-[#D1D5DB] group-hover:text-[#5956DF] transition-colors" />
                                      <span className="text-[12px] text-[#4B5563] group-hover:text-[#1A1A1A] transition-colors flex-1">{chapter.name}</span>
                                      <span className="text-[10px] text-[#9CA3AF]">{chapter.estimatedMinutes || 60} min</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
