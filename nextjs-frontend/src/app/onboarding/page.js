'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PlayCircle, ArrowLeft, ArrowRight, Check, GraduationCap, UserCircle, Clock, Books, CalendarDots, Info } from '@phosphor-icons/react';
import api from '@/services/api';
import toast from 'react-hot-toast';

const EXAMS = [
  { id: 'upsc', name: 'UPSC', desc: 'Civil Services Exam' },
  { id: 'jee', name: 'JEE (Main & Advanced)', desc: 'Engineering Entrance' },
  { id: 'neet', name: 'NEET', desc: 'Medical Entrance' },
  { id: 'ssc_cgl', name: 'SSC CGL', desc: 'Staff Selection Commission' },
  { id: 'gate', name: 'GATE', desc: 'Graduate Aptitude Test' },
];

const STUDENT_TYPES = [
  { id: 'school', label: 'School Student' },
  { id: 'college', label: 'College Student' },
  { id: 'dropper', label: 'Dropper' },
  { id: 'working', label: 'Working Pro' },
];

const CLASS_OPTIONS = [
  'Class 9', 'Class 10', 'Class 11', 'Class 12',
  '1st Year', '2nd Year', '3rd Year', '4th Year',
  'Graduate', 'Post Graduate',
];

const SUBJECTS_BY_EXAM = {
  upsc: [
    { name: 'History', desc: 'Ancient, Medieval, Modern' },
    { name: 'Geography', desc: 'Physical, Human, Indian' },
    { name: 'Polity', desc: 'Constitution, Governance' },
    { name: 'Economy', desc: 'Micro, Macro, Indian Economy' },
    { name: 'Science & Technology', desc: 'Physics, Chemistry, Biology' },
    { name: 'Environment', desc: 'Ecology, Biodiversity, Climate' },
    { name: 'Current Affairs', desc: 'National, International' },
    { name: 'Ethics', desc: 'Integrity, Aptitude, Case Studies' },
  ],
  jee: [
    { name: 'Physics', desc: 'Mechanics, Electro, Optics' },
    { name: 'Chemistry', desc: 'Organic, Inorganic, Physical' },
    { name: 'Mathematics', desc: 'Algebra, Calculus, Geometry' },
  ],
  neet: [
    { name: 'Physics', desc: 'Mechanics, Waves, Thermodynamics' },
    { name: 'Chemistry', desc: 'Organic, Inorganic, Physical' },
    { name: 'Biology (Botany)', desc: 'Plant Physiology, Morphology' },
    { name: 'Biology (Zoology)', desc: 'Human Physiology, Genetics' },
  ],
  ssc_cgl: [
    { name: 'Quantitative Aptitude', desc: 'Logic, Math, Calculation' },
    { name: 'Verbal Ability', desc: 'Grammar, RC, Vocabulary' },
    { name: 'General Awareness', desc: 'Current Affairs, Static GK' },
    { name: 'Data Interpretation', desc: 'Graphs, Tables, Logic' },
  ],
  gate: [
    { name: 'Engineering Mathematics', desc: 'Linear Algebra, Calculus, Probability' },
    { name: 'General Aptitude', desc: 'Verbal, Numerical, Spatial' },
    { name: 'Core Subject', desc: 'Domain-specific topics' },
  ],
};

