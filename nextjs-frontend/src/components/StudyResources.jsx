'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  MagnifyingGlass,
  BookOpen,
  CaretRight,
  CaretDown,
  ClockCounterClockwise,
  GlobeHemisphereWest,
  Bank,
  Money,
  Flask,
  Gear,
  ArrowRight
} from '@phosphor-icons/react';

// Helpers for dynamic styling
function getSubjectIcon(sub) {
  switch (sub.toLowerCase()) {
    case 'history': return ClockCounterClockwise;
    case 'geography': return GlobeHemisphereWest;
    case 'polity': return Bank;
    case 'economics': return Money;
    case 'science': return Flask;
    default: return BookOpen;
  }
}

function getSubjectColor(sub) {
  switch (sub.toLowerCase()) {
    case 'history': return 'text-orange-500';
    case 'geography': return 'text-blue-500';
    case 'polity': return 'text-purple-500';
    case 'economics': return 'text-emerald-500';
    case 'science': return 'text-cyan-500';
    default: return 'text-gray-500';
  }
}

function getSubjectBgColor(sub) {
  switch (sub.toLowerCase()) {
    case 'history': return 'bg-orange-50';
    case 'geography': return 'bg-blue-50';
    case 'polity': return 'bg-purple-50';
    case 'economics': return 'bg-emerald-50';
    case 'science': return 'bg-cyan-50';
    default: return 'bg-gray-50';
  }
}

function getSubjectStdBg(sub) {
  switch (sub.toLowerCase()) {
    case 'history': return 'bg-orange-100';
    case 'geography': return 'bg-emerald-100';
    case 'polity': return 'bg-indigo-100';
    default: return 'bg-gray-100';
  }
}

