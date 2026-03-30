'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { NCERT_CHAPTERS, NCERT_SUBJECTS, NCERT_CLASSES } from '@/data/ncertChapters';
import {
  SignOut, Sparkle, Lightning, Bell,
  Lock, CaretLeft, Info, Clock, Spinner, CheckCircle, ArrowRight, Check, ChartBar, Notepad
} from '@phosphor-icons/react';
import { getNavItems } from '@/lib/navItems';

const NAV_ITEMS = getNavItems('/tests');

const TEST_TYPES = [
  { value: 'full_syllabus', label: 'Full Syllabus', desc: 'Complete syllabus coverage' },
  { value: 'chapters', label: 'Chapters', desc: 'Chapter-wise assessment' },
  { value: 'previous_year', label: 'Previous Year', desc: 'Past exam questions' },
  { value: 'mock_test', label: 'Mock Test', desc: 'Simulated exam experience' },
  { value: 'ncert', label: 'NCERT', desc: 'NCERT textbook questions' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'exam_level', label: 'Exam Level' },
];

const AI_INSIGHTS = {
  full_syllabus: {
    easy: 'This configuration focuses on comprehensive coverage. Recommended for baseline assessment.',
    medium: 'Balanced assessment covering all topics with moderate challenge. Great for mid-level prep.',
    hard: 'Advanced full-syllabus test for thorough evaluation. Best for final revision phase.',
    exam_level: 'Simulates actual exam conditions with full syllabus scope. Ultimate readiness check.',
  },
  chapters: {
    easy: 'Focused chapter-wise test for building fundamentals. Great for initial topic review.',
    medium: 'Chapter-deep assessment with application-level questions. Good for targeted practice.',
    hard: 'Challenging chapter test with tricky questions. Ideal for mastering specific chapters.',
    exam_level: 'Exam-grade chapter test. Tests deep understanding with competitive-level questions.',
  },
  previous_year: {
    easy: 'Previous year easy-level questions to understand exam pattern and common topics.',
    medium: 'Standard previous year questions. Great for understanding difficulty trends.',
    hard: 'Toughest previous year questions curated. Tests your peak preparation level.',
    exam_level: 'Full previous year paper simulation. Experience the real exam feel.',
  },
  mock_test: {
    easy: 'Introductory mock test with simpler questions. Perfect for first-time mock takers.',
    medium: 'Standard mock test matching average exam difficulty. Ideal for regular practice.',
    hard: 'Rigorous mock test pushing boundaries. Designed for top-percentile aspirants.',
    exam_level: 'Full-length exam simulation with strict timing. Your final prep tool.',
  },
  ncert: {
    easy: 'Basic NCERT comprehension questions. Great for building foundational understanding.',
    medium: 'Application-level NCERT questions testing conceptual clarity. UPSC Prelims standard.',
    hard: 'Deep NCERT analytical questions requiring multi-chapter synthesis.',
    exam_level: 'UPSC Mains-level NCERT questions with advanced application and critical thinking.',
  },
};

const PYQ_YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

