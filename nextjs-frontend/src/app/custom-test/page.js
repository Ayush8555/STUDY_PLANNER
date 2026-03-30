'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import {
  Sparkle, Textbox, PaperPlaneRight, Lightning, Lightbulb, ChartBar
} from '@phosphor-icons/react';
import { getNavItems } from '@/lib/navItems';

const NAV_ITEMS = getNavItems('/custom-test');

// ─── Goal-Based Suggested Prompts ─────────────────────────
// These are REAL prompts that generate high-level competitive exam questions.
// Each prompt includes subject, topic depth, and exam-style instructions.
const EXAM_PROMPTS = {
  UPSC: {
    _general: [
      { text: "Indian Polity — Constitutional Amendments & Judicial Review with assertion-reason questions", subject: "General Studies" },
      { text: "Modern Indian History — Socio-religious reform movements and their inter-linkages with the freedom struggle", subject: "History" },
      { text: "Indian Economy — Monetary Policy, RBI functions, and inflation targeting framework with statement-based questions", subject: "General Studies" },
      { text: "Environment & Ecology — Biodiversity hotspots, conservation strategies, and international environmental agreements", subject: "General Studies" },
      { text: "Geography — Indian monsoon mechanism, jet streams, and their impact on agriculture with map-based reasoning", subject: "Geography" },
      { text: "Ethics & Integrity — Case studies on ethical dilemmas in public administration with analytical scenarios", subject: "General Studies" },
    ],
    'History': [
      { text: "Ancient India — Mauryan administration, Ashoka's Dhamma, and comparison with Gupta governance", subject: "History" },
      { text: "Medieval India — Delhi Sultanate administrative reforms, Iqta system, and Mughal revenue systems with chronological ordering", subject: "History" },
      { text: "Modern India — Gandhian movements, their chronological development, and critical evaluation of their outcomes", subject: "History" },
      { text: "World History — French Revolution causes, Industrial Revolution impact on colonialism, with multi-statement analysis", subject: "History" },
      { text: "Art & Culture — Indian classical dance forms, temple architecture styles, and UNESCO heritage sites with matching questions", subject: "History" },
    ],
    'Geography': [
      { text: "Physical Geography — Geomorphology, plate tectonics, types of weathering with UPSC Prelims-style statements", subject: "Geography" },
      { text: "Indian Geography — Major river systems, drainage patterns, interlinking of rivers debate with assertion-reason", subject: "Geography" },
      { text: "Climatology — Global wind patterns, El Niño/La Niña effects on Indian monsoon with analytical scenarios", subject: "Geography" },
      { text: "Human Geography — Urbanization patterns in India, migration trends, and demographic dividend analysis", subject: "Geography" },
      { text: "Economic Geography — Industrial regions of India, SEZs, and mineral distribution with map-based reasoning", subject: "Geography" },
    ],
    'General Studies': [
      { text: "Indian Polity — Fundamental Rights vs Directive Principles, landmark Supreme Court judgments with case analysis", subject: "General Studies" },
      { text: "Indian Economy — GST framework, fiscal federalism, and FRBM Act implications with multi-statement questions", subject: "General Studies" },
      { text: "Science & Technology — Space technology, ISRO missions, nuclear policy of India with application-based questions", subject: "General Studies" },
      { text: "International Relations — India's neighborhood policy, QUAD, BRICS, and multilateral diplomacy analysis", subject: "General Studies" },
      { text: "Internal Security — Cyber security challenges, Left Wing Extremism, and border management with scenario analysis", subject: "General Studies" },
    ],
    'Political Science': [
      { text: "Indian Constitution — Emergency provisions, amendment procedures, and federal structure with analytical comparison", subject: "Political Science" },
      { text: "Governance — E-governance initiatives, citizen charters, RTI Act impact assessment with statement-based analysis", subject: "Political Science" },
      { text: "Comparison between Indian and US constitutional frameworks — Judicial review, separation of powers", subject: "Political Science" },
    ],
  },
  JEE: {
    _general: [
      { text: "Physics — Rotational mechanics and angular momentum conservation with multi-concept numerical problems", subject: "Physics" },
      { text: "Chemistry — Organic reaction mechanisms — SN1, SN2, elimination reactions with stereochemistry analysis", subject: "Chemistry" },
      { text: "Mathematics — Definite integrals and their applications in finding areas with JEE Advanced level problems", subject: "Mathematics" },
      { text: "Physics — Electromagnetic induction, Faraday's law applications with circuit-based numericals", subject: "Physics" },
      { text: "Chemistry — Chemical equilibrium, Le Chatelier's principle with numerical and conceptual traps", subject: "Chemistry" },
      { text: "Mathematics — Probability and conditional probability with counter-intuitive problems", subject: "Mathematics" },
    ],
    'Physics': [
      { text: "Mechanics — Projectile motion on inclined planes, relative motion problems with multi-step calculations", subject: "Physics" },
      { text: "Thermodynamics — Carnot cycle, entropy changes, and irreversible processes with numerical problems", subject: "Physics" },
      { text: "Electrostatics — Gauss's law applications, superposition principle with conductor/insulator systems", subject: "Physics" },
      { text: "Optics — Wave optics, interference patterns, and resolving power with JEE Advanced style problems", subject: "Physics" },
      { text: "Modern Physics — Photoelectric effect, de Broglie wavelength, nuclear binding energy numericals", subject: "Physics" },
    ],
    'Chemistry': [
      { text: "Physical Chemistry — Electrochemistry, Nernst equation applications, galvanic cell problems with calculations", subject: "Chemistry" },
      { text: "Inorganic Chemistry — d-block elements, crystal field theory, color of coordination compounds analysis", subject: "Chemistry" },
      { text: "Organic Chemistry — Named reactions, reagent-based transformations, and retrosynthesis problems", subject: "Chemistry" },
      { text: "Chemical Kinetics — Rate law derivation, Arrhenius equation, and transition state theory problems", subject: "Chemistry" },
    ],
    'Mathematics': [
      { text: "Calculus — Differential equations and their applications with JEE Advanced multi-step problems", subject: "Mathematics" },
      { text: "Coordinate Geometry — Conic sections (ellipse, hyperbola) with locus and tangent problems", subject: "Mathematics" },
      { text: "Algebra — Complex numbers, roots of unity, and geometric interpretations with proof-based questions", subject: "Mathematics" },
      { text: "Vectors & 3D Geometry — Plane intersections, shortest distance problems with parametric equations", subject: "Mathematics" },
    ],
  },
  NEET: {
    _general: [
      { text: "Biology — Human physiology: cardiac cycle, blood pressure regulation with clinical application questions", subject: "Biology" },
      { text: "Physics — Ray optics, human eye, and optical instruments with NEET-style conceptual problems", subject: "Physics" },
      { text: "Chemistry — Biomolecules — structure of proteins, enzymes, and DNA replication with exception-based questions", subject: "Chemistry" },
      { text: "Biology — Genetics — Mendelian inheritance, linkage, and crossing over with pedigree analysis problems", subject: "Biology" },
      { text: "Biology — Ecology — Ecosystem services, ecological succession, and biodiversity with analytical questions", subject: "Biology" },
      { text: "Chemistry — Coordination compounds and their biological importance with NEET-level conceptual questions", subject: "Chemistry" },
    ],
    'Biology': [
      { text: "Cell Biology — Cell cycle regulation, apoptosis, and cancer mechanisms with diagram-based reasoning", subject: "Biology" },
      { text: "Plant Physiology — Photosynthesis C3 vs C4 vs CAM pathways with comparative analytical questions", subject: "Biology" },
      { text: "Human Reproduction — Gametogenesis, hormonal regulation, and ART techniques with clinical scenarios", subject: "Biology" },
      { text: "Evolution — Hardy-Weinberg principle, speciation mechanisms, and evidences with analytical problems", subject: "Biology" },
      { text: "Molecular Biology — DNA replication, transcription, translation, and genetic code with exception-based questions", subject: "Biology" },
    ],
    'Physics': [
      { text: "Mechanics — Newton's laws applications in biological systems with numerical problems for NEET", subject: "Physics" },
      { text: "Electrostatics and current electricity — Kirchhoff's laws, Wheatstone bridge with NEET-style numericals", subject: "Physics" },
      { text: "Nuclear Physics — Radioactivity, half-life calculations, and medical applications of radiation", subject: "Physics" },
    ],
    'Chemistry': [
      { text: "Organic Chemistry — Aldehydes, ketones, and carboxylic acids with reaction mechanism questions", subject: "Chemistry" },
      { text: "Physical Chemistry — Solutions, colligative properties, Raoult's law with NEET numerical problems", subject: "Chemistry" },
      { text: "Inorganic Chemistry — p-block elements and their biological significance with exception-based questions", subject: "Chemistry" },
    ],
  },
  SSC: {
    _general: [
      { text: "General Awareness — Indian Constitution articles, schedules, and amendments with tricky factual questions", subject: "General Studies" },
      { text: "Quantitative Aptitude — Profit & Loss, Compound Interest with shortcut-based but trap-laden problems", subject: "Mathematics" },
      { text: "English Language — Error spotting, sentence improvement with advanced grammar analysis", subject: "English" },
      { text: "Reasoning — Blood relations, coding-decoding, and syllogisms with complex patterns", subject: "General Studies" },
      { text: "General Science — Physics and Chemistry concepts in everyday life with application-based questions", subject: "General Studies" },
    ],
  },
  GATE: {
    _general: [
      { text: "Data Structures — Binary trees, graph algorithms, time complexity analysis with code-tracing problems", subject: "Computer Science" },
      { text: "Digital Electronics — Combinational circuits, K-map minimization with multi-step design problems", subject: "Electronics" },
      { text: "Engineering Mathematics — Linear algebra, eigenvalues, and probability with GATE-level numericals", subject: "Mathematics" },
      { text: "Computer Networks — TCP/IP protocol suite, subnetting, and routing algorithms with numerical problems", subject: "Computer Science" },
      { text: "Operating Systems — Process scheduling, deadlock detection, and memory management with analytical questions", subject: "Computer Science" },
    ],
  },
};