const STEP_ICONS = [GraduationCap, UserCircle, Clock, Books, CalendarDots];
const STEP_LABELS = ['Exam', 'About You', 'Hours', 'Subjects', 'Date'];

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState({
    exam: '',
    studentType: '',
    classLevel: 'Class 10',
    hoursPerDay: 6,
    subjects: [],
    examDate: '',
  });

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]">
        <div className="w-10 h-10 border-4 border-[#5956DF]/20 border-t-[#5956DF] rounded-full animate-spin" />
      </div>
    );
  }

  const availableSubjects = SUBJECTS_BY_EXAM[data.exam] || [];
  const progress = (step / 5) * 100;

  const canContinue = () => {
    switch (step) {
      case 1: return !!data.exam;
      case 2: return !!data.studentType;
      case 3: return data.hoursPerDay >= 1;
      case 4: return data.subjects.length > 0;
      case 5: return true; // date is optional
      default: return false;
    }
  };

  const toggleSubject = (subj) => {
    setData((d) => ({
      ...d,
      subjects: d.subjects.includes(subj) ? d.subjects.filter((s) => s !== subj) : [...d.subjects, subj],
    }));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await api.post('/profile', {
        target_exam: data.exam,
        student_type: data.studentType,
        class_level: data.classLevel,
        subjects: data.subjects,
        hours_per_day: data.hoursPerDay,
        exam_date: data.examDate || null,
      });
      toast.success('Profile set up! Let\'s go 🚀');
      router.push('/dashboard');
    } catch {
      toast.error('Failed to save. Redirecting...');
      router.push('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step === 5) handleFinish();
    else setStep((s) => s + 1);
  };

  const stepTitles = [
    { title: 'Which exam are you targeting?', subtitle: 'Select your primary focus area so we can tailor the AI for you.' },
    { title: 'Tell us about yourself', subtitle: 'This helps us adjust the difficulty and depth of explanations.' },
    { title: 'Your Daily Commitment', subtitle: 'How many hours can you realistically dedicate to PrepMind AI?' },
    { title: 'Subject Mastery', subtitle: 'Select subjects you want to focus on first.' },
    { title: 'When is the big day?', subtitle: 'Enter your exam date or estimated target month.' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFB] font-sans flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5956DF] flex items-center justify-center shadow-md shadow-[#5956DF]/20">
              <PlayCircle weight="fill" className="text-white text-xl" />
            </div>
            <span className="font-semibold tracking-tight text-[#1A1A1A] text-lg">
              PrepMind <strong className="font-extrabold text-[#5956DF]">AI</strong>
            </span>
          </div>
          <span className="text-sm font-medium text-[#9CA3AF]">Onboarding Wizard</span>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Progress */}
            <div className="px-8 pt-8 pb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#5956DF] uppercase tracking-wider">Step {step} of 5</span>
                <span className="text-xs font-medium text-[#9CA3AF]">{Math.round(progress)}% Complete</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#5956DF] to-[#7C79F2] rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Content */}
            <div className="px-8 py-8 min-h-[360px]">
              <h2 className="text-[26px] font-extrabold text-[#1A1A1A] mb-2 tracking-tight">{stepTitles[step - 1].title}</h2>
              <p className="text-[15px] text-[#6B7280] mb-8">{stepTitles[step - 1].subtitle}</p>

              {/* Step 1: Exam */}
              {step === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXAMS.map((exam) => (
                    <button key={exam.id} onClick={() => setData({ ...data, exam: exam.id, subjects: [] })}
                      className={`text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 ${data.exam === exam.id ? 'border-[#5956DF] bg-[#5956DF]/5 shadow-md shadow-[#5956DF]/10' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <p className="text-[15px] font-bold text-[#1A1A1A]">{exam.name}</p>
                      <p className="text-[13px] text-[#6B7280] mt-0.5">{exam.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: About You */}
              {step === 2 && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {STUDENT_TYPES.map((type) => (
                      <button key={type.id} onClick={() => setData({ ...data, studentType: type.id })}
                        className={`text-center px-5 py-4 rounded-xl border-2 transition-all duration-200 ${data.studentType === type.id ? 'border-[#5956DF] bg-[#5956DF]/5 shadow-md shadow-[#5956DF]/10' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                        <p className="text-[15px] font-bold text-[#1A1A1A]">{type.label}</p>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[14px] font-bold text-[#374151] mb-2">Select your Class/Grade</label>
                    <select value={data.classLevel} onChange={(e) => setData({ ...data, classLevel: e.target.value })}
                      className="w-full bg-[#FAFAFB] border-2 border-gray-200 rounded-xl py-3.5 px-4 text-[15px] text-[#1A1A1A] focus:outline-none focus:border-[#5956DF] focus:ring-2 focus:ring-[#5956DF]/20 hover:border-gray-300 transition-all appearance-none cursor-pointer">
                      {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 3: Daily Commitment — Slider */}
              {step === 3 && (
                <div className="flex flex-col items-center pt-8">
                  <div className="w-full max-w-md">
                    {/* Slider */}
                    <div className="relative mb-2">
                      <input
                        type="range"
                        min="1"
                        max="12"
                        step="1"
                        value={data.hoursPerDay}
                        onChange={(e) => setData({ ...data, hoursPerDay: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#5956DF]"
                        style={{
                          background: `linear-gradient(to right, #5956DF ${((data.hoursPerDay - 1) / 11) * 100}%, #E5E7EB ${((data.hoursPerDay - 1) / 11) * 100}%)`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[13px] text-[#9CA3AF] font-medium mb-8">
                      <span>1 Hour</span>
                      <span>12+ Hours</span>
                    </div>

                    {/* Big number display */}
                    <div className="text-center">
                      <span className="text-6xl font-extrabold text-[#5956DF] tracking-tight">{data.hoursPerDay}</span>
                      <p className="text-sm font-bold text-[#6B7280] uppercase tracking-widest mt-2">Hours / Day</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Subject Mastery — Checkbox cards */}
              {step === 4 && (
                <div className="space-y-3">
                  {availableSubjects.map((subj) => {
                    const selected = data.subjects.includes(subj.name);
                    return (
                      <button
                        key={subj.name}
                        onClick={() => toggleSubject(subj.name)}
                        className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${selected ? 'border-[#5956DF] bg-[#5956DF]/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                      >
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'bg-[#5956DF] border-[#5956DF]' : 'border-gray-300'}`}>
                          {selected && <Check size={12} weight="bold" className="text-white" />}
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-[#1A1A1A]">{subj.name}</p>
                          <p className="text-[13px] text-[#9CA3AF] mt-0.5">{subj.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                  {availableSubjects.length === 0 && (
                    <p className="text-sm text-[#9CA3AF] italic text-center py-8">Go back to Step 1 and select an exam first.</p>
                  )}
                </div>
              )}

              {/* Step 5: Exam Date */}
              {step === 5 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[14px] font-bold text-[#374151] mb-3">Expected Exam Date</label>
                    <input
                      type="date"
                      value={data.examDate}
                      onChange={(e) => setData({ ...data, examDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-[#FAFAFB] border-2 border-gray-200 rounded-xl py-3.5 px-4 text-[15px] text-[#1A1A1A] focus:outline-none focus:border-[#5956DF] focus:ring-2 focus:ring-[#5956DF]/20 hover:border-gray-300 transition-all"
                    />
                  </div>

                  {/* Strategic Advantage Box */}
                  <div className="bg-[#EEF0FF] border border-[#D4D7FF] rounded-xl p-5 flex gap-3.5">
                    <div className="shrink-0 mt-0.5">
                      <Info size={20} weight="fill" className="text-[#5956DF]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#5956DF] mb-1">Strategic Advantage</p>
                      <p className="text-[13.5px] text-[#4B5563] leading-relaxed">
                        PrepMind AI will use this date to create a backward-planned schedule, ensuring you finish the syllabus 30 days before the exam for revision.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-8 py-6 border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => step > 1 ? setStep(step - 1) : router.push('/')}
                className="flex items-center gap-2 text-[14px] font-bold text-[#374151] hover:text-[#1A1A1A] transition-colors px-4 py-2.5 rounded-lg hover:bg-gray-50">
                <ArrowLeft size={16} weight="bold" /> Back
              </button>
              <button onClick={handleNext} disabled={!canContinue() || saving}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-[14px] font-bold text-white bg-[#5956DF] hover:bg-[#4B49C8] shadow-md shadow-[#5956DF]/20 transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                ) : step === 5 ? (
                  'Finish Profile'
                ) : (
                  <>Continue <ArrowRight size={16} weight="bold" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-[13px] text-[#9CA3AF]">&copy; 2026 PrepMind AI. All rights reserved.</footer>
    </div>
  );
}