export default function TestsPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [testType, setTestType] = useState('full_syllabus');
  const [difficulty, setDifficulty] = useState('easy');
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [numQuestions, setNumQuestions] = useState(20);
  const [duration, setDuration] = useState(40);
  const [generating, setGenerating] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const sliderRef = useRef(null);
  const [testHistory, setTestHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Multi-subject selection
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Chapter selection (for chapters mode)
  const [selectedChapters, setSelectedChapters] = useState([]);

  // PYQ year range
  const [pyqFromYear, setPyqFromYear] = useState('2019');
  const [pyqToYear, setPyqToYear] = useState('2023');

  // Mock test config
  const [negativeMarking, setNegativeMarking] = useState(false);

  // PYQ toggle for full syllabus
  const [includePyq, setIncludePyq] = useState(false);

  // NCERT-specific state
  const [ncertSubject, setNcertSubject] = useState('');
  const [ncertClasses, setNcertClasses] = useState([]);
  const [ncertChapters, setNcertChapters] = useState([]);

  // Derive available NCERT chapters based on selected subject + classes
  const availableNcertChapters = [];
  if (ncertSubject && ncertClasses.length > 0) {
    ncertClasses.forEach(cls => {
      const chapters = NCERT_CHAPTERS[ncertSubject]?.[cls] || [];
      chapters.forEach(ch => {
        availableNcertChapters.push({ name: ch, classNum: cls });
      });
    });
  }

  const handleNcertClassToggle = (cls) => {
    setNcertClasses(prev => {
      const next = prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls];
      // Clear chapters that no longer belong to selected classes
      setNcertChapters(prevCh => prevCh.filter(ch => {
        return next.some(c => (NCERT_CHAPTERS[ncertSubject]?.[c] || []).includes(ch));
      }));
      return next;
    });
  };

  const handleNcertChapterToggle = (chName) => {
    setNcertChapters(prev =>
      prev.includes(chName) ? prev.filter(c => c !== chName) : [...prev, chName]
    );
  };

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      api.get('/practice/setup')
        .then(r => {
          const subjs = r.data.setup?.subjects || [];
          setSubjects(subjs);
        })
        .catch(() => {});

      // Fetch test history
      api.get('/custom-tests')
        .then(r => {
          if (r.data.success) setTestHistory(r.data.tests || []);
        })
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }
  }, [user]);

  // Select All toggle
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSubjects([]);
      setSelectAll(false);
    } else {
      setSelectedSubjects(subjects.map(s => s.id));
      setSelectAll(true);
    }
  };

  // Subject toggle
  const handleSubjectToggle = (id) => {
    setSelectedSubjects(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setSelectAll(next.length === subjects.length);
      return next;
    });
    // Clear chapters if subject deselected
    setSelectedChapters([]);
  };

  // Chapter toggle
  const handleChapterToggle = (chapName) => {
    setSelectedChapters(prev =>
      prev.includes(chapName) ? prev.filter(n => n !== chapName) : [...prev, chapName]
    );
  };

  // Derive available chapters from selected subjects
  const availableChapters = [];
  subjects.forEach(subj => {
    if (selectedSubjects.includes(subj.id)) {
      subj.topics?.forEach(topic => {
        topic.chapters?.forEach(chap => {
          availableChapters.push({ id: chap.id, name: chap.name, subjectName: subj.name });
        });
      });
    }
  });

  const handleGenerate = async () => {
    // NCERT-specific validation
    if (testType === 'ncert') {
      if (!ncertSubject) { toast.error('Please select a subject'); return; }
      if (ncertClasses.length === 0) { toast.error('Please select at least one class'); return; }
      if (ncertChapters.length === 0) { toast.error('Please select at least one chapter'); return; }
    } else {
      if (selectedSubjects.length === 0) { toast.error('Please select at least one subject'); return; }
      if (testType === 'chapters' && selectedChapters.length === 0) { toast.error('Please select at least one chapter'); return; }
    }
    if (numQuestions < 5 || numQuestions > 100) { toast.error('Questions must be between 5 and 100'); return; }
    if (duration <= 0) { toast.error('Duration must be greater than 0'); return; }

    const subjectNames = subjects
      .filter(s => selectedSubjects.includes(s.id))
      .map(s => s.name);

    try {
      setGenerating(true);

      const payload = testType === 'ncert' ? {
        test_type: 'ncert',
        subject: ncertSubject,
        chat_message: `NCERT ${ncertSubject} - Class ${ncertClasses.join(', ')}`,
        ncert_subject: ncertSubject,
        ncert_classes: ncertClasses.map(String),
        ncert_chapters: ncertChapters,
        difficulty: difficulty === 'exam_level' ? 'hard' : difficulty,
        number_of_questions: numQuestions,
        duration_minutes: duration,
        ai_suggestion: aiSuggestion.trim()
      } : {
        test_type: testType,
        subjects: subjectNames,
        subject: subjectNames[0] || '',
        chat_message: `${testType} test on ${subjectNames.join(', ')}`,
        chapters: selectedChapters,
        difficulty: difficulty === 'exam_level' ? 'hard' : difficulty,
        number_of_questions: numQuestions,
        duration_minutes: duration,
        is_pyq: testType === 'previous_year' || includePyq,
        pyq_years: testType === 'previous_year' ? `${pyqFromYear}-${pyqToYear}` : '',
        negative_marking: negativeMarking,
        ai_suggestion: aiSuggestion.trim()
      };

      const res = await api.post('/custom-tests/generate', payload);
      if (res.data.success) {
        toast.success('Test generated successfully!');
        router.push(`/custom-test/take/${res.data.testId}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to generate test. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleLogout = async () => { await logout(); router.push('/login'); };
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const insight = AI_INSIGHTS[testType]?.[difficulty] || '';
  const sliderPercent = ((numQuestions - 5) / 95) * 100;
  const durationPercent = ((duration - 15) / 225) * 100;

  // Summary helpers
  const selectedSubjectNames = subjects.filter(s => selectedSubjects.includes(s.id)).map(s => s.name);
  const subjectSummary = selectAll ? 'All Subjects' : selectedSubjectNames.length > 0 ? selectedSubjectNames.join(', ') : 'None Selected';

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]"><div className="w-10 h-10 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#FAFAFB] font-sans flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[220px] bg-white border-r border-gray-100 fixed top-0 left-0 h-full z-20">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-[#5956DF] flex items-center justify-center">
            <span className="text-white font-extrabold text-[13px]">P</span>
          </div>
          <span className="font-semibold text-[15px] text-[#1A1A1A]">PrepMind <strong className="text-[#5956DF]">AI</strong></span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                item.active
                  ? 'bg-[#5956DF]/10 text-[#5956DF]'
                  : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#1A1A1A]'
              }`}
            >
              <item.icon size={18} weight={item.active ? 'fill' : 'regular'} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-[#9CA3AF] hover:text-red-500 transition-colors">
            <SignOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-[220px]">
        {/* Top Nav */}
        <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-30">
          <div className="flex items-center justify-between px-6 lg:px-8 h-14">
            <div className="flex lg:hidden items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#5956DF]" />
              <span className="font-semibold text-[15px]">PrepMind <strong className="text-[#5956DF]">AI</strong></span>
            </div>
            <div className="hidden lg:flex items-center gap-6">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className={`text-[13px] font-semibold pb-0.5 transition-colors ${
                    item.active
                      ? 'text-[#5956DF] border-b-2 border-[#5956DF]'
                      : 'text-[#6B7280] hover:text-[#1A1A1A]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <Bell size={16} />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5956DF] to-[#7C3AED] flex items-center justify-center">
                <span className="text-white text-[12px] font-bold">{firstName[0]}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-6 lg:px-10 py-8 max-w-[960px] mx-auto">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-[28px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">AI Test Generator</h1>
              <p className="text-[14px] text-[#6B7280]">Configure your personalized assessment powered by PrepMind AI.</p>
            </div>
            <button
              onClick={() => router.push('/tests/history')}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-100 hover:border-[#5956DF] hover:text-[#5956DF] text-[#4B5563] text-[13px] font-bold rounded-xl transition-all"
            >
              <ChartBar size={16} weight="bold" />
              View History
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Left Panel */}
            <div className="space-y-6">
              {/* Select Test Type */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Select Test Type</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {TEST_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTestType(t.value)}
                      className={`px-4 py-3 rounded-xl text-[13px] font-bold transition-all border-2 ${
                        testType === t.value
                          ? 'border-[#5956DF] bg-[#5956DF]/5 text-[#5956DF] shadow-sm'
                          : 'border-gray-100 text-[#374151] hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Subject — Multi-select (NOT for NCERT) */}
              {testType !== 'ncert' && subjects.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[16px] font-bold text-[#1A1A1A]">Select Subject</h2>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={handleSelectAll}
                        className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                          selectAll
                            ? 'bg-[#5956DF] border-[#5956DF]'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {selectAll && <Check size={12} weight="bold" className="text-white" />}
                      </div>
                      <span className="text-[13px] font-medium text-[#6B7280]">Select All</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSubjectToggle(s.id)}
                        className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border-2 ${
                          selectedSubjects.includes(s.id)
                            ? 'border-[#5956DF] bg-[#5956DF]/5 text-[#5956DF]'
                            : 'border-gray-100 text-[#374151] hover:border-gray-200'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ NCERT-SPECIFIC UI ═══ */}
              {testType === 'ncert' && (
                <>
                  {/* NCERT Subject Selection */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Select Subject</h2>
                    <div className="flex flex-wrap gap-2">
                      {NCERT_SUBJECTS.map(s => (
                        <button
                          key={s}
                          onClick={() => { setNcertSubject(s); setNcertClasses([]); setNcertChapters([]); }}
                          className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border-2 ${
                            ncertSubject === s
                              ? 'border-[#5956DF] bg-[#5956DF]/5 text-[#5956DF]'
                              : 'border-gray-100 text-[#374151] hover:border-gray-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* NCERT Class Selection (Multi-select chips) */}
                  {ncertSubject && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                      <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Select Class <span className="text-[12px] text-[#9CA3AF] font-normal">(Multi-select)</span></h2>
                      <div className="flex flex-wrap gap-2">
                        {NCERT_CLASSES.filter(cls => NCERT_CHAPTERS[ncertSubject]?.[cls]).map(cls => (
                          <button
                            key={cls}
                            onClick={() => handleNcertClassToggle(cls)}
                            className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all border-2 ${
                              ncertClasses.includes(cls)
                                ? 'border-[#5956DF] bg-[#5956DF]/5 text-[#5956DF]'
                                : 'border-gray-100 text-[#374151] hover:border-gray-200'
                            }`}
                          >
                            {ncertClasses.includes(cls) && <Check size={12} weight="bold" className="inline mr-1" />}
                            Class {cls}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* NCERT Chapter Selection (Dynamic) */}
                  {ncertSubject && ncertClasses.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[16px] font-bold text-[#1A1A1A]">Select Chapters</h2>
                        <span className="text-[12px] font-bold text-[#5956DF]">{ncertChapters.length} selected</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                        {availableNcertChapters.map((ch, idx) => (
                          <div
                            key={`${ch.classNum}-${ch.name}-${idx}`}
                            onClick={() => handleNcertChapterToggle(ch.name)}
                            className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              ncertChapters.includes(ch.name)
                                ? 'border-[#5956DF] bg-[#5956DF]/5'
                                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              ncertChapters.includes(ch.name) ? 'bg-[#5956DF] border-[#5956DF]' : 'border-gray-300'
                            }`}>
                              {ncertChapters.includes(ch.name) && <Check weight="bold" size={10} className="text-white" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-[#1A1A1A] leading-tight">{ch.name}</p>
                              <p className="text-[11px] text-[#9CA3AF] mt-0.5">Class {ch.classNum}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Chapter Selection — Conditional (chapters mode) */}
              {testType === 'chapters' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Select Chapters</h2>
                  {availableChapters.length === 0 ? (
                    <p className="text-[13px] text-[#9CA3AF]">Select a subject first to see available chapters.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                      {availableChapters.map(chap => (
                        <div
                          key={`${chap.subjectName}-${chap.name}`}
                          onClick={() => handleChapterToggle(chap.name)}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedChapters.includes(chap.name)
                              ? 'border-[#5956DF] bg-[#5956DF]/5'
                              : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedChapters.includes(chap.name) ? 'bg-[#5956DF] border-[#5956DF]' : 'border-gray-300'
                          }`}>
                            {selectedChapters.includes(chap.name) && <Check weight="bold" size={10} className="text-white" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#1A1A1A] leading-tight truncate">{chap.name}</p>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{chap.subjectName}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PYQ Year Range — Conditional (previous_year mode) */}
              {testType === 'previous_year' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Year Range</h2>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[12px] font-medium text-[#6B7280] mb-1.5">From Year</label>
                      <select
                        value={pyqFromYear}
                        onChange={(e) => setPyqFromYear(e.target.value)}
                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-[13px] font-bold text-[#1A1A1A] focus:outline-none focus:border-[#5956DF] transition-colors"
                      >
                        {PYQ_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[12px] font-medium text-[#6B7280] mb-1.5">To Year</label>
                      <select
                        value={pyqToYear}
                        onChange={(e) => setPyqToYear(e.target.value)}
                        className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-[13px] font-bold text-[#1A1A1A] focus:outline-none focus:border-[#5956DF] transition-colors"
                      >
                        {PYQ_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Include PYQ Toggle — Conditional (full_syllabus mode) */}
              {testType === 'full_syllabus' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[16px] font-bold text-[#1A1A1A]">Include Previous Year Questions</h2>
                      <p className="text-[12px] text-[#9CA3AF] mt-0.5">Mix PYQ-style questions into the full syllabus test</p>
                    </div>
                    <button
                      onClick={() => setIncludePyq(!includePyq)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${includePyq ? 'bg-[#5956DF]' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${includePyq ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Negative Marking Toggle — Conditional (mock_test mode) */}
              {testType === 'mock_test' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[16px] font-bold text-[#1A1A1A]">Negative Marking</h2>
                      <p className="text-[12px] text-[#9CA3AF] mt-0.5">Deduct marks for incorrect answers (real exam simulation)</p>
                    </div>
                    <button
                      onClick={() => setNegativeMarking(!negativeMarking)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${negativeMarking ? 'bg-[#5956DF]' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${negativeMarking ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Difficulty Level */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-4">Difficulty Level</h2>
                <div className="flex flex-wrap gap-4 items-center">
                  {DIFFICULTY_OPTIONS.map(d => (
                    <label key={d.value} className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors ${
                        difficulty === d.value
                          ? 'border-[#5956DF]'
                          : 'border-gray-300 group-hover:border-gray-400'
                      }`}>
                        {difficulty === d.value && <div className="w-2.5 h-2.5 rounded-full bg-[#5956DF]" />}
                      </div>
                      <input
                        type="radio"
                        name="difficulty"
                        value={d.value}
                        checked={difficulty === d.value}
                        onChange={() => setDifficulty(d.value)}
                        className="sr-only"
                      />
                      <span className={`text-[13px] font-medium transition-colors ${
                        difficulty === d.value ? 'text-[#1A1A1A] font-bold' : 'text-[#6B7280]'
                      }`}>
                        {d.label}
                      </span>
                      {d.value === 'exam_level' && (
                        <span className="text-[#5956DF] text-[12px] font-bold">★</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[16px] font-bold text-[#1A1A1A]">Number of Questions</h2>
                  <span className="text-[24px] font-extrabold text-[#5956DF]">{numQuestions}</span>
                </div>
                <div className="relative px-1">
                  <input
                    ref={sliderRef}
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #5956DF 0%, #5956DF ${sliderPercent}%, #E5E7EB ${sliderPercent}%, #E5E7EB 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-[12px] font-medium text-[#9CA3AF]">5 Qs</span>
                    <span className="text-[12px] font-medium text-[#9CA3AF]">100 Qs</span>
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[16px] font-bold text-[#1A1A1A]">Duration (Minutes)</h2>
                  <span className="text-[24px] font-extrabold text-[#5956DF]">{duration}</span>
                </div>
                <div className="relative px-1">
                  <input
                    type="range"
                    min={15}
                    max={240}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #5956DF 0%, #5956DF ${durationPercent}%, #E5E7EB ${durationPercent}%, #E5E7EB 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-[12px] font-medium text-[#9CA3AF]">15 Mins</span>
                    <span className="text-[12px] font-medium text-[#9CA3AF]">240 Mins</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel — Generation Summary */}
            <div className="lg:sticky lg:top-[72px] self-start">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-6 h-6 rounded-full bg-[#5956DF] flex items-center justify-center">
                    <Info size={14} className="text-white" weight="fill" />
                  </div>
                  <h3 className="text-[16px] font-extrabold text-[#1A1A1A]">Generation Summary</h3>
                </div>

                <div className="space-y-3.5 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#6B7280] font-medium">Test Type</span>
                    <span className="text-[13px] font-bold text-[#1A1A1A]">{TEST_TYPES.find(t => t.value === testType)?.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#6B7280] font-medium">Difficulty</span>
                    <span className="text-[13px] font-bold text-[#1A1A1A] capitalize">{difficulty.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#6B7280] font-medium">Questions</span>
                    <span className="text-[13px] font-bold text-[#1A1A1A]">{numQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#6B7280] font-medium">Duration</span>
                    <span className="text-[13px] font-bold text-[#1A1A1A]">{duration} Mins</span>
                  </div>
                  {testType === 'ncert' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[#6B7280] font-medium">Subject</span>
                        <span className="text-[13px] font-bold text-[#1A1A1A]">{ncertSubject || 'None'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[#6B7280] font-medium">Classes</span>
                        <span className="text-[13px] font-bold text-[#1A1A1A]">{ncertClasses.length > 0 ? ncertClasses.map(c => `${c}`).join(', ') : 'None'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[#6B7280] font-medium">Chapters</span>
                        <span className="text-[13px] font-bold text-[#1A1A1A]">{ncertChapters.length} selected</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <span className="text-[13px] text-[#6B7280] font-medium">Subjects</span>
                        <span className="text-[13px] font-bold text-[#1A1A1A] text-right max-w-[160px] leading-tight">{subjectSummary}</span>
                      </div>
                      {testType === 'chapters' && selectedChapters.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-[#6B7280] font-medium">Chapters</span>
                          <span className="text-[13px] font-bold text-[#1A1A1A]">{selectedChapters.length} selected</span>
                        </div>
                      )}
                      {testType === 'previous_year' && (
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-[#6B7280] font-medium">PYQ Range</span>
                          <span className="text-[13px] font-bold text-[#1A1A1A]">{pyqFromYear} — {pyqToYear}</span>
                        </div>
                      )}
                      {testType === 'full_syllabus' && includePyq && (
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-[#6B7280] font-medium">Include PYQ</span>
                          <span className="text-[13px] font-bold text-[#10B981]">Yes</span>
                        </div>
                      )}
                      {testType === 'mock_test' && (
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-[#6B7280] font-medium">Negative Marking</span>
                          <span className={`text-[13px] font-bold ${negativeMarking ? 'text-[#EF4444]' : 'text-[#9CA3AF]'}`}>{negativeMarking ? 'On' : 'Off'}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* AI Insight Box */}
                <div className="bg-[#5956DF]/5 border border-[#5956DF]/10 rounded-xl p-4 mb-6">
                  <p className="text-[12px] leading-relaxed text-[#4B5563]">
                    <span className="font-bold text-[#5956DF]">AI Insight: </span>
                    {insight}
                  </p>
                </div>

                {/* AI Suggestion Input */}
                <div className="mb-6">
                  <label className="block text-[13px] font-bold text-[#1A1A1A] mb-2">Test Suggestion <span className="text-[#9CA3AF] font-normal">(Optional)</span></label>
                  <textarea
                    value={aiSuggestion}
                    onChange={(e) => setAiSuggestion(e.target.value)}
                    placeholder="Describe your test (e.g. NCERT revision, exam-level...)"
                    className="w-full bg-[#FAFAFB] border-2 border-gray-100 rounded-xl px-4 py-3 text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#5956DF] transition-colors resize-none placeholder:text-[#9CA3AF]"
                    rows={2}
                    maxLength={200}
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-[11px] text-[#9CA3AF]">{aiSuggestion.length}/200</span>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={generating || (testType === 'ncert' ? (!ncertSubject || ncertClasses.length === 0 || ncertChapters.length === 0) : selectedSubjects.length === 0)}
                  className="w-full py-4 bg-[#5956DF] hover:bg-[#4B49C8] text-white font-bold text-[14px] rounded-xl shadow-md shadow-[#5956DF]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <><Spinner size={18} className="animate-spin" /> {testType === 'ncert' ? `Generating NCERT ${ncertSubject} test...` : (aiSuggestion.trim() ? "Generating personalized test..." : "Generating...")}</>
                  ) : (
                    <><Lock size={16} weight="fill" /> {testType === 'ncert' ? 'Generate NCERT Test' : 'Generate AI Test'}</>
                  )}
                </button>

                <p className="text-center text-[11px] text-[#9CA3AF] font-medium mt-3 uppercase tracking-wider">
                  Powered by AI Optimization
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {/* ═══ TEST HISTORY SECTION ═══ */}
        <div id="test-history-section" className="px-6 lg:px-10 py-8">
          <div className="max-w-[960px] mx-auto">
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Notepad size={22} weight="fill" style={{ color: '#5956DF' }} />
              Test History
            </h2>

            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spinner size={24} className="animate-spin" style={{ color: '#5956DF' }} />
              </div>
            ) : testHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 14, fontWeight: 600, background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0' }}>
                No tests taken yet. Generate your first test above!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {testHistory.filter(t => t.attempts && t.attempts.length > 0).map(t => {
                  const attempt = t.attempts?.[0];
                  const acc = attempt?.accuracy || 0;
                  const score = attempt?.score || 0;
                  const total = attempt?.total_questions || t._count?.questions || 0;
                  const accColor = acc >= 80 ? '#10B981' : acc >= 50 ? '#F59E0B' : '#EF4444';

                  return (
                    <div key={t.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 20, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 800, color: '#5956DF', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>{t.subject?.name || 'General'}</p>
                          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', lineHeight: 1.3 }}>{t.topic_requested || 'Test'}</h3>
                          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{new Date(t.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 20, fontWeight: 900, color: accColor }}>{Math.round(acc)}%</p>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Accuracy</p>
                        </div>
                      </div>

                      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden', margin: '4px 0 16px' }}>
                        <div style={{ height: '100%', width: `${acc}%`, background: accColor, borderRadius: 6 }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 16 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} weight="bold" /> {score}/{total} Correct</span>
                        <span style={{ fontSize: 11, color: '#aaa', textTransform: 'capitalize' }}>{t.difficulty_level}</span>
                      </div>

                      <button
                        onClick={() => router.push(`/custom-test/analysis/${t.id}`)}
                        style={{ marginTop: 'auto', width: '100%', padding: '10px 0', background: '#fff', border: '2px solid #f0f0f0', borderRadius: 12, color: '#5956DF', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.target.style.borderColor = '#5956DF'; e.target.style.background = '#f5f4ff'; }}
                        onMouseLeave={e => { e.target.style.borderColor = '#f0f0f0'; e.target.style.background = '#fff'; }}
                      >
                        <Notepad size={16} weight="fill" /> Review Analysis
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <footer className="border-t border-gray-100 px-6 lg:px-10 py-4 mt-auto">
          <div className="max-w-[960px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[12px] text-[#9CA3AF]">&copy; 2026 PrepMind AI. All rights reserved.</p>
            <div className="flex gap-4">
              <span className="text-[12px] text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer">Guidelines</span>
              <span className="text-[12px] text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer">Help Center</span>
              <span className="text-[12px] text-[#6B7280] hover:text-[#1A1A1A] cursor-pointer">API Access</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Slider Thumb Styles */}
      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #5956DF;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(89, 86, 223, 0.4);
          cursor: pointer;
          transition: transform 0.15s;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type='range']::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #5956DF;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(89, 86, 223, 0.4);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