export default function StudyResources() {
  const { user } = useAuth();
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedClass, setExpandedClass] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [ncertData, setNcertData] = useState({});
  const [standardBooks, setStandardBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    const fetchResources = async () => {
      if (!user) return; // Wait for user info
      
      setLoading(true);
      try {
        // Fetch resources based strictly on the user's stored goal
        const userGoal = user.goal || 'UPSC';
        const response = await api.get(`/resources?goal=${userGoal}`);
        if (response.data.success) {
          processResources(response.data.resources);
        }
      } catch (error) {
        console.error('Failed to fetch resources:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, [user]);

  const processResources = (resources) => {
    // Separate by type
    const ncert = resources.filter(r => r.type === 'NCERT');
    const std = resources.filter(r => r.type === 'Standard Book');

    // Process NCERT Data
    const formattedNcert = {};
    ncert.forEach(item => {
      const subjectKey = item.subject.toLowerCase();
      if (!formattedNcert[subjectKey]) {
        formattedNcert[subjectKey] = {
           icon: getSubjectIcon(subjectKey),
           color: getSubjectColor(subjectKey),
           bgColor: getSubjectBgColor(subjectKey),
           title: item.subject.charAt(0).toUpperCase() + item.subject.slice(1),
           desc: '',
           classes: []
        };
      }
      
      const classLevel = item.class_level || 'Other';
      let classObj = formattedNcert[subjectKey].classes.find(c => c.id === `class${classLevel}`);
      if (!classObj) {
        let titleName = classLevel !== 'Other' ? `Class ${classLevel}` : item.title;
        // Override for known UPSC mappings (to keep UI feeling like original)
        if (item.title && item.title !== titleName) titleName = item.title;
        
        classObj = {
          id: `class${classLevel}`,
          number: classLevel,
          title: titleName,
          chapters: []
        };
        formattedNcert[subjectKey].classes.push(classObj);
      }
      
      classObj.chapters.push({
        number: classObj.chapters.length + 1,
        name: item.chapter_name,
        link: item.resource_link
      });
    });

    Object.keys(formattedNcert).forEach(key => {
       const totalChapters = formattedNcert[key].classes.reduce((acc, cls) => acc + cls.chapters.length, 0);
       formattedNcert[key].desc = `Class ${formattedNcert[key].classes.map(c=>c.number).filter(n=>n!=='Other').sort()[0] || '?'} to 12 • ${totalChapters} Resources`;
    });

    setNcertData(formattedNcert);

    // Process Standard Books
    const formattedStd = std.map((item, idx) => {
      // Extract author if formatted in chapter_name like "CATEGORY (Author, Ed)"
      let author = 'Unknown';
      let titleDesc = item.chapter_name || '';
      
      if (item.chapter_name && item.chapter_name.includes('(')) {
        author = item.chapter_name.split('(')[1]?.replace(')', '') || 'Unknown';
      }

      return {
        id: item.id,
        category: item.subject.toUpperCase(),
        catColor: getSubjectColor(item.subject.toLowerCase()),
        edition: 'Latest Ed.',
        title: item.title,
        author: author,
        desc: `Comprehensive guide for ${item.subject}`,
        link: item.resource_link,
        bgClass: getSubjectStdBg(item.subject.toLowerCase()),
        primary: idx === 0
      };
    });

    setStandardBooks(formattedStd);
    
    // Auto-expand first available subject
    const firstSubject = Object.keys(formattedNcert)[0];
    if (firstSubject) {
      setExpandedSubject(firstSubject);
      const firstClass = formattedNcert[firstSubject].classes[0];
      if (firstClass) {
         setExpandedClass(`${firstSubject}-${firstClass.id}`);
      }
    } else {
      setExpandedSubject(null);
      setExpandedClass(null);
    }
  };

  const handleReadClick = (e, link) => {
    e.stopPropagation();
    if (link && link !== '#') {
       window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  const renderSubjectClasses = (key, subject) => {
    return (
      <div className="px-5 pt-1 pb-5 flex flex-col gap-3">
        {subject.classes.map((cls) => {
          const classKey = `${key}-${cls.id}`;
          const isClassExpanded = expandedClass === classKey;
          return (
            <div key={cls.id} className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.04)] overflow-hidden transition-all">
              <div 
                onClick={() => setExpandedClass(isClassExpanded ? null : classKey)}
                className="flex items-center justify-between py-3.5 px-4 cursor-pointer hover:bg-gray-50/80 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-[10px] bg-gray-50 flex items-center justify-center font-bold text-gray-400 text-xs shrink-0 transition-colors group-hover:bg-gray-100 border border-gray-100/50">
                    C{cls.number}
                  </div>
                  <span className="font-bold text-[#1A1A1A] text-[14px]">{cls.title}</span>
                </div>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${isClassExpanded ? 'bg-[#5956DF] text-white shadow-md shadow-[#5956DF]/20 rotate-180' : 'bg-gray-100 text-[#9CA3AF] group-hover:bg-gray-200'}`}>
                  <CaretDown size={14} weight="bold" />
                </div>
              </div>
              
              {isClassExpanded && (
                <div className="border-t border-gray-100/80 px-4 py-3 bg-[#FBFAFC] flex flex-col gap-1.5">
                  {cls.chapters && cls.chapters.length > 0 ? (
                    cls.chapters.map((chapter, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5 px-3 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-200 hover:shadow-sm group/chapter">
                        <div className="flex items-start sm:items-center gap-3">
                          <span className="bg-white border border-gray-200/60 shadow-sm text-[#6B7280] group-hover/chapter:text-[#5956DF] group-hover/chapter:border-[#5956DF]/20 text-[11px] font-bold px-2 py-1 rounded-md shrink-0 transition-colors">
                            {typeof chapter.number === 'number' ? `Ch ${chapter.number}` : chapter.number}
                          </span>
                          <span className="text-[13px] font-medium text-[#374151] leading-snug">{chapter.name}</span>
                        </div>
                        <button 
                          onClick={(e) => handleReadClick(e, chapter.link)} 
                          className="text-[12px] font-bold px-4 py-1.5 rounded-lg bg-white border border-gray-200 text-[#5956DF] hover:bg-[#5956DF] hover:text-white hover:border-[#5956DF] transition-all shrink-0 focus:ring-2 focus:ring-[#5956DF]/30"
                        >
                          Read
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-5 text-center text-[13px] font-medium text-[#9CA3AF]">
                      No chapters available
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto pb-20">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pt-8 pb-6 gap-6">
        <div>
          <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-1">
            Study Resources
          </h1>
          <p className="text-[15px] font-medium text-[#6B7280]">
            Recommended books based on your goal
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-[260px]">
            <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search books..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100/80 border-transparent rounded-2xl text-[14px] outline-none focus:bg-white focus:border-[#5956DF] focus:ring-2 focus:ring-[#5956DF]/20 transition-all font-medium placeholder:text-[#9CA3AF]"
            />
          </div>
          <button className="flex items-center gap-2 px-5 py-3 bg-gray-100/80 rounded-2xl text-[13px] font-bold text-[#374151] hover:bg-gray-200/80 transition-colors shrink-0">
            Type: All <CaretDown size={14} weight="bold" />
          </button>
        </div>
      </div>

      {/* Main Content Area (Loader or Data) */}
      {loading ? (
        <div className="space-y-10 animate-pulse">
           <div>
             <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {[1,2,3].map(i => (
                   <div key={i} className="h-24 bg-gray-100 rounded-[24px]"></div>
                 ))}
             </div>
           </div>
           <div>
             <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[1,2,3].map(i => (
                   <div key={i} className="h-64 bg-gray-100 rounded-[24px]"></div>
                 ))}
             </div>
           </div>
        </div>
      ) : (
        <>
          {/* NCERT Books Section */}
          {Object.keys(ncertData).length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[20px] font-extrabold text-[#1A1A1A]">NCERT Books / Modules</h2>
                <button className="text-[13px] font-bold text-[#5956DF] flex items-center gap-1.5 hover:underline transition-all">
                  View curriculum map <ArrowRight size={14} weight="bold" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {Object.keys(ncertData).map((key, idx) => {
                  const subject = ncertData[key];
                  const isCompExpanded = expandedSubject === key;
                  const Icon = subject.icon;
                  // Make polity span full width on large screens if it matches the original layout style smoothly
                  const spanClass = key === 'polity' ? 'md:col-span-2' : 'col-span-1';

                  return (
                    <div key={key} className={`bg-[#FBFAFC] rounded-[24px] border border-gray-100 overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] transition-all h-fit ${spanClass}`}>
                      <div 
                        onClick={() => setExpandedSubject(isCompExpanded ? null : key)}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer group hover:bg-white transition-colors gap-3 sm:gap-0"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-[14px] ${subject.bgColor} flex items-center justify-center shrink-0`}>
                            <Icon size={24} weight="fill" className={subject.color} />
                          </div>
                          <div>
                            <h3 className="text-[16px] font-extrabold text-[#1A1A1A] group-hover:text-[#5956DF] transition-colors">{subject.title}</h3>
                            <p className="text-[12px] font-medium text-[#9CA3AF] mt-0.5">{subject.desc}</p>
                          </div>
                        </div>
                        <div className={`w-8 h-8 rounded-full sm:self-center self-end flex items-center justify-center transition-all duration-300 ${isCompExpanded ? 'bg-[#5956DF] text-white shadow-md shadow-[#5956DF]/20 rotate-180' : 'bg-gray-100 text-[#9CA3AF] group-hover:bg-gray-200'}`}>
                          <CaretDown size={16} weight="bold" />
                        </div>
                      </div>
                      {isCompExpanded && renderSubjectClasses(key, subject)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Object.keys(ncertData).length === 0 && standardBooks.length === 0 && (
             <div className="mb-12 text-center py-20 bg-gray-50 rounded-3xl border border-gray-100">
                <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-gray-900 font-bold text-lg">No Resources Found</h3>
                <p className="text-gray-500 mt-2 text-sm">We are still compiling the best resources for your goal ({user?.goal || 'UPSC'}). Check back later!</p>
             </div>
          )}

          {/* Standard Reference Books */}
          {standardBooks.length > 0 && (
            <div className="mb-14">
              <h2 className="text-[20px] font-extrabold text-[#1A1A1A] mb-6">Standard Reference Books</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {standardBooks.map((book) => (
                  <div key={book.id} className="bg-white rounded-[24px] border border-gray-100 overflow-hidden hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.06)] transition-all flex flex-col h-full group">
                    <div className={`h-[180px] ${book.bgClass} flex flex-col items-center justify-end p-6 relative overflow-hidden`}>
                      <div className="w-[110px] h-[140px] bg-white/90 backdrop-blur rounded-[10px] shadow-lg transform rotate-[-4deg] group-hover:rotate-0 translate-y-6 group-hover:translate-y-4 transition-all duration-500 flex flex-col items-center justify-center relative border border-white/50">
                        <div className={`w-12 h-2 rounded-full absolute top-6 ${book.primary ? 'bg-[#342FC2]' : 'bg-[#D97706]'}`}></div>
                        {book.primary && <div className="w-3 h-3 rounded-full bg-emerald-400 absolute bottom-6 left-6"></div>}
                        <div className={`w-16 h-1 rounded-full absolute top-10 ${book.primary ? 'bg-[#342FC2]/20' : 'bg-[#D97706]/20'}`}></div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>
                    </div>
                    
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-bold ${book.catColor} uppercase tracking-wider bg-gray-50 px-2.5 py-1 rounded-md`}>
                          {book.category}
                        </span>
                        <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">
                          {book.edition}
                        </span>
                      </div>
                      <h3 className="text-[18px] font-extrabold text-[#1A1A1A] mb-2 leading-tight">
                        {book.title}
                      </h3>
                      <p className="text-[13px] text-[#6B7280] leading-relaxed mb-6 flex-1">
                        By {book.author}. {book.desc}
                      </p>
                      <button 
                        onClick={(e) => handleReadClick(e, book.link)}
                        className={`w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all flex items-center justify-center gap-2 ${
                        book.primary 
                          ? 'bg-[#342FC2] text-white hover:bg-[#2B27A4] shadow-[0_8px_16px_-4px_rgba(52,47,194,0.3)] hover:-translate-y-[1px]' 
                          : 'bg-gray-100 text-[#374151] hover:bg-gray-200'
                      }`}>
                        View Resource
                        <svg className="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer Banner */}
      <div className="bg-gradient-to-br from-[#EEF2FC] to-[#F3EEFA] rounded-[32px] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden border border-white/50 shadow-xl shadow-purple-900/5 mt-auto">
        <div className="relative z-10 max-w-[500px]">
          <h2 className="text-[22px] md:text-[26px] font-extrabold text-[#342FC2] mb-3 leading-tight">
            Need a personalized study plan?
          </h2>
          <p className="text-[15px] font-medium text-[#4B5563] leading-relaxed mb-6">
            Our AI Tutor can analyze these resources and create a weekly reading schedule mapped to your exam date.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button className="w-full sm:w-auto px-7 py-3.5 bg-[#342FC2] text-white text-[14px] font-bold rounded-2xl hover:bg-[#2B27A4] transition-all shadow-[0_8px_16px_-4px_rgba(52,47,194,0.3)] hover:-translate-y-[1px]">
              Start Planning
            </button>
            <button className="w-full sm:w-auto px-6 py-3.5 text-[14px] font-bold text-[#342FC2] hover:bg-[#342FC2]/5 rounded-2xl transition-colors">
              Learn more
            </button>
          </div>
        </div>
        <div className="w-[140px] h-[120px] bg-white rounded-[24px] shadow-[0_20px_40px_-10px_rgba(52,47,194,0.15)] flex items-center justify-center shrink-0 relative z-10 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
           <Gear size={54} weight="fill" className="text-[#342FC2]" />
        </div>
        
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#342FC2]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      </div>
      
    </div>
  );
}
