'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import {
  SignOut, Lightning, BookOpen, Sigma, Flask, Atom,
  Gear, ListChecks, PlayCircle, Clock, CheckCircle,
  Bell, SlidersHorizontal, Robot, ClockCounterClockwise,
  Notepad
} from '@phosphor-icons/react';
import Image from 'next/image';
import { getNavItems } from '@/lib/navItems';

const NAV_ITEMS = getNavItems('/practice');

export default function PracticePage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [setupData, setSetupData] = useState(null);
  const [recentTests, setRecentTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form State
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedMode, setSelectedMode] = useState('Topic-wise Drill');
  const [selectedTopics, setSelectedTopics] = useState([]); // chapter IDs
  const [numQuestions, setNumQuestions] = useState(20);
  const [difficulty, setDifficulty] = useState('Medium');
  const [isTimed, setIsTimed] = useState(true);

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      Promise.all([
        api.get('/practice/setup'),
        api.get('/practice/recent')
      ])
      .then(([setupRes, recentRes]) => {
        setSetupData(setupRes.data.setup);
        setRecentTests(recentRes.data.recent || []);
        if (setupRes.data.setup?.subjects?.length > 0) {
           setSelectedSubject(setupRes.data.setup.subjects[0].id);
        }
      })
      .catch((err) => console.error("Failed to load components:", err))
      .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]"><div className="w-10 h-10 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" /></div>;

  const subjects = setupData?.subjects || [];
  const recommendedChapter = setupData?.recommendedChapter || 'Integration';

  // Derive topics for currently selected subject
  const currentSubjectObj = subjects.find(s => s.id === selectedSubject);
  let availableChapters = [];
  if (currentSubjectObj) {
    if (currentSubjectObj.topics) {
      currentSubjectObj.topics.forEach(t => {
        if (t.chapters) {
          t.chapters.forEach(c => {
             // Mocking mastery status randomly for UI demonstration
             const mockStatus = ['Strong', 'Weak', 'Average', 'Unpracticed'][Math.floor(Math.random() * 4)];
             availableChapters.push({
                id: c.id,
                name: `${t.name}: ${c.name}`,
                status: mockStatus
             });
          });
        }
      });
    } else if (currentSubjectObj.chapters) {
      // Fallback if the subject directly has chapters
      currentSubjectObj.chapters.forEach(c => {
         const mockStatus = ['Strong', 'Weak', 'Average', 'Unpracticed'][Math.floor(Math.random() * 4)];
         availableChapters.push({
            id: c.id,
            name: c.name,
            status: mockStatus
         });
      });
    }
  }

  const toggleTopic = (id) => {
    setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleStartPractice = async () => {
    if (!selectedSubject) return alert('Please select a subject first.');
    if (availableChapters.length > 0 && selectedTopics.length === 0) {
      return alert('Please select at least one topic.');
    }
    try {
      setGenerating(true);
      const res = await api.post('/practice/generate', {
        chapterIds: selectedTopics,
        subjectId: selectedSubject,
        topicNames: selectedTopics.length > 0 
          ? availableChapters.filter(c => selectedTopics.includes(c.id)).map(c => c.name)
          : [],
        mode: selectedMode.toLowerCase().replace(' ', '_'),
        difficulty: difficulty.toLowerCase(),
        numQuestions
      });
      if (res.data.success) {
        router.push(`/practice/take/${res.data.testId}`);
      }
    } catch (error) {
       console.error(error);
       alert('Error generating test. Please try again in a moment.');
    } finally {
       setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB] font-sans flex text-[#1A1A1A]">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-white border-r border-gray-100 min-h-screen py-8 px-5 fixed left-0 top-0 z-40">
        <div className="flex items-center gap-3 px-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-[#5956DF] flex items-center justify-center text-white shadow-md">
            <Atom weight="bold" size={24} />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-[#1A1A1A] text-[16px] block">PrepMind AI</span>
            <span className="text-[12px] text-[#6B7280] font-medium">JEE Preparation</span>
          </div>
        </div>
        <nav className="flex-1 space-y-2">
          {NAV_ITEMS.map((item) => (
            <button key={item.label} onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[14px] transition-all font-bold ${item.active ? 'bg-[#5956DF]/10 text-[#5956DF]' : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#1A1A1A]'}`}>
              <item.icon size={22} weight={item.active ? 'fill' : 'regular'} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4">
           <div className="bg-white border border-gray-100 p-5 rounded-[20px] shadow-sm">
             <p className="text-[11px] font-bold text-[#9CA3AF] tracking-widest uppercase mb-3">Daily Goal</p>
             <div className="w-full h-2 bg-gray-100 rounded-full mb-3 overflow-hidden"><div className="h-full bg-[#10B981] w-[65%] rounded-full" /></div>
             <p className="text-[12px] font-medium text-[#6B7280]">13/20 Questions solved</p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen">
        <header className="sticky top-0 bg-[#FAFAFB]/90 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center justify-between px-8 lg:px-12 h-[96px]">
            <h1 className="text-[24px] font-extrabold text-[#1A1A1A]">Practice Tests</h1>
            
            <div className="flex items-center gap-8">
              <button className="relative text-[#6B7280] hover:text-[#1A1A1A] transition-colors">
                <Bell size={24} weight="fill" />
                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-[#FAFAFB] rounded-full" />
              </button>
              
              <div className="h-10 w-px bg-gray-200" />
              
              <div className="flex items-center gap-4 cursor-pointer">
                <div className="text-right hidden sm:block">
                  <p className="text-[15px] font-extrabold text-[#1A1A1A] leading-tight">{user.name}</p>
                  <p className="text-[12px] font-bold text-[#6B7280]">Rank: #142</p>
                </div>
                <div className="w-11 h-11 rounded-full bg-orange-200 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-orange-600 font-bold text-[16px]">
                  {user.name.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="px-8 lg:px-10 pb-12 w-full flex-1">
          {loading ? (
             <div className="max-w-[1200px] mx-auto animate-pulse">
               <div className="flex flex-col xl:flex-row gap-8">
                 {/* Left Column Skeleton */}
                 <div className="flex-1 space-y-8">
                   {/* Recommended Banner Skeleton */}
                   <div className="bg-gray-200 dark:bg-gray-800 rounded-[24px] h-[100px] w-full" />
                   
                   {/* 1. Choose Subject Skeleton */}
                   <div>
                     <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-5" />
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                       <div className="h-[120px] bg-gray-200 dark:bg-gray-800 rounded-[24px]" />
                       <div className="h-[120px] bg-gray-200 dark:bg-gray-800 rounded-[24px]" />
                       <div className="h-[120px] bg-gray-200 dark:bg-gray-800 rounded-[24px]" />
                     </div>
                   </div>

                   {/* 2. Select Mode Skeleton */}
                   <div>
                     <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-5" />
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                       <div className="h-[100px] bg-gray-200 dark:bg-gray-800 rounded-[20px]" />
                       <div className="h-[100px] bg-gray-200 dark:bg-gray-800 rounded-[20px]" />
                       <div className="h-[100px] bg-gray-200 dark:bg-gray-800 rounded-[20px]" />
                     </div>
                   </div>

                   {/* 3. Select Topics Skeleton */}
                   <div>
                     <div className="flex justify-between mb-5">
                       <div className="h-6 w-36 bg-gray-200 dark:bg-gray-800 rounded" />
                       <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                       <div className="h-[70px] bg-gray-200 dark:bg-gray-800 rounded-[20px]" />
                       <div className="h-[70px] bg-gray-200 dark:bg-gray-800 rounded-[20px]" />
                       <div className="h-[70px] bg-gray-200 dark:bg-gray-800 rounded-[20px]" />
                       <div className="h-[70px] bg-gray-200 dark:bg-gray-800 rounded-[20px]" />
                     </div>
                   </div>
                 </div>

                 {/* Right Sidebar Skeleton */}
                 <div className="w-full xl:w-[340px] shrink-0">
                   <div className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                     <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-8" />
                     <div className="space-y-8">
                       <div>
                         <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
                         <div className="h-12 w-full bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                       </div>
                       <div>
                         <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-5" />
                         <div className="space-y-4">
                           <div className="h-6 w-full bg-gray-200 dark:bg-gray-800 rounded" />
                           <div className="h-6 w-full bg-gray-200 dark:bg-gray-800 rounded" />
                           <div className="h-6 w-full bg-gray-200 dark:bg-gray-800 rounded" />
                         </div>
                       </div>
                       <div className="pt-2">
                         <div className="flex justify-between mb-4">
                           <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
                           <div className="h-6 w-12 bg-gray-200 dark:bg-gray-800 rounded-full" />
                         </div>
                         <div className="h-14 w-full bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                       </div>
                       <div className="pt-5 border-t border-gray-100 dark:border-gray-800">
                         <div className="h-[56px] w-full bg-gray-200 dark:bg-gray-800 rounded-[16px]" />
                         <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded mt-5 mx-auto" />
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
          ) : (
             <div className="max-w-[1200px] mx-auto">
                <div className="flex flex-col xl:flex-row gap-8">
                  {/* Left Column */}
                  <div className="flex-1 space-y-8">
                    
                    {/* Recommended Banner */}
                    <div className="bg-gradient-to-r from-[#F0EEFF] to-[#F8F7FF] rounded-[24px] p-6 flex items-center justify-between border border-[#5956DF]/15 shadow-sm">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-full bg-[#E5E3FF] flex items-center justify-center text-[#5956DF] shadow-inner shrink-0">
                          <Lightning size={24} weight="fill" />
                        </div>
                        <div>
                          <h2 className="text-[17px] font-extrabold text-[#1A1A1A] mb-1">Recommended for You</h2>
                          <p className="text-[13px] text-[#6B7280] font-medium leading-relaxed">Based on your last mock test, we suggest practicing <span className="font-extrabold text-[#5956DF]">{recommendedChapter}</span>.</p>
                        </div>
                      </div>
                      <button className="hidden sm:flex px-6 py-3.5 bg-[#5956DF] hover:bg-[#4B49C8] transition-colors rounded-xl text-white font-bold text-[14px] items-center gap-2 shadow-sm shrink-0 whitespace-nowrap">
                        Quick Start Practice &rarr;
                      </button>
                    </div>

                    {/* 1. Choose Subject */}
                    <div>
                      <h2 className="text-[18px] font-extrabold text-[#1A1A1A] flex items-center gap-3 mb-5">
                          <BookOpen size={24} className="text-[#5956DF]" weight="fill" /> 1. Choose Subject
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                          {subjects.map(s => {
                            const isSelected = selectedSubject === s.id;
                            return (
                                <button 
                                  key={s.id} onClick={() => { setSelectedSubject(s.id); setSelectedTopics([]); }}
                                  className={`p-7 rounded-[24px] border-2 transition-all flex flex-col items-center justify-center gap-4 ${isSelected ? 'border-[#5956DF] bg-[#5956DF]/5 shadow-[0_4px_15px_-4px_rgba(89,86,223,0.1)]' : 'border-white bg-white hover:border-[#F3F4F6] shadow-sm'}`}
                                >
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${isSelected ? 'bg-white text-[#5956DF] shadow-sm' : 'bg-[#F9FAFB] text-[#9CA3AF]'}`}>
                                      {s.name.includes('Math') ? <Sigma weight="bold" /> : s.name.includes('Phy') ? <Robot weight="bold" /> : <Flask weight="bold" />}
                                  </div>
                                  <span className={`text-[15px] font-extrabold tracking-tight ${isSelected ? 'text-[#1A1A1A]' : 'text-[#6B7280]'}`}>{s.name}</span>
                                </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* 2. Select Mode */}
                    <div>
                      <h2 className="text-[18px] font-extrabold text-[#1A1A1A] flex items-center gap-3 mb-5">
                          <Gear size={24} className="text-[#5956DF]" weight="fill" /> 2. Select Mode
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                          {['Topic-wise Drill', 'Chapter Test', 'Random Mix'].map(mode => {
                            const isSelected = selectedMode === mode;
                            return (
                                <button 
                                  key={mode} onClick={() => setSelectedMode(mode)}
                                  className={`p-5 rounded-[20px] border-2 text-left relative transition-all min-h-[100px] flex flex-col justify-center ${isSelected ? 'border-[#5956DF] bg-[#5956DF]/5 shadow-sm' : 'border-white bg-white shadow-sm hover:border-[#F3F4F6]'}`}
                                >
                                  <p className={`text-[15px] font-extrabold mb-1 pr-6 ${isSelected ? 'text-[#1A1A1A]' : 'text-[#4B5563]'}`}>{mode}</p>
                                  <p className="text-[12px] font-medium text-[#9CA3AF] leading-relaxed">
                                    {mode === 'Topic-wise Drill' ? 'Focus on specific topics' : mode === 'Chapter Test' ? 'Full single chapter' : 'Mixed from all chapters'}
                                  </p>
                                  {isSelected && <div className="absolute top-4 right-4 w-[22px] h-[22px] bg-[#5956DF] text-white rounded-full flex items-center justify-center shadow-sm"><CheckCircle size={14} weight="bold" /></div>}
                                </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* 3. Select Topics */}
                    {selectedSubject && availableChapters.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-5 px-1">
                            <h2 className="text-[18px] font-extrabold text-[#1A1A1A] flex items-center gap-3">
                              <ListChecks size={24} className="text-[#5956DF]" weight="fill" /> 3. Select Topics
                            </h2>
                            <button 
                              className="text-[14px] font-extrabold text-[#5956DF] hover:underline"
                              onClick={() => setSelectedTopics(selectedTopics.length === availableChapters.length ? [] : availableChapters.map(c => c.id))}
                            >
                              {selectedTopics.length === availableChapters.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-h-[400px] overflow-y-auto custom-scrollbar pb-2">
                            {availableChapters.map(ch => {
                              const isSelected = selectedTopics.includes(ch.id);
                              
                              let pillBg = 'bg-[#F3F4F6]'; let pillText = 'text-[#6B7280]';
                              if(ch.status === 'Strong') { pillBg = 'bg-[#10B981]/10'; pillText = 'text-[#10B981]'; }
                              if(ch.status === 'Average') { pillBg = 'bg-[#F59E0B]/10'; pillText = 'text-[#F59E0B]'; }
                              if(ch.status === 'Weak') { pillBg = 'bg-[#EF4444]/10'; pillText = 'text-[#EF4444]'; }
                              
                              return (
                                  <button 
                                    key={ch.id} onClick={() => toggleTopic(ch.id)}
                                    className={`flex items-center justify-between p-5 rounded-[20px] border transition-all ${isSelected ? 'border-transparent shadow-[0_0_0_2px_#5956DF] bg-white' : 'border-[#F3F4F6] bg-white shadow-sm hover:border-[#E5E7EB]'}`}
                                  >
                                    <div className="flex items-center gap-4 flex-1">
                                      <div className={`w-[22px] h-[22px] rounded-lg border-[2px] flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#5956DF] border-[#5956DF]' : 'border-[#D1D5DB] bg-white'}`}>
                                          {isSelected && <CheckCircle size={16} weight="bold" className="text-white" />}
                                      </div>
                                      <span className="text-[14px] font-extrabold text-[#1A1A1A] text-left line-clamp-2 leading-snug pr-2">{ch.name.split(': ')[1] || ch.name}</span>
                                    </div>
                                    <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1.5 rounded-full whitespace-nowrap ${pillBg} ${pillText}`}>
                                      {ch.status}
                                    </span>
                                  </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Sidebar - Session Settings */}
                  <div className="w-full xl:w-[340px] shrink-0">
                    <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm sticky top-[120px]">
                      <h2 className="text-[18px] font-extrabold text-[#1A1A1A] flex items-center gap-3 mb-8">
                          <SlidersHorizontal size={24} className="text-[#5956DF]" weight="fill" /> Session Settings
                      </h2>

                      <div className="space-y-8">
                          {/* Num Questions */}
                          <div>
                            <label className="block text-[14px] font-bold text-[#1A1A1A] mb-4">Number of Questions</label>
                            <div className="flex bg-[#F9FAFB] rounded-2xl p-1.5 border border-gray-100">
                                {[10, 20, 30].map(num => (
                                  <button 
                                      key={num} onClick={() => setNumQuestions(num)}
                                      className={`flex-1 py-3.5 text-[14px] font-extrabold rounded-xl transition-all ${numQuestions === num ? 'bg-white text-[#5956DF] shadow-sm' : 'text-[#6B7280] hover:text-[#1A1A1A]'}`}
                                  >
                                      {num}
                                  </button>
                                ))}
                            </div>
                          </div>

                          {/* Difficulty */}
                          <div>
                            <label className="block text-[14px] font-bold text-[#1A1A1A] mb-5">Difficulty Level</label>
                            <div className="space-y-4">
                                {['Easy', 'Medium', 'Hard'].map(lvl => (
                                  <label key={lvl} onClick={() => setDifficulty(lvl)} className="flex items-center gap-4 cursor-pointer group">
                                      <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors ${difficulty === lvl ? 'border-[#5956DF]' : 'border-[#D1D5DB] group-hover:border-[#5956DF]/50'}`}>
                                        {difficulty === lvl && <div className="w-2.5 h-2.5 rounded-full bg-[#5956DF]" />}
                                      </div>
                                      <span className={`text-[15px] font-bold ${difficulty === lvl ? 'text-[#1A1A1A]' : 'text-[#4B5563]'}`}>{lvl}</span>
                                  </label>
                                ))}
                            </div>
                          </div>

                          {/* Timer */}
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[14px] font-bold text-[#1A1A1A]">Timer Options</span>
                                <button 
                                  onClick={() => setIsTimed(!isTimed)}
                                  className={`w-[48px] h-[28px] rounded-full p-1 transition-colors relative ${isTimed ? 'bg-[#5956DF]' : 'bg-[#E5E7EB]'}`}
                                >
                                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform absolute top-1 ${isTimed ? 'left-[24px]' : 'left-[4px]'}`} />
                                </button>
                            </div>
                            
                            <div className={`flex justify-between items-center bg-[#F9FAFB] p-5 rounded-2xl border transition-opacity ${isTimed ? 'border-gray-200 opacity-100' : 'border-transparent opacity-50'}`}>
                                <span className="text-[13px] font-bold text-[#6B7280]">Session Duration</span>
                                <strong className="text-[15px] font-extrabold text-[#1A1A1A]">{numQuestions * 2} Minutes</strong>
                            </div>
                          </div>

                          <div className="pt-5 border-t border-gray-100">
                            <button 
                              onClick={handleStartPractice}
                              disabled={generating || selectedTopics.length === 0}
                              className="w-full py-4 bg-[#5956DF] hover:bg-[#4B49C8] disabled:bg-[#5956DF]/50 disabled:cursor-not-allowed text-white font-extrabold rounded-[16px] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 text-[16px]"
                            >
                              {generating ? (
                                <><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Generating Test...</>
                              ) : (
                                <><PlayCircle size={22} weight="fill" /> Start Practice Session</>
                              )}
                            </button>
                            <p className="text-[11px] text-center text-[#9CA3AF] font-medium leading-[1.6] mt-5 px-3">
                              By starting, you agree to the examination policy. Results will be saved to your Analytics dashboard.
                            </p>
                          </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="mt-16">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[20px] font-extrabold text-[#1A1A1A] flex items-center gap-3">
                      <ClockCounterClockwise size={26} className="text-[#5956DF]" /> Recent Activity
                    </h2>
                    <button className="text-[14px] font-bold text-[#5956DF] hover:underline">
                      View All History
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recentTests.length === 0 ? (
                      <div className="col-span-full py-10 text-center text-[#9CA3AF] font-bold bg-white rounded-3xl border border-gray-100">
                         No recent tests found. Start a practice session today!
                      </div>
                    ) : (
                      recentTests.map(test => {
                        return (
                          <div key={test.id} className="bg-white rounded-[24px] border border-[#F3F4F6] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                             <div className="flex justify-between items-start mb-4">
                               <div>
                                 <p className="text-[11px] font-extrabold text-[#5956DF] tracking-widest uppercase mb-1.5">{test.subject}</p>
                                 <h3 className="text-[16px] font-extrabold text-[#1A1A1A] mb-1 line-clamp-1">{test.test_name || 'Practice Session'}</h3>
                                 <p className="text-[11px] font-medium text-[#9CA3AF]">{new Date(test.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                               </div>
                               <div className="text-right">
                                 <p className={`text-[20px] font-extrabold leading-tight ${test.accuracy >= 80 ? 'text-[#10B981]' : test.accuracy >= 50 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>{Math.round(test.accuracy)}%</p>
                                 <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mt-1">Accuracy</p>
                               </div>
                             </div>

                             <div className="w-full h-[6px] bg-gray-100 rounded-full mb-5 mt-2 overflow-hidden">
                               <div className={`h-full rounded-full ${test.accuracy >= 80 ? 'bg-[#10B981]' : test.accuracy >= 50 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`} style={{ width: `${test.accuracy}%` }} />
                             </div>

                             <div className="flex justify-between items-center mb-6 text-[12px] font-bold text-[#6B7280]">
                               <span className="flex items-center gap-1.5"><Clock size={16} weight="bold" /> {Math.floor(test.time_taken_seconds / 60)}m {test.time_taken_seconds % 60}s</span>
                               <span className="flex items-center gap-1.5"><CheckCircle size={16} weight="bold" /> {test.score}/{test.total_questions} Correct</span>
                             </div>

                             <button 
                               onClick={() => router.push(`/practice/analysis/${test.test_id}`)}
                               className="mt-auto w-full py-3 bg-white border-2 border-gray-100 hover:border-[#5956DF] hover:text-[#5956DF] hover:bg-[#5956DF]/5 text-[#4B5563] font-bold rounded-[14px] transition-colors flex items-center justify-center gap-2 text-[13px] shadow-sm"
                             >
                               <Notepad size={16} weight="fill" /> Review Analysis
                             </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