// Fallback general prompts when no specific exam is detected
const GENERIC_PROMPTS = [
  { text: "Generate analytical questions with assertion-reason format on this topic", subject: null },
  { text: "Create multi-concept application questions that test deep understanding, not memorization", subject: null },
  { text: "Design statement-based questions where students evaluate multiple claims about the topic", subject: null },
  { text: "Build scenario-based questions with plausible distractors representing common misconceptions", subject: null },
  { text: "Create comparison and matching-pair questions requiring analytical thinking", subject: null },
];

function resolveExamKey(goal, examName) {
  const combined = `${goal || ''} ${examName || ''}`.toUpperCase();
  if (combined.includes('UPSC') || combined.includes('IAS') || combined.includes('CIVIL')) return 'UPSC';
  if (combined.includes('JEE') || combined.includes('IIT')) return 'JEE';
  if (combined.includes('NEET')) return 'NEET';
  if (combined.includes('SSC') || combined.includes('CGL') || combined.includes('CHSL')) return 'SSC';
  if (combined.includes('GATE')) return 'GATE';
  return null;
}

export default function CustomTestPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [setupData, setSetupData] = useState({ subjects: [], examName: 'Competitive Exam' });
  const [loadingSetup, setLoadingSetup] = useState(true);

  // Form State
  const [chatMessage, setChatMessage] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(20);
  const [duration, setDuration] = useState(30);

  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      api.get('/practice/setup')
        .then(r => {
          setSetupData(r.data.setup);
          if (r.data.setup.subjects.length > 0) {
            setSelectedSubject(r.data.setup.subjects[0].name);
          }
        })
        .catch(err => console.error('Failed to load setup:', err))
        .finally(() => setLoadingSetup(false));
    }
  }, [user]);

  // ─── Resolve suggested prompts based on user's goal + selected subject ───
  const examKey = useMemo(() => resolveExamKey(user?.goal, setupData.examName), [user?.goal, setupData.examName]);

  const suggestedPrompts = useMemo(() => {
    if (!examKey || !EXAM_PROMPTS[examKey]) return GENERIC_PROMPTS;
    
    const examPrompts = EXAM_PROMPTS[examKey];
    
    // If a subject is selected, try to find subject-specific prompts
    if (selectedSubject) {
      // Try exact match first, then partial match
      const subjectKey = Object.keys(examPrompts).find(k => 
        k !== '_general' && selectedSubject.toLowerCase().includes(k.toLowerCase())
      );
      
      if (subjectKey && examPrompts[subjectKey]) {
        return examPrompts[subjectKey];
      }
    }
    
    // Fallback to general prompts for that exam
    return examPrompts._general || GENERIC_PROMPTS;
  }, [examKey, selectedSubject]);

  const handlePromptClick = (prompt) => {
    setChatMessage(prompt.text);
    // If prompt has a specific subject and it exists in our subjects list, auto-select it
    if (prompt.subject) {
      const matchingSubject = setupData.subjects.find(s => 
        s.name.toLowerCase().includes(prompt.subject.toLowerCase()) ||
        prompt.subject.toLowerCase().includes(s.name.toLowerCase())
      );
      if (matchingSubject) {
        setSelectedSubject(matchingSubject.name);
      }
    }
  };

  const handleGenerate = async () => {
    if (!selectedSubject || !chatMessage.trim()) {
      toast.error('Please select a subject and ask what you want to practice');
      return;
    }

    try {
      setGenerating(true);

      const res = await api.post('/custom-tests/generate', {
        subject: selectedSubject,
        chat_message: chatMessage,
        difficulty,
        number_of_questions: numQuestions,
        duration,
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Custom Test Generated!');
        router.push(`/custom-test/take/${res.data.testId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate test');
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading || loadingSetup) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  const examLabel = examKey || 'Competitive Exam';

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0B0F19] hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkle weight="fill" className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-wide">PrepMind</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                item.active
                  ? 'bg-violet-500/10 text-violet-400 font-medium'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <item.icon size={20} weight={item.active ? "fill" : "regular"} />
              {item.label}
            </a>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10 flex flex-col items-center relative">
            <h1 className="text-4xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
              Create Custom Test
            </h1>
            <p className="text-gray-400 text-lg">
              Type your custom AI instructions and generate a highly personalized test.
            </p>
            <button 
              onClick={() => router.push('/custom-test/history')}
              className="mt-6 sm:absolute sm:top-0 sm:right-0 sm:mt-0 px-5 py-2 rounded-full border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <ChartBar size={20} /> View History
            </button>
          </div>

          <div className="bg-[#121826] border border-white/5 rounded-2xl p-6 lg:p-8 space-y-8 shadow-2xl">
            
            {/* Subject Selector */}
            <div className="space-y-2">
              <label className="text-lg font-semibold text-gray-200">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-[#0B0F1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-all text-lg"
              >
                <option value="" disabled>Select a Subject</option>
                {setupData.subjects.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Chat Box Input */}
            {selectedSubject && (
              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="flex items-center gap-2 text-xl font-semibold text-violet-400">
                  <Textbox size={28} />
                  Tell me what you want to practice...
                </label>
                <div className="relative">
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder={`Example: "${suggestedPrompts[0]?.text || 'Describe the topic and type of questions you want'}"`}
                    rows={4}
                    className="w-full bg-[#0B0F1A] border-2 border-violet-500/30 rounded-2xl px-5 py-4 pr-16 text-white text-lg focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-gray-500 resize-none h-32 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                  />
                  <div className="absolute bottom-4 right-4 text-violet-500 hover:text-violet-400 cursor-pointer pointer-events-none transition-colors">
                    <PaperPlaneRight size={24} weight="fill" />
                  </div>
                </div>

                {/* ═══ SUGGESTED PROMPTS SECTION ═══ */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <Lightbulb size={14} weight="fill" className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-amber-400/90">
                      {examKey ? `${examLabel} Suggested Prompts` : 'Suggested Prompts'}
                    </span>
                    {examKey && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80 font-medium border border-amber-500/20">
                        {selectedSubject ? `${selectedSubject}` : 'General'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePromptClick(prompt)}
                        className={`group relative text-left px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 border max-w-full ${
                          chatMessage === prompt.text
                            ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                            : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-300'
                        }`}
                        title={prompt.text}
                      >
                        <span className="flex items-start gap-2">
                          <Lightning size={14} weight="fill" className={`flex-shrink-0 mt-0.5 transition-colors ${
                            chatMessage === prompt.text ? 'text-violet-400' : 'text-gray-600 group-hover:text-violet-400'
                          }`} />
                          <span className="line-clamp-2 leading-snug">{prompt.text}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-600 mt-2 ml-1">
                    💡 Click any suggestion to auto-fill, or type your own custom prompt above
                  </p>
                </div>
              </div>
            )}

            {selectedSubject && (
              <div className="pt-4 border-t border-white/5 space-y-8">
                {/* Number of Questions Slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-md font-medium text-gray-400">Number of Questions</label>
                    <span className="text-xl font-bold text-white bg-white/10 px-3 py-1 rounded-lg">{numQuestions}</span>
                  </div>
                  <input 
                     type="range" 
                     min="5" 
                     max="100" 
                     step="1"
                     value={numQuestions} 
                     onChange={(e) => setNumQuestions(Number(e.target.value))}
                     className="w-full accent-violet-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Difficulty Selector */}
                <div className="space-y-3">
                  <label className="text-md font-medium text-gray-400">Difficulty Level</label>
                  <div className="flex gap-4">
                    {['easy', 'medium', 'hard'].map(diff => (
                      <button
                        key={diff}
                        onClick={() => setDifficulty(diff)}
                        className={`flex-1 py-3 rounded-xl border capitalize font-bold transition-all text-lg ${
                          difficulty === diff 
                          ? 'bg-violet-500/20 border-violet-500 text-violet-300' 
                          : 'bg-[#0B0F1A] border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-md font-medium text-gray-400">Time Limit</label>
                    <span className="text-xl font-bold text-white bg-white/10 px-3 py-1 rounded-lg">{duration} mins</span>
                  </div>
                  <input 
                     type="range" 
                     min="5" 
                     max="180" 
                     step="5"
                     value={duration} 
                     onChange={(e) => setDuration(Number(e.target.value))}
                     className="w-full accent-violet-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="pt-6 border-t border-white/5 space-y-4">
              {generating && (
                <div className="flex items-center gap-3 text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                  <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                  <span className="font-medium animate-pulse">Creating custom test: {selectedSubject} - {chatMessage.substring(0, 30)}...</span>
                </div>
              )}
              <button 
                onClick={handleGenerate}
                disabled={generating || !selectedSubject || !chatMessage.trim()}
                className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Sparkle weight="fill" size={24} className="animate-pulse" />
                    Generating Test...
                  </>
                ) : (
                  <>
                    <Sparkle weight="fill" size={24} />
                    Generate Test
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

